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

    /** Merge successful scores while optionally protecting every existing record. */
    async saveResults(existingResults, newResults, model, options = {}) {
        const analyzedAt = new Date().toISOString();
        const merged = { ...this.normalizeResults(existingResults) };
        for (const result of newResults) {
            const normalized = this.normalizeResult({ ...result, model, analyzedAt });
            const storageKey = result.storageKey;
            const protectedResult = options.preserveExisting === true && merged[storageKey];
            if (normalized && storageKey && !protectedResult) {
                merged[storageKey] = normalized;
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

    /** Split the current selection into messages to analyze and persisted scores to skip. */
    createAnalysisPlan(accounts, selectedMessageIds, includeAnalyzed = false) {
        const selectedIds = new Set(
            [...(selectedMessageIds || [])]
                .filter(messageId => messageId !== undefined && messageId !== null)
                .map(messageId => String(messageId))
        );
        const selectedMessages = new Map();
        for (const account of accounts || []) {
            for (const message of account.messages || []) {
                const messageId = String(message.id);
                if (selectedIds.has(messageId) && !selectedMessages.has(messageId)) {
                    selectedMessages.set(messageId, message);
                }
            }
        }
        const messageIds = [...selectedMessages.values()]
            .filter(message => includeAnalyzed || !message.aiAnalysis)
            .map(message => message.id);
        return {
            messageIds,
            selectedCount: selectedMessages.size,
            skippedCount: selectedMessages.size - messageIds.length
        };
    },

    /** Send a prepared non-empty plan and avoid an API message for an empty plan. */
    async analyzePlan(plan) {
        if (!plan?.messageIds?.length) {
            return null;
        }
        return this.analyze(plan.messageIds);
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
        return MessageService.messageIdentity(message, account?.accountId);
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

    /** Archive one correction in the background and return its validated score metadata. */
    async submitFeedback(message, reason = '') {
        const analysis = message?.aiAnalysis;
        const response = await browser.runtime.sendMessage({
            action: CONFIG.ACTIONS.DASHBOARD_SAVE_FEEDBACK,
            messageId: message.id,
            originalScores: {
                importanceScore: analysis.importanceScore,
                spamScore: analysis.spamScore
            },
            correctedScores: {
                importanceScore: message.correctedImportanceScore,
                spamScore: message.correctedSpamScore
            },
            reason,
            sourceModel: analysis.model
        });
        if (!response?.success) {
            throw new Error(response?.error || I18n.t('dashboardFeedbackSaveFailed'));
        }
        return response.data;
    },

    /** Replace the visible score while retaining a durable user-correction marker. */
    async saveCorrection(existingResults, account, message, correction) {
        const storageKey = this.messageKey(account, message);
        const correctedAt = String(correction?.correctedAt || '');
        const normalized = this.normalizeResult({
            importanceScore: correction?.importanceScore,
            spamScore: correction?.spamScore,
            analyzedAt: correctedAt,
            correctedAt,
            corrected: true,
            model: message?.aiAnalysis?.model || null
        });
        if (!normalized) {
            throw new Error(I18n.t('dashboardFeedbackInvalid'));
        }
        const merged = { ...this.normalizeResults(existingResults), [storageKey]: normalized };
        await browser.storage.local.set({ [CONFIG.STORAGE_KEYS.DASHBOARD_AI_RESULTS]: merged });
        return merged;
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
            model: typeof result.model === 'string' ? result.model : null,
            corrected: result?.corrected === true,
            correctedAt: typeof result?.correctedAt === 'string' ? result.correctedAt : null
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
