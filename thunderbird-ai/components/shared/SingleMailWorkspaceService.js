/** Opens or focuses durable single-message workspaces for every calling UI. */
const SingleMailWorkspaceService = {
    MODES: Object.freeze(new Set(['summarize', 'reply', 'chat'])),
    openInProgress: new Map(),

    normalizeMode(mode) {
        return this.MODES.has(mode) ? mode : null;
    },

    workspaceUrl(messageId, mode = null, source = 'manual') {
        const parameters = new URLSearchParams({ messageId: String(messageId) });
        const normalizedMode = this.normalizeMode(mode);
        if (normalizedMode) {
            parameters.set(normalizedMode, '1');
        }
        parameters.set('view', 'expanded');
        parameters.set('source', String(source || 'manual').slice(0, 80));
        return `${browser.runtime.getURL('single-mail-ui.html')}?${parameters.toString()}`;
    },

    /** Share rapid identical launches and release the lock after success or failure. */
    async openExpanded(messageId, mode = null, source = 'manual') {
        if (messageId === undefined || messageId === null || messageId === '') {
            throw new Error('A message ID is required to open the single-mail workspace.');
        }
        const normalizedMode = this.normalizeMode(mode);
        const key = `${String(messageId)}:${normalizedMode || 'main'}`;
        if (this.openInProgress.has(key)) {
            return this.openInProgress.get(key);
        }
        const launch = this.openOrFocus(messageId, normalizedMode, source);
        this.openInProgress.set(key, launch);
        try {
            return await launch;
        } finally {
            this.openInProgress.delete(key);
        }
    },

    /** Resolve the displayed Thunderbird message before opening a persistent tab. */
    async openFromDisplayedTab(tab, source = 'saved-preference') {
        const displayed = await this.withTimeout(
            () => browser.messageDisplay.getDisplayedMessages(tab.id),
            'load-displayed-message'
        );
        const messages = Array.isArray(displayed) ? displayed : displayed?.messages;
        const message = messages?.[0] || null;
        if (message?.id === undefined || message?.id === null) {
            throw new Error('Thunderbird did not report a displayed message.');
        }
        return this.openExpanded(message.id, null, source);
    },

    async openOrFocus(messageId, mode, source) {
        const baseUrl = browser.runtime.getURL('single-mail-ui.html');
        const existing = await this.findWorkspaceTab(baseUrl, messageId, mode);
        if (existing?.id !== undefined) {
            const focused = await this.withTimeout(
                () => browser.tabs.update(existing.id, { active: true }),
                'activate-single-mail-tab'
            );
            if (existing.windowId !== undefined && typeof browser.windows?.update === 'function') {
                try {
                    await this.withTimeout(
                        () => browser.windows.update(existing.windowId, { focused: true }),
                        'focus-single-mail-window',
                        CONFIG.UI.DASHBOARD_WINDOW_FOCUS_TIMEOUT_MS
                    );
                } catch (error) {
                    console.warn('The single-mail tab was focused without raising its window.', error);
                }
            }
            return focused;
        }
        return this.withTimeout(
            () => browser.tabs.create({ url: this.workspaceUrl(messageId, mode, source) }),
            'create-single-mail-tab'
        );
    },

    async findWorkspaceTab(baseUrl, messageId, mode) {
        if (typeof browser.tabs.query !== 'function') {
            return null;
        }
        const tabs = await this.withTimeout(
            () => browser.tabs.query({}),
            'query-single-mail-tabs'
        );
        return tabs.find(tab => this.matchesWorkspace(tab, baseUrl, messageId, mode)) || null;
    },

    matchesWorkspace(tab, baseUrl, messageId, mode) {
        if (!tab?.url?.startsWith(`${baseUrl}?`)) {
            return false;
        }
        const parameters = new URLSearchParams(tab.url.slice(tab.url.indexOf('?') + 1));
        const tabMode = [...this.MODES].find(candidate => parameters.get(candidate) === '1') || null;
        return parameters.get('messageId') === String(messageId) && tabMode === mode;
    },

    async withTimeout(operation, stage, timeoutMs = CONFIG.UI.DASHBOARD_LAUNCH_API_TIMEOUT_MS) {
        let timeoutId;
        const timeout = new Promise((_resolve, reject) => {
            timeoutId = setTimeout(() => {
                const error = new Error(`Thunderbird did not finish ${stage} within ${timeoutMs} ms.`);
                error.code = 'SINGLE_MAIL_LAUNCH_TIMEOUT';
                error.stage = stage;
                reject(error);
            }, timeoutMs);
        });
        try {
            return await Promise.race([Promise.resolve().then(operation), timeout]);
        } finally {
            clearTimeout(timeoutId);
        }
    }
};

globalThis.SingleMailWorkspaceService = SingleMailWorkspaceService;
