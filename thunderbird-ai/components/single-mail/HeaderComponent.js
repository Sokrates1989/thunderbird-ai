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
            expandView: document.getElementById('singleMailExpandView'),
            useOverlay: document.getElementById('singleMailUseOverlay'),
            useOverlayLabel: document.getElementById('singleMailUseOverlayLabel')
        };
        this.openExpanded = () => {
            this.manager.openExpandedView().catch(error => {
                console.error('Could not open the single-mail fullscreen view:', error);
                this.manager.showError(I18n.t('singleMailLaunchFailedMessage'));
            });
        };
        this.useOverlay = () => {
            void this.setOverlayDefault();
        };
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
        const expanded = new URLSearchParams(window.location.search).get('view') === 'expanded';
        this.elements.expandView.hidden = expanded;
        this.elements.useOverlay.hidden = !expanded;
        this.elements.expandView.addEventListener('click', this.openExpanded);
        this.elements.useOverlay.addEventListener('click', this.useOverlay);
    }

    /** Persist the compact overlay as the next single-mail launch destination. */
    async setOverlayDefault() {
        const button = this.elements.useOverlay;
        const label = this.elements.useOverlayLabel;
        button.disabled = true;
        label.textContent = I18n.t('singleMailUseOverlaySaving');
        try {
            const response = await this.manager.sendToBackground(
                CONFIG.ACTIONS.SET_LAUNCH_MODE,
                { setting: 'singleMailOpenMode', mode: 'overlay' }
            );
            if (!response?.success) {
                throw new Error(response?.error || I18n.t('singleMailUseOverlayFailed'));
            }
            button.classList.add('saved');
            label.textContent = I18n.t('singleMailUseOverlaySaved');
            button.title = I18n.t('singleMailUseOverlaySaved');
            button.setAttribute('aria-label', button.title);
        } catch (error) {
            console.error('Could not restore compact overlay mode:', error);
            label.textContent = I18n.t('singleMailUseOverlay');
            button.disabled = false;
            this.manager.showError(I18n.t('singleMailUseOverlayFailed'));
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
        this.elements.expandView?.removeEventListener('click', this.openExpanded);
        this.elements.useOverlay?.removeEventListener('click', this.useOverlay);
    }
};

/**
 * Make HeaderComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.HeaderComponent = HeaderComponent;
}
