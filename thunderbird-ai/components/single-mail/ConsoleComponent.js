/**
 * ConsoleComponent - Manages console output display
 * 
 * Handles the display of console messages and logs.
 * 
 * @example
 * const console = new ConsoleComponent(manager);
 * console.initialize();
 */
const ConsoleComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const console = new ConsoleComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.element = manager.elements.consoleOutput;
        this.logs = [];
        this.maxLogs = 100;
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
        this.clear();
    }

    /**
     * Log message
     * 
     * Adds a log message to the console.
     * 
     * @param {string} message - Log message
     * @param {string} level - Log level (info, success, error, warning)
     * @example
     * this.log('Operation started', 'info');
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            level
        };
        
        this.logs.push(logEntry);
        
        // Limit log entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        this.updateDisplay();
    }

    /**
     * Update display
     * 
     * Updates the console display with current logs.
     * 
     * @example
     * this.updateDisplay();
     */
    updateDisplay() {
        if (!this.element) return;
        
        const logHtml = this.logs.map(log => {
            const levelClass = `log-${log.level}`;
            return `<div class="log-entry ${levelClass}">[${log.timestamp}] ${log.message}</div>`;
        }).join('');
        
        this.element.innerHTML = logHtml || 'Console-Ausgabe wird hier angezeigt...';
        
        // Auto-scroll to bottom
        this.element.scrollTop = this.element.scrollHeight;
    }

    /**
     * Clear console
     * 
     * Clears all console logs.
     * 
     * @example
     * this.clear();
     */
    clear() {
        this.logs = [];
        this.updateDisplay();
    }

    /**
     * Get logs
     * 
     * Returns all current logs.
     * 
     * @returns {Array} Array of log entries
     * @example
     * const logs = this.getLogs();
     */
    getLogs() {
        return [...this.logs];
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
        this.logs = [];
    }
};

/**
 * Make ConsoleComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.ConsoleComponent = ConsoleComponent;
} 