/** Coordinates dashboard launch mode, discovery counters, and durable tab creation. */
const DashboardLaunchService = {
    MODES: Object.freeze({ OVERLAY: 'overlay', TAB: 'tab' }),
    PROMPTS: Object.freeze({ ADOPT_TAB: 'adopt-tab', DISCOVER_TAB: 'discover-tab' }),

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
        const url = `${browser.runtime.getURL('global-dashboard.html')}?view=expanded&source=${encodeURIComponent(source)}`;
        return browser.tabs.create({ url });
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
