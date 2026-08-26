/** Separates durable dashboard layout choices from session-only narrowing filters. */
const DashboardViewPreferences = {
    /** Restore durable display preferences and the current Thunderbird-session filters. */
    async load() {
        const keys = CONFIG.STORAGE_KEYS;
        const filterKeys = this.filterStorageKeys(keys);
        const [stored, sessionStored] = await Promise.all([
            browser.storage.local.get([
                keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED,
                keys.DASHBOARD_SHOW_PREVIEW,
                keys.DASHBOARD_PREVIEW_LINES,
                keys.DASHBOARD_CONTEXT_MENU_STYLE,
                keys.DASHBOARD_SORT_ORDER,
                keys.DASHBOARD_VIEW_MODE,
                keys.DASHBOARD_MESSAGE_LIMIT
            ]),
            browser.storage.session.get([
                ...filterKeys,
                keys.DASHBOARD_SELECTED_MESSAGES
            ])
        ]);
        await this.removeLegacyLocalFilters(filterKeys);
        const senderFilter = sessionStored[keys.DASHBOARD_SENDER_FILTER];
        return {
            displayOptionsExpanded: stored[keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED] !== false,
            previewEnabled: stored[keys.DASHBOARD_SHOW_PREVIEW] === true,
            previewLineCount: this.normalizePreviewLines(stored[keys.DASHBOARD_PREVIEW_LINES]),
            contextMenuStyle: this.normalizeContextMenuStyle(
                stored[keys.DASHBOARD_CONTEXT_MENU_STYLE]
            ),
            sortOrder: GlobalMailViewService.normalizeSortOrder(stored[keys.DASHBOARD_SORT_ORDER]),
            viewMode: GlobalMailViewService.normalizeViewMode(stored[keys.DASHBOARD_VIEW_MODE]),
            messageLimit: GlobalMailViewService.normalizeLimit(stored[keys.DASHBOARD_MESSAGE_LIMIT]),
            dateFrom: GlobalMailViewService.normalizeDate(sessionStored[keys.DASHBOARD_DATE_FROM]),
            dateTo: GlobalMailViewService.normalizeDate(sessionStored[keys.DASHBOARD_DATE_TO]),
            selectedSenderKeys: Array.isArray(senderFilter) ? new Set(senderFilter) : null,
            aiStatusFilter: GlobalMailViewService.normalizeAIStatusFilter(
                sessionStored[keys.DASHBOARD_AI_STATUS_FILTER]
            ),
            importanceMinimum: GlobalMailViewService.normalizePercentage(
                sessionStored[keys.DASHBOARD_IMPORTANCE_MINIMUM]
            ),
            spamMinimum: GlobalMailViewService.normalizePercentage(
                sessionStored[keys.DASHBOARD_SPAM_MINIMUM]
            ),
            riskMinimum: GlobalMailViewService.normalizePercentage(
                sessionStored[keys.DASHBOARD_RISK_MINIMUM]
            ),
            selectedMessageIds: this.normalizeSelectedMessageIds(
                sessionStored[keys.DASHBOARD_SELECTED_MESSAGES]
            )
        };
    },

    /** Persist layout locally and keep narrowing state only for this Thunderbird session. */
    async save(state) {
        const keys = CONFIG.STORAGE_KEYS;
        await Promise.all([
            browser.storage.local.set({
                [keys.DASHBOARD_DISPLAY_OPTIONS_EXPANDED]: state.displayOptionsExpanded,
                [keys.DASHBOARD_SHOW_PREVIEW]: state.previewEnabled,
                [keys.DASHBOARD_PREVIEW_LINES]: state.previewLineCount,
                [keys.DASHBOARD_CONTEXT_MENU_STYLE]: state.contextMenuStyle,
                [keys.DASHBOARD_SORT_ORDER]: state.sortOrder,
                [keys.DASHBOARD_VIEW_MODE]: state.viewMode,
                [keys.DASHBOARD_MESSAGE_LIMIT]: state.messageLimit
            }),
            browser.storage.session.set({
                [keys.DASHBOARD_DATE_FROM]: state.dateFrom,
                [keys.DASHBOARD_DATE_TO]: state.dateTo,
                [keys.DASHBOARD_AI_STATUS_FILTER]: state.aiStatusFilter,
                [keys.DASHBOARD_IMPORTANCE_MINIMUM]: state.importanceMinimum,
                [keys.DASHBOARD_SPAM_MINIMUM]: state.spamMinimum,
                [keys.DASHBOARD_RISK_MINIMUM]: state.riskMinimum,
                [keys.DASHBOARD_SENDER_FILTER]: state.selectedSenderKeys === null
                    ? null
                    : [...state.selectedSenderKeys],
                [keys.DASHBOARD_SELECTED_MESSAGES]: [...state.selectedMessageIds]
            })
        ]);
    },

    /** Return every narrowing key that must never outlive a Thunderbird session. */
    filterStorageKeys(keys) {
        return [
            keys.DASHBOARD_DATE_FROM,
            keys.DASHBOARD_DATE_TO,
            keys.DASHBOARD_SENDER_FILTER,
            keys.DASHBOARD_AI_STATUS_FILTER,
            keys.DASHBOARD_IMPORTANCE_MINIMUM,
            keys.DASHBOARD_SPAM_MINIMUM,
            keys.DASHBOARD_RISK_MINIMUM
        ];
    },

    /** Remove filters written by earlier releases without blocking safe session defaults. */
    async removeLegacyLocalFilters(filterKeys) {
        try {
            await browser.storage.local.remove(filterKeys);
        } catch (error) {
            console.warn('Could not remove legacy persistent dashboard filters:', error);
        }
    },

    /** Persist transient selection so popup closure cannot discard operator work. */
    async saveSelection(selectedMessageIds) {
        await browser.storage.session.set({
            [CONFIG.STORAGE_KEYS.DASHBOARD_SELECTED_MESSAGES]: [...selectedMessageIds]
        });
    },

    normalizeSelectedMessageIds(value) {
        return new Set(Array.isArray(value)
            ? value.filter(messageId => ['number', 'string'].includes(typeof messageId))
            : []);
    },

    normalizePreviewLines(value) {
        const lines = Number.parseInt(value, 10);
        return Number.isFinite(lines) ? Math.min(20, Math.max(1, lines)) : 3;
    },

    normalizeContextMenuStyle(value) {
        return value === 'submenus' ? 'submenus' : 'headings';
    }
};

if (typeof window !== 'undefined') {
    window.DashboardViewPreferences = DashboardViewPreferences;
}
