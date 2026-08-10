/**
 * ErrorDialogComponent - Manages error dialog
 * 
 * Handles the display and hiding of error dialogs.
 * 
 * @example
 * const errorDialog = new ErrorDialogComponent(manager);
 * errorDialog.initialize();
 */
const ErrorDialogComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const errorDialog = new ErrorDialogComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.element = document.getElementById('errorDialog');
        this.messageElement = document.getElementById('errorMessage');
        this.closeButton = document.getElementById('errorCloseBtn');
        this.isVisible = false;
    }

    /**
     * Initialize the component
     * 
     * Sets up event listeners and initial state.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        this.attachEventListeners();
    }

    /**
     * Attach event listeners
     * 
     * Sets up click handlers for the error dialog.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        // Close button click
        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                this.hide();
            });
        }

        // Click outside dialog to close
        if (this.element) {
            this.element.addEventListener('click', (e) => {
                if (e.target === this.element) {
                    this.hide();
                }
            });
        }

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }

    /**
     * Show error dialog
     * 
     * Shows the error dialog with the specified message and title.
     * 
     * @param {string} message - Error message to display
     * @param {string} title - Error title (optional)
     * @example
     * this.showError('Something went wrong', 'Error');
     */
    showError(message, title = I18n.t('errorTitle')) {
        this.isVisible = true;
        
        if (this.element) {
            this.element.style.display = 'flex';
        }
        
        if (this.messageElement) {
            this.messageElement.textContent = message;
        }
        
        // Update title if provided
        const titleElement = this.element?.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    /**
     * Hide error dialog
     * 
     * Hides the error dialog.
     * 
     * @example
     * this.hide();
     */
    hide() {
        this.isVisible = false;
        
        if (this.element) {
            this.element.style.display = 'none';
        }
    }

    /**
     * Check if error dialog is visible
     * 
     * Returns whether the error dialog is currently visible.
     * 
     * @returns {boolean} True if error dialog is visible
     * @example
     * const isVisible = this.isErrorVisible();
     */
    isErrorVisible() {
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
 * Make ErrorDialogComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.ErrorDialogComponent = ErrorDialogComponent;
}
