/** Routes extension action clicks without relying on manifest popup fallbacks. */
globalThis.LaunchModeService = {
    MODES: Object.freeze({ OVERLAY: 'overlay', TAB: 'tab' }),

    normalizeMode(value) {
        return value === this.MODES.TAB ? this.MODES.TAB : this.MODES.OVERLAY;
    },

    async getMode(storageKey) {
        const stored = await this.withTimeout(
            () => browser.storage.local.get(storageKey),
            'read-launch-mode'
        );
        return this.normalizeMode(stored[storageKey]);
    },

    /** Ensure clicks wake the background event page instead of opening a stale popup. */
    async clearPopup(actionApi, tabId = undefined) {
        const details = { popup: '' };
        if (tabId !== undefined) {
            details.tabId = tabId;
        }
        await this.withTimeout(
            () => actionApi.setPopup(details),
            'clear-action-popup'
        );
    },

    /** Open a popup for exactly one routed click, then restore wake-safe click handling. */
    async openOverlay(actionApi, popup, options = {}) {
        const popupDetails = { popup };
        if (options.tabId !== undefined) {
            popupDetails.tabId = options.tabId;
        }
        await this.withTimeout(
            () => actionApi.setPopup(popupDetails),
            'assign-action-popup'
        );
        let opened = false;
        try {
            const popupOpened = options.windowId === undefined
                ? await this.withTimeout(() => actionApi.openPopup(), 'open-action-popup')
                : await this.withTimeout(
                    () => actionApi.openPopup({ windowId: options.windowId }),
                    'open-action-popup'
                );
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
    },

    /** Keep a stalled Thunderbird action API from blocking background initialization. */
    async withTimeout(operation, stage) {
        return globalThis.RetryService.withTimeout(operation, {
            timeoutMs: CONFIG.UI.BACKGROUND_STARTUP_STEP_TIMEOUT_MS,
            code: 'LAUNCH_MODE_API_TIMEOUT',
            stage
        });
    }
};
