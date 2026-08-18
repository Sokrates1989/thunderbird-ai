/** Routes extension action clicks without relying on manifest popup fallbacks. */
globalThis.LaunchModeService = {
    MODES: Object.freeze({ OVERLAY: 'overlay', TAB: 'tab' }),

    normalizeMode(value) {
        return value === this.MODES.TAB ? this.MODES.TAB : this.MODES.OVERLAY;
    },

    async getMode(storageKey) {
        const stored = await browser.storage.local.get(storageKey);
        return this.normalizeMode(stored[storageKey]);
    },

    /** Ensure clicks wake the background event page instead of opening a stale popup. */
    async clearPopup(actionApi, tabId = undefined) {
        const details = { popup: '' };
        if (tabId !== undefined) {
            details.tabId = tabId;
        }
        await actionApi.setPopup(details);
    },

    /** Open a popup for exactly one routed click, then restore wake-safe click handling. */
    async openOverlay(actionApi, popup, options = {}) {
        const popupDetails = { popup };
        if (options.tabId !== undefined) {
            popupDetails.tabId = options.tabId;
        }
        await actionApi.setPopup(popupDetails);
        let opened = false;
        try {
            const popupOpened = options.windowId === undefined
                ? await actionApi.openPopup()
                : await actionApi.openPopup({ windowId: options.windowId });
            if (popupOpened === false) {
                throw new Error('Thunderbird did not open the requested action popup.');
            }
            opened = true;
            return true;
        } finally {
            try {
                await this.clearPopup(actionApi, options.tabId);
            } catch (error) {
                if (!opened) {
                    throw error;
                }
                console.warn('The action popup opened, but its temporary assignment could not be cleared.', error);
            }
        }
    }
};
