/** Coordinates launch mode, discovery counters, and single-instance durable dashboard tabs. */
const DashboardLaunchService = {
    MODES: Object.freeze({ OVERLAY: 'overlay', TAB: 'tab' }),
    PROMPTS: Object.freeze({ ADOPT_TAB: 'adopt-tab', DISCOVER_TAB: 'discover-tab' }),
    openInProgress: null,

    normalizeMode(value) {
        return value === this.MODES.TAB ? this.MODES.TAB : this.MODES.OVERLAY;
    },

    async getMode() {
        const key = CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE;
        const stored = await browser.storage.local.get(key);
        return this.normalizeMode(stored[key]);
    },

    /** Apply the global toolbar behavior; onClicked is active only without a popup. */
    async applyToolbarMode(mode) {
        const popup = this.normalizeMode(mode) === this.MODES.TAB
            ? ''
            : 'global-dashboard.html';
        await browser.action.setPopup({ popup });
    },

    async openExpanded(source = 'manual') {
        if (this.openInProgress) {
            return this.openInProgress;
        }
        this.openInProgress = this.openOrFocusExpanded(source);
        try {
            return await this.openInProgress;
        } finally {
            this.openInProgress = null;
        }
    },

    /** Focus the existing dashboard when possible and create one durable tab otherwise. */
    async openOrFocusExpanded(source) {
        const dashboardUrl = browser.runtime.getURL('global-dashboard.html');
        const url = `${dashboardUrl}?view=expanded&source=${encodeURIComponent(source)}`;
        const existing = await this.findExpandedTab(dashboardUrl);
        if (existing?.id !== undefined) {
            try {
                const focusedTab = await browser.tabs.update(existing.id, { active: true });
                await this.focusWindow(existing.windowId);
                return focusedTab;
            } catch (error) {
                console.warn('Could not focus the existing dashboard tab; opening a new one.', error);
            }
        }
        return browser.tabs.create({ url });
    },

    /** Find a content tab owned by the current extension without matching unrelated pages. */
    async findExpandedTab(dashboardUrl) {
        if (typeof browser.tabs.query !== 'function') {
            return null;
        }
        try {
            const tabs = await browser.tabs.query({});
            return tabs.find(tab => tab.url === dashboardUrl
                || tab.url?.startsWith(`${dashboardUrl}?`)) || null;
        } catch (error) {
            console.warn('Could not inspect existing dashboard tabs.', error);
            return null;
        }
    },

    /** Bring the containing Thunderbird window forward after activating its dashboard tab. */
    async focusWindow(windowId) {
        if (windowId === undefined || typeof browser.windows?.update !== 'function') {
            return;
        }
        try {
            await browser.windows.update(windowId, { focused: true });
        } catch (error) {
            console.warn('Dashboard tab was activated, but its Thunderbird window could not be focused.', error);
        }
    },

    /** Count only actual overlay opens and explicit uses of the expand control. */
    async promptForOpen(locationSearch) {
        const parameters = new URLSearchParams(locationSearch || '');
        const expanded = parameters.get('view') === 'expanded';
        if (!expanded) {
            return this.incrementPromptCounter(this.PROMPTS.DISCOVER_TAB);
        }
        if (parameters.get('source') === 'manual') {
            return this.incrementPromptCounter(this.PROMPTS.ADOPT_TAB);
        }
        return null;
    },

    async incrementPromptCounter(prompt) {
        const definition = this.promptDefinition(prompt);
        const stored = await browser.storage.local.get([
            definition.countKey,
            definition.suppressedKey
        ]);
        if (stored[definition.suppressedKey] === true) {
            return null;
        }
        const previous = Number.parseInt(stored[definition.countKey], 10);
        const count = Math.min(
            definition.threshold,
            (Number.isFinite(previous) && previous > 0 ? previous : 0) + 1
        );
        await browser.storage.local.set({ [definition.countKey]: count });
        return count >= definition.threshold ? prompt : null;
    },

    /** A handled prompt starts a new counting cycle unless it was permanently dismissed. */
    async resolvePrompt(prompt, doNotShowAgain) {
        const definition = this.promptDefinition(prompt);
        await browser.storage.local.set({
            [definition.countKey]: 0,
            [definition.suppressedKey]: doNotShowAgain === true
        });
    },

    promptDefinition(prompt) {
        const keys = CONFIG.STORAGE_KEYS;
        if (prompt === this.PROMPTS.ADOPT_TAB) {
            return {
                countKey: keys.DASHBOARD_EXPAND_USE_COUNT,
                suppressedKey: keys.DASHBOARD_EXPAND_PROMPT_SUPPRESSED,
                threshold: CONFIG.UI.DASHBOARD_EXPAND_PROMPT_THRESHOLD
            };
        }
        if (prompt === this.PROMPTS.DISCOVER_TAB) {
            return {
                countKey: keys.DASHBOARD_OVERLAY_OPEN_COUNT,
                suppressedKey: keys.DASHBOARD_OVERLAY_PROMPT_SUPPRESSED,
                threshold: CONFIG.UI.DASHBOARD_OVERLAY_PROMPT_THRESHOLD
            };
        }
        throw new Error(`Unsupported dashboard launch prompt: ${String(prompt)}`);
    }
};

globalThis.DashboardLaunchService = DashboardLaunchService;
