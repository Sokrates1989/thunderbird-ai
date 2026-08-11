/** Local, bounded sender-history signals used to calibrate spam scoring. */
const SpamPrecheckService = {
    cache: new Map(),

    /** Attach one privacy-bounded precheck to every message with limited concurrency. */
    async enrichMessages(messages) {
        const rows = Array.isArray(messages) ? messages : [];
        const addresses = [...new Set(rows
            .map(message => MessageService.extractEmailAddress(message?.author))
            .filter(Boolean))];
        const histories = new Map();
        let nextIndex = 0;
        const worker = async () => {
            while (nextIndex < addresses.length) {
                const address = addresses[nextIndex];
                nextIndex += 1;
                histories.set(address, await this.getSenderHistory(address));
            }
        };
        const workerCount = Math.min(CONFIG.SPAM_PRECHECK.CONCURRENCY, addresses.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));

        return rows.map(message => {
            const senderAddress = MessageService.extractEmailAddress(message?.author);
            const history = histories.get(senderAddress) || this.unavailableHistory();
            const signals = [...new Set(message?.spamSignals || [])];
            const spamPrecheck = {
                senderHistoryAvailable: history.available,
                totalFromSender: history.total,
                totalFromSenderIsMinimum: history.truncated,
                recent30DaysFromSender: history.recent30,
                recent90DaysFromSender: history.recent90,
                previouslyMarkedJunkFromSender: history.junk,
                newsletterSignals: signals,
                suggestedSpamMinimum: this.suggestedSpamMinimum(history, signals)
            };
            return { ...message, spamPrecheck };
        });
    },

    async getSenderHistory(senderAddress) {
        const cached = this.cache.get(senderAddress);
        if (cached && Date.now() - cached.cachedAt < CONFIG.SPAM_PRECHECK.CACHE_TTL_MS) {
            return cached.value;
        }

        let listId = null;
        try {
            let page = await browser.messages.query({
                author: senderAddress,
                messagesPerPage: CONFIG.SPAM_PRECHECK.HISTORY_PAGE_SIZE,
                autoPaginationTimeout: 100
            });
            const now = Date.now();
            const cutoffs = Object.fromEntries(CONFIG.SPAM_PRECHECK.RECENT_DAYS.map(days => [
                days,
                now - (days * 24 * 60 * 60 * 1000)
            ]));
            const seen = new Set();
            let recent30 = 0;
            let recent90 = 0;
            let junk = 0;
            let truncated = false;

            while (page) {
                listId = page.id || null;
                for (const message of page.messages || []) {
                    const identity = message.id ?? `${message.headerMessageId || ''}:${message.date || ''}`;
                    if (seen.has(identity)) {
                        continue;
                    }
                    seen.add(identity);
                    const timestamp = new Date(message.date || '').getTime();
                    if (Number.isFinite(timestamp) && timestamp >= cutoffs[30]) {
                        recent30 += 1;
                    }
                    if (Number.isFinite(timestamp) && timestamp >= cutoffs[90]) {
                        recent90 += 1;
                    }
                    if (message.junk === true || Number(message.junkScore) >= 50) {
                        junk += 1;
                    }
                    if (seen.size >= CONFIG.SPAM_PRECHECK.HISTORY_LIMIT) {
                        truncated = Boolean(page.id);
                        break;
                    }
                }
                if (seen.size >= CONFIG.SPAM_PRECHECK.HISTORY_LIMIT || !page.id) {
                    break;
                }
                page = await browser.messages.continueList(page.id);
            }
            if (truncated && listId && browser.messages.abortList) {
                await browser.messages.abortList(listId);
            }
            const value = {
                available: true,
                total: seen.size,
                recent30,
                recent90,
                junk,
                truncated
            };
            this.remember(senderAddress, value);
            return value;
        } catch (error) {
            console.warn('Could not calculate local sender history for spam scoring:', error);
            if (listId && browser.messages.abortList) {
                try {
                    await browser.messages.abortList(listId);
                } catch (_abortError) {
                    // The query may already have closed itself.
                }
            }
            return this.unavailableHistory();
        }
    },

    /** Produce a conservative floor: frequency helps, but structural bulk evidence dominates. */
    suggestedSpamMinimum(history, signals) {
        const signalSet = new Set(signals);
        let minimum = 0;
        if (history.available) {
            if (history.total >= 100) minimum += 15;
            else if (history.total >= 50) minimum += 11;
            else if (history.total >= 25) minimum += 7;
            else if (history.total >= 10) minimum += 3;

            if (history.recent30 >= 20) minimum += 15;
            else if (history.recent30 >= 10) minimum += 10;
            else if (history.recent30 >= 5) minimum += 5;
            if (history.junk > 0) minimum += Math.min(15, history.junk * 3);
        }
        if (signalSet.has('list-unsubscribe-header')) minimum += 18;
        if (signalSet.has('list-id-header')) minimum += 12;
        if (signalSet.has('bulk-precedence-header')) minimum += 12;
        if (signalSet.has('list-post-header')) minimum += 6;
        if (signalSet.has('auto-submitted-header')) minimum += 4;
        if (signalSet.has('automated-sender-address')) minimum += 5;
        if (signalSet.has('unsubscribe-language')) minimum += 12;
        if (signalSet.has('campaign-tracking-link')) minimum += 8;
        return Math.min(80, minimum);
    },

    unavailableHistory() {
        return { available: false, total: 0, recent30: 0, recent90: 0, junk: 0, truncated: false };
    },

    remember(senderAddress, value) {
        if (this.cache.size >= CONFIG.SPAM_PRECHECK.CACHE_LIMIT) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(senderAddress, { cachedAt: Date.now(), value });
    },

    clearCache() {
        this.cache.clear();
    }
};

if (typeof window !== 'undefined') {
    window.SpamPrecheckService = SpamPrecheckService;
}
if (typeof globalThis !== 'undefined') {
    globalThis.SpamPrecheckService = SpamPrecheckService;
}
