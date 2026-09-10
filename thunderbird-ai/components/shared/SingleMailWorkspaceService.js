/** Opens or focuses durable single-message workspaces for every calling UI. */
const SingleMailWorkspaceService = {
    MODES: Object.freeze(new Set(['summarize', 'reply', 'chat'])),
    openInProgress: new Map(),

    normalizeMode(mode) {
        return this.MODES.has(mode) ? mode : null;
    },

    workspaceUrl(messageId, mode = null, source = 'manual', returnTabId = null) {
        const parameters = new URLSearchParams({ messageId: String(messageId) });
        const normalizedMode = this.normalizeMode(mode);
        if (normalizedMode) {
            parameters.set(normalizedMode, '1');
        }
        parameters.set('view', 'expanded');
        parameters.set('source', String(source || 'manual').slice(0, 80));
        if (Number.isInteger(returnTabId)) {
            parameters.set('returnTabId', String(returnTabId));
        }
        return `${browser.runtime.getURL('single-mail-ui.html')}?${parameters.toString()}`;
    },

    /** Share rapid identical launches and release the lock after success or failure. */
    async openExpanded(messageId, mode = null, source = 'manual', returnTab = null) {
        if (messageId === undefined || messageId === null || messageId === '') {
            throw new Error('A message ID is required to open the single-mail workspace.');
        }
        const normalizedMode = this.normalizeMode(mode);
        const key = `${String(messageId)}:${normalizedMode || 'main'}`;
        if (this.openInProgress.has(key)) {
            return this.openInProgress.get(key);
        }
        const launch = this.openOrFocus(messageId, normalizedMode, source, returnTab);
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
        return this.openExpanded(message.id, null, source, tab);
    },

    async openOrFocus(messageId, mode, source, returnTab = null) {
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
        const resolvedReturnTab = await this.resolveReturnTab(returnTab);
        const createProperties = {
            url: this.workspaceUrl(messageId, mode, source, resolvedReturnTab?.id)
        };
        if (resolvedReturnTab?.windowId !== undefined) {
            createProperties.windowId = resolvedReturnTab.windowId;
        }
        return this.withTimeout(
            () => browser.tabs.create(createProperties),
            'create-single-mail-tab'
        );
    },

    /** Resolve the tab which should regain focus when an expanded workspace closes. */
    async resolveReturnTab(returnTab = null) {
        if (returnTab?.id !== undefined) {
            return returnTab;
        }
        if (typeof browser.tabs.getCurrent === 'function') {
            const current = await this.withTimeout(
                () => browser.tabs.getCurrent(),
                'get-current-single-mail-tab'
            );
            if (current?.id !== undefined) {
                const inheritedTabId = this.returnTabIdFromSearch(current.url || '');
                if (inheritedTabId !== null && typeof browser.tabs.get === 'function') {
                    try {
                        return await this.withTimeout(
                            () => browser.tabs.get(inheritedTabId),
                            'get-inherited-return-tab'
                        );
                    } catch (error) {
                        console.warn('The inherited single-mail return tab is no longer available.', error);
                    }
                }
                return current;
            }
        }
        const [active] = await this.withTimeout(
            () => browser.tabs.query({ active: true, currentWindow: true }),
            'query-single-mail-return-tab'
        );
        return active || null;
    },

    /** Restore the source tab, open its matching message overlay, and close this workspace. */
    async returnToOverlay(messageId) {
        const current = await this.withTimeout(
            () => browser.tabs.getCurrent(),
            'get-current-single-mail-tab'
        );
        if (current?.id === undefined) {
            throw new Error('The expanded single-mail tab could not be identified.');
        }
        const target = await this.findReturnTarget(current);
        if (!target) {
            await this.closeWorkspaceTab(current.id);
            return { overlayOpened: false, targetTabId: null };
        }

        await this.withTimeout(
            () => browser.tabs.update(target.id, { active: true }),
            'activate-single-mail-return-tab'
        );
        if (target.windowId !== undefined && typeof browser.windows?.update === 'function') {
            try {
                await this.withTimeout(
                    () => browser.windows.update(target.windowId, { focused: true }),
                    'focus-single-mail-return-window',
                    CONFIG.UI.DASHBOARD_WINDOW_FOCUS_TIMEOUT_MS
                );
            } catch (error) {
                console.warn('The single-mail return tab was activated without raising its window.', error);
            }
        }

        let overlayOpened = false;
        if (await this.displaysMessage(target.id, messageId)) {
            try {
                await globalThis.LaunchModeService.openOverlay(
                    browser.messageDisplayAction,
                    'single-mail-ui.html',
                    { tabId: target.id, windowId: target.windowId }
                );
                overlayOpened = true;
            } catch (error) {
                console.warn('The source tab was restored without reopening the compact overlay.', error);
            }
        }
        await this.closeWorkspaceTab(current.id);
        return { overlayOpened, targetTabId: target.id };
    },

    /** Find the recorded source tab or the closest surviving tab to the left. */
    async findReturnTarget(current) {
        const requestedTabId = this.returnTabIdFromSearch(globalThis.location?.search || '');
        if (requestedTabId !== null && requestedTabId !== current.id
            && typeof browser.tabs.get === 'function') {
            try {
                return await this.withTimeout(
                    () => browser.tabs.get(requestedTabId),
                    'get-single-mail-return-tab'
                );
            } catch (error) {
                console.warn('The recorded single-mail return tab is no longer available.', error);
            }
        }
        const siblings = await this.withTimeout(
            () => browser.tabs.query({ windowId: current.windowId }),
            'query-single-mail-sibling-tabs'
        );
        return siblings
            .filter(tab => tab.id !== current.id && (tab.index ?? -1) < (current.index ?? Infinity))
            .sort((left, right) => (right.index ?? -1) - (left.index ?? -1))[0] || null;
    },

    /** Read only a safe Thunderbird tab ID from an expanded-workspace URL. */
    returnTabIdFromSearch(search) {
        const query = String(search || '').includes('?')
            ? String(search).slice(String(search).indexOf('?'))
            : String(search || '');
        const value = new URLSearchParams(query).get('returnTabId');
        if (!/^\d+$/u.test(value || '')) {
            return null;
        }
        const tabId = Number(value);
        return Number.isSafeInteger(tabId) ? tabId : null;
    },

    /** Avoid opening the assistant over a different message after the tab switch. */
    async displaysMessage(tabId, messageId) {
        try {
            const displayed = await this.withTimeout(
                () => browser.messageDisplay.getDisplayedMessages(tabId),
                'load-return-tab-message'
            );
            const messages = Array.isArray(displayed) ? displayed : displayed?.messages;
            return String(messages?.[0]?.id) === String(messageId);
        } catch (error) {
            console.warn('The restored tab could not be checked for the current message.', error);
            return false;
        }
    },

    async closeWorkspaceTab(tabId) {
        await this.withTimeout(
            () => browser.tabs.remove(tabId),
            'close-single-mail-tab'
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
