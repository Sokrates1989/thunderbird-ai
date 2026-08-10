/**
 * Connects the global dashboard to shared background AI workflows and stores
 * only bounded score metadata locally. Email bodies remain background-owned.
 */
const DashboardAIService = {
    MAX_STORED_RESULTS: 1000,

    /** Restore and validate locally persisted score metadata. */
    async loadResults() {
        const stored = await browser.storage.local.get(CONFIG.STORAGE_KEYS.DASHBOARD_AI_RESULTS);
        return this.normalizeResults(stored[CONFIG.STORAGE_KEYS.DASHBOARD_AI_RESULTS]);
    },

    /** Merge successful scores and retain the newest bounded result set. */
    async saveResults(existingResults, newResults, model) {
        const analyzedAt = new Date().toISOString();
        const merged = { ...this.normalizeResults(existingResults) };
        for (const result of newResults) {
            const normalized = this.normalizeResult({ ...result, model, analyzedAt });
            if (normalized && result.storageKey) {
                merged[result.storageKey] = normalized;
            }
        }
        const bounded = Object.fromEntries(
            Object.entries(merged)
                .sort((left, right) => right[1].analyzedAt.localeCompare(left[1].analyzedAt))
                .slice(0, this.MAX_STORED_RESULTS)
        );
        await browser.storage.local.set({
            [CONFIG.STORAGE_KEYS.DASHBOARD_AI_RESULTS]: bounded
        });
        return bounded;
    },

    /** Attach matching stored scores to Thunderbird header objects. */
    attachResults(accounts, results) {
        for (const account of accounts) {
            for (const message of account.messages || []) {
                message.aiAnalysis = results[this.messageKey(account, message)] || null;
            }
        }
        return accounts;
    },

    /** Add stable storage keys to background scores before local persistence. */
    addStorageKeys(accounts, scores) {
        const keysByMessageId = new Map();
        for (const account of accounts) {
            for (const message of account.messages || []) {
                keysByMessageId.set(String(message.id), this.messageKey(account, message));
            }
        }
        return scores.map(score => ({
            ...score,
            storageKey: keysByMessageId.get(String(score.messageId)) || null
        }));
    },

    /** Prefer the RFC Message-ID because Thunderbird numeric IDs expire after restart. */
    messageKey(account, message) {
        const accountId = String(account?.accountId || '');
        const headerMessageId = String(message?.headerMessageId || '').trim();
        if (headerMessageId) {
            return JSON.stringify(['header', accountId, headerMessageId]);
        }
        const timestamp = new Date(message?.date || '').getTime();
        const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
        return JSON.stringify([
            'fallback',
            accountId,
            date,
            String(message?.author || ''),
            String(message?.subject || ''),
            Number(message?.size) || 0
        ]);
    },

    /** Request the shared background coordinator to analyze selected messages. */
    async analyze(messageIds) {
        const response = await browser.runtime.sendMessage({
            action: CONFIG.ACTIONS.DASHBOARD_BULK_TRIAGE,
            messageIds
        });
        if (!response?.success) {
            throw new Error(response?.error || I18n.t('dashboardAnalysisFailed'));
        }
        return response.data;
    },

    /** Open the existing single-message workspace in its requested AI mode. */
    async openWorkspace(messageId, mode) {
        const parameters = new URLSearchParams({ messageId: String(messageId), [mode]: '1' });
        await browser.tabs.create({
            url: `${browser.runtime.getURL('single-mail-ui.html')}?${parameters.toString()}`
        });
    },

    /** Reject malformed or stale storage data without exposing it to rendering code. */
    normalizeResults(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return Object.fromEntries(
            Object.entries(value)
                .map(([messageId, result]) => [messageId, this.normalizeResult(result)])
                .filter(([_messageId, result]) => result !== null)
        );
    },

    /** Normalize one score record to the stable dashboard persistence contract. */
    normalizeResult(result) {
        const importanceScore = this.normalizeScore(result?.importanceScore);
        const spamScore = this.normalizeScore(result?.spamScore);
        const analyzedAt = String(result?.analyzedAt || '');
        if (importanceScore === null || spamScore === null || !/^\d{4}-\d{2}-\d{2}T/u.test(analyzedAt)) {
            return null;
        }
        return {
            importanceScore,
            spamScore,
            analyzedAt,
            model: typeof result.model === 'string' ? result.model : null
        };
    },

    normalizeScore(value) {
        const score = Number(value);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? Math.round(score) : null;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardAIService = DashboardAIService;
}
