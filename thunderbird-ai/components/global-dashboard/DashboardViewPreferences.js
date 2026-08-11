/** Loads, normalizes, and persists the complete global dashboard view state. */
const DashboardViewPreferences = {
    /** Restore every dashboard preference from untrusted extension storage. */
    async load() {
        const keys = CONFIG.STORAGE_KEYS;
        const stored = await browser.storage.local.get([
            keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED,
            keys.DASHBOARD_SHOW_PREVIEW,
            keys.DASHBOARD_PREVIEW_LINES,
            keys.DASHBOARD_SORT_ORDER,
            keys.DASHBOARD_VIEW_MODE,
            keys.DASHBOARD_MESSAGE_LIMIT,
            keys.DASHBOARD_DATE_FROM,
            keys.DASHBOARD_DATE_TO,
            keys.DASHBOARD_SENDER_FILTER,
            keys.DASHBOARD_AI_STATUS_FILTER,
            keys.DASHBOARD_IMPORTANCE_MINIMUM,
            keys.DASHBOARD_SPAM_MINIMUM,
            keys.DASHBOARD_RISK_MINIMUM
        ]);
        const senderFilter = stored[keys.DASHBOARD_SENDER_FILTER];
        return {
            displayOptionsExpanded: stored[keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED] !== false,
            previewEnabled: stored[keys.DASHBOARD_SHOW_PREVIEW] === true,
            previewLineCount: this.normalizePreviewLines(stored[keys.DASHBOARD_PREVIEW_LINES]),
            sortOrder: GlobalMailViewService.normalizeSortOrder(stored[keys.DASHBOARD_SORT_ORDER]),
            viewMode: GlobalMailViewService.normalizeViewMode(stored[keys.DASHBOARD_VIEW_MODE]),
            messageLimit: GlobalMailViewService.normalizeLimit(stored[keys.DASHBOARD_MESSAGE_LIMIT]),
            dateFrom: GlobalMailViewService.normalizeDate(stored[keys.DASHBOARD_DATE_FROM]),
            dateTo: GlobalMailViewService.normalizeDate(stored[keys.DASHBOARD_DATE_TO]),
            selectedSenderKeys: Array.isArray(senderFilter) ? new Set(senderFilter) : null,
            aiStatusFilter: GlobalMailViewService.normalizeAIStatusFilter(
                stored[keys.DASHBOARD_AI_STATUS_FILTER]
            ),
            importanceMinimum: GlobalMailViewService.normalizePercentage(
                stored[keys.DASHBOARD_IMPORTANCE_MINIMUM]
            ),
            spamMinimum: GlobalMailViewService.normalizePercentage(
                stored[keys.DASHBOARD_SPAM_MINIMUM]
            ),
            riskMinimum: GlobalMailViewService.normalizePercentage(
                stored[keys.DASHBOARD_RISK_MINIMUM]
            )
        };
    },

    /** Persist only view preferences; mailbox content and AI scores have separate owners. */
    async save(state) {
        const keys = CONFIG.STORAGE_KEYS;
        await browser.storage.local.set({
            [keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED]: state.displayOptionsExpanded,
            [keys.DASHBOARD_SHOW_PREVIEW]: state.previewEnabled,
            [keys.DASHBOARD_PREVIEW_LINES]: state.previewLineCount,
            [keys.DASHBOARD_SORT_ORDER]: state.sortOrder,
            [keys.DASHBOARD_VIEW_MODE]: state.viewMode,
            [keys.DASHBOARD_MESSAGE_LIMIT]: state.messageLimit,
            [keys.DASHBOARD_DATE_FROM]: state.dateFrom,
            [keys.DASHBOARD_DATE_TO]: state.dateTo,
            [keys.DASHBOARD_AI_STATUS_FILTER]: state.aiStatusFilter,
            [keys.DASHBOARD_IMPORTANCE_MINIMUM]: state.importanceMinimum,
            [keys.DASHBOARD_SPAM_MINIMUM]: state.spamMinimum,
            [keys.DASHBOARD_RISK_MINIMUM]: state.riskMinimum,
            [keys.DASHBOARD_SENDER_FILTER]: state.selectedSenderKeys === null
                ? null
                : [...state.selectedSenderKeys]
        });
    },

    normalizePreviewLines(value) {
        const lines = Number.parseInt(value, 10);
        return Number.isFinite(lines) ? Math.min(20, Math.max(1, lines)) : 3;
    }
};

if (typeof window !== 'undefined') {
    window.DashboardViewPreferences = DashboardViewPreferences;
}
