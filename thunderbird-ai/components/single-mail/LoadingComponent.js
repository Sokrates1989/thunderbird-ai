/**
 * LoadingComponent - Manages loading overlay
 * 
 * Handles the display and hiding of the loading overlay.
 * 
 * @example
 * const loading = new LoadingComponent(manager);
 * loading.initialize();
 */
const LoadingComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const loading = new LoadingComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.element = document.getElementById('loadingOverlay');
        this.isVisible = false;
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
        // Component is ready
    }

    /**
     * Show loading overlay
     * 
     * Shows the loading overlay with optional custom message.
     * 
     * @param {boolean} show - Whether to show the overlay
     * @param {string} message - Custom loading message
     * @example
     * this.show(true, 'Processing...');
     */
    show(show, message = I18n.t('loadingEmail')) {
        this.isVisible = show;
        
        if (this.element) {
            if (show) {
                this.element.style.display = 'flex';
                // Update message if provided
                const messageElement = this.element.querySelector('div:last-child');
                if (messageElement) {
                    messageElement.textContent = message;
                }
            } else {
                this.element.style.display = 'none';
            }
        }
    }

    /**
     * Hide loading overlay
     * 
     * Hides the loading overlay.
     * 
     * @example
     * this.hide();
     */
    hide() {
        this.show(false);
    }

    /**
     * Update loading message
     * 
     * Updates the loading message without changing visibility.
     * 
     * @param {string} message - New loading message
     * @example
     * this.updateMessage('Almost done...');
     */
    updateMessage(message) {
        if (this.element) {
            const messageElement = this.element.querySelector('div:last-child');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * Check if loading is visible
     * 
     * Returns whether the loading overlay is currently visible.
     * 
     * @returns {boolean} True if loading is visible
     * @example
     * const isVisible = this.isLoadingVisible();
     */
    isLoadingVisible() {
        return this.isVisible;
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
        this.hide();
        this.isVisible = false;
    }
};

/**
 * Make LoadingComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.LoadingComponent = LoadingComponent;
}
