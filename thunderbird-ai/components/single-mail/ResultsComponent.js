/**
 * ResultsComponent - Manages AI action results display
 * 
 * Handles the display of results from AI actions like summaries, replies, etc.
 * 
 * @example
 * const results = new ResultsComponent(manager);
 * results.initialize();
 */
const ResultsComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const results = new ResultsComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.resultsArea;
        this.elements = {
            title: document.getElementById('resultsTitle'),
            content: document.getElementById('resultsContent'),
            actions: document.getElementById('resultsActions')
        };
        this.currentResult = null;
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
     * Show results
     * 
     * Displays the results of an AI action.
     * 
     * @param {Object} result - Result data
     * @param {string} result.title - Result title
     * @param {string} result.content - Result content
     * @param {Array} result.actions - Available actions
     * @example
     * this.showResults({ title: 'Summary', content: 'Email summary...' });
     */
    showResults(result) {
        this.currentResult = result;
        
        if (this.elements.title) {
            this.elements.title.textContent = result.title || 'Ergebnis';
        }
        
        if (this.elements.content) {
            this.elements.content.innerHTML = this.formatContent(result.content);
        }
        
        if (this.elements.actions) {
            this.createActionButtons(result.actions || []);
        }
        
        this.show();
    }

    /**
     * Format content
     * 
     * Formats the result content for display.
     * 
     * @param {string} content - Raw content
     * @returns {string} Formatted HTML content
     * @example
     * const formatted = this.formatContent('Raw content');
     */
    formatContent(content) {
        if (!content) return '<p>Keine Ergebnisse verfügbar.</p>';
        
        // Convert line breaks to HTML
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    }

    /**
     * Create action buttons
     * 
     * Creates action buttons for the results.
     * 
     * @param {Array} actions - Available actions
     * @example
     * this.createActionButtons(['copy', 'save']);
     */
    createActionButtons(actions) {
        this.elements.actions.innerHTML = '';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'result-action-btn';
            button.textContent = action.label || action;
            button.onclick = () => this.handleAction(action);
            this.elements.actions.appendChild(button);
        });
    }

    /**
     * Handle action
     * 
     * Processes action button clicks.
     * 
     * @param {Object} action - Action to execute
     * @example
     * this.handleAction({ type: 'copy', label: 'Copy' });
     */
    handleAction(action) {
        switch (action.type || action) {
            case 'copy':
                this.copyToClipboard();
                break;
            case 'save':
                this.saveResult();
                break;
            case 'reply':
                this.useAsReply();
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    /**
     * Copy to clipboard
     * 
     * Copies the result content to clipboard.
     * 
     * @example
     * this.copyToClipboard();
     */
    copyToClipboard() {
        if (this.currentResult && this.currentResult.content) {
            navigator.clipboard.writeText(this.currentResult.content).then(() => {
                this.manager.updateStatus('In Zwischenablage kopiert!', 'success');
            }).catch(err => {
                console.error('Failed to copy:', err);
                this.manager.showError('Fehler beim Kopieren');
            });
        }
    }

    /**
     * Save result
     * 
     * Saves the result for later use.
     * 
     * @example
     * this.saveResult();
     */
    saveResult() {
        // TODO: Implement save functionality
        this.manager.updateStatus('Speichern wird implementiert...', 'info');
    }

    /**
     * Use as reply
     * 
     * Uses the result as a reply to the email.
     * 
     * @example
     * this.useAsReply();
     */
    useAsReply() {
        // TODO: Implement reply functionality
        this.manager.updateStatus('Antwort wird implementiert...', 'info');
    }

    /**
     * Show results area
     * 
     * Shows the results area.
     * 
     * @example
     * this.show();
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide results area
     * 
     * Hides the results area.
     * 
     * @example
     * this.hide();
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Clear results
     * 
     * Clears the current results.
     * 
     * @example
     * this.clear();
     */
    clear() {
        this.currentResult = null;
        this.hide();
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
        this.currentResult = null;
    }
};

/**
 * Make ResultsComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.ResultsComponent = ResultsComponent;
} 