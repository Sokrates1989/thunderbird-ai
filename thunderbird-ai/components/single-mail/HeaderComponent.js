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
            subtitle: document.getElementById('emailSubject')
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
        // Component is ready, no additional setup needed
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
            this.elements.subtitle.textContent = subject || 'E-Mail wird geladen...';
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
                this.elements.subtitle.textContent = 'Lade E-Mail...';
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
        // No cleanup needed
    }
};

/**
 * Make HeaderComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.HeaderComponent = HeaderComponent;
} 