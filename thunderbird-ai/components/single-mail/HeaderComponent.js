/**
 * HeaderComponent - Manages the header section
 * 
 * Handles the display of the AI Assistant title and email subject in the header.
 * 
 * @example
 * const header = new HeaderComponent(manager);
 * header.initialize();
 */
const HeaderComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const header = new HeaderComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.elements = {
            title: document.querySelector('.header h1'),
            subtitle: document.getElementById('emailSubject'),
            version: document.getElementById('addonVersion'),
            openOverlay: document.getElementById('singleMailOpenOverlay'),
            openWindow: document.getElementById('singleMailOpenWindow'),
            openTab: document.getElementById('singleMailOpenTab'),
            closeView: document.getElementById('singleMailCloseView')
        };
        this.modeHandlers = {
            overlay: () => { void this.switchView('overlay'); },
            window: () => { void this.switchView('window'); },
            tab: () => { void this.switchView('tab'); }
        };
        this.closeWindow = () => window.close();
    }

    /**
     * Initialize the component
     * 
     * Sets up the initial state.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        document.title = CONFIG.ADDON_NAME;
        this.elements.title.textContent = I18n.t('appTitle');
        this.elements.subtitle.textContent = I18n.t('emailLoading');
        this.elements.version.textContent = I18n.t('versionLabel', {
            version: CONFIG.ADDON_VERSION
        });
        const currentMode = this.currentMode();
        this.elements.openOverlay.hidden = currentMode === 'overlay';
        this.elements.openWindow.hidden = currentMode === 'window';
        this.elements.openTab.hidden = currentMode === 'tab';
        this.elements.closeView.hidden = currentMode !== 'window';
        this.elements.openOverlay.addEventListener('click', this.modeHandlers.overlay);
        this.elements.openWindow.addEventListener('click', this.modeHandlers.window);
        this.elements.openTab.addEventListener('click', this.modeHandlers.tab);
        this.elements.closeView.addEventListener('click', this.closeWindow);
    }

    /** Identify which of the three single-mail containers owns this document. */
    currentMode() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'expanded') {
            return 'tab';
        }
        return view === 'window' ? 'window' : 'overlay';
    }

    /** Move the current message to another supported container without changing its default. */
    async switchView(mode) {
        const buttons = [
            this.elements.openOverlay,
            this.elements.openWindow,
            this.elements.openTab
        ];
        for (const button of buttons) {
            button.disabled = true;
        }
        try {
            await this.manager.switchView(mode);
        } catch (error) {
            console.error('Could not switch the single-mail view:', error);
            for (const button of buttons) {
                button.disabled = false;
            }
            this.manager.showError(I18n.t('singleMailLaunchFailedMessage'));
        }
    }

    /**
     * Update email subject
     * 
     * Updates the email subject displayed in the header.
     * 
     * @param {string} subject - Email subject
     * @example
     * this.updateEmailSubject('Meeting tomorrow');
     */
    updateEmailSubject(subject) {
        if (this.elements.subtitle) {
            this.elements.subtitle.textContent = subject || I18n.t('emailLoading');
        }
    }

    /**
     * Show loading state
     * 
     * Shows a loading state in the header.
     * 
     * @param {boolean} loading - Whether to show loading state
     * @example
     * this.showLoading(true);
     */
    showLoading(loading) {
        if (this.elements.subtitle) {
            if (loading) {
                this.elements.subtitle.textContent = I18n.t('emailLoadingShort');
            }
        }
    }

    /**
     * Cleanup component
     * 
     * Performs cleanup when the component is destroyed.
     * 
     * @example
     * this.cleanup();
     */
    cleanup() {
        this.elements.openOverlay?.removeEventListener('click', this.modeHandlers.overlay);
        this.elements.openWindow?.removeEventListener('click', this.modeHandlers.window);
        this.elements.openTab?.removeEventListener('click', this.modeHandlers.tab);
        this.elements.closeView?.removeEventListener('click', this.closeWindow);
    }
};

/**
 * Make HeaderComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.HeaderComponent = HeaderComponent;
}
