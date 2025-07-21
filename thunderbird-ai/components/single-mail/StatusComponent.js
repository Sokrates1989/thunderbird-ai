/**
 * StatusComponent - Manages status display
 * 
 * Handles the display of status messages to the user.
 * 
 * @example
 * const status = new StatusComponent(manager);
 * status.initialize();
 */
const StatusComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const status = new StatusComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.element = manager.elements.status;
        this.currentMessage = '';
        this.currentType = 'info';
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
     * Update status
     * 
     * Updates the status message with the specified type.
     * 
     * @param {string} message - Status message
     * @param {string} type - Status type (info, success, error, warning)
     * @example
     * this.updateStatus('Processing...', 'info');
     */
    updateStatus(message, type = 'info') {
        this.currentMessage = message;
        this.currentType = type;
        
        if (this.element) {
            this.element.textContent = `Status: ${message}`;
            this.element.className = `status ${type}`;
        }
    }

    /**
     * Clear status
     * 
     * Clears the current status message.
     * 
     * @example
     * this.clearStatus();
     */
    clearStatus() {
        this.currentMessage = '';
        this.currentType = 'info';
        
        if (this.element) {
            this.element.textContent = 'Status: Bereit';
            this.element.className = 'status';
        }
    }

    /**
     * Show loading status
     * 
     * Shows a loading status message.
     * 
     * @param {string} message - Loading message
     * @example
     * this.showLoading('Processing email...');
     */
    showLoading(message = 'Verarbeite...') {
        this.updateStatus(message, 'info');
    }

    /**
     * Show success status
     * 
     * Shows a success status message.
     * 
     * @param {string} message - Success message
     * @example
     * this.showSuccess('Operation completed');
     */
    showSuccess(message) {
        this.updateStatus(message, 'success');
    }

    /**
     * Show error status
     * 
     * Shows an error status message.
     * 
     * @param {string} message - Error message
     * @example
     * this.showError('Operation failed');
     */
    showError(message) {
        this.updateStatus(message, 'error');
    }

    /**
     * Show warning status
     * 
     * Shows a warning status message.
     * 
     * @param {string} message - Warning message
     * @example
     * this.showWarning('Please check settings');
     */
    showWarning(message) {
        this.updateStatus(message, 'warning');
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
        this.currentMessage = '';
        this.currentType = 'info';
    }
};

/**
 * Make StatusComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.StatusComponent = StatusComponent;
} 