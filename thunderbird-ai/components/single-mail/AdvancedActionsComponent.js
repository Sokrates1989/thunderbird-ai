/**
 * AdvancedActionsComponent - Manages advanced action buttons
 * 
 * Handles the creation and management of advanced action buttons with toggle functionality.
 * 
 * @example
 * const advancedActions = new AdvancedActionsComponent(manager);
 * advancedActions.initialize();
 */
const AdvancedActionsComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference and button definitions.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const advancedActions = new AdvancedActionsComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.advancedActionsGrid;
        this.toggleButton = document.getElementById('advancedToggle');
        this.contentArea = document.getElementById('advancedContent');
        this.buttons = {};
        this.isExpanded = false;
        
        // Define advanced actions
        this.actions = [
            {
                id: 'translateBtn',
                icon: '🌐',
                text: 'Übersetzen',
                action: 'TRANSLATE',
                description: 'Übersetzt die E-Mail in eine andere Sprache'
            },
            {
                id: 'extractInfoBtn',
                icon: '🔍',
                text: 'Info extrahieren',
                action: 'EXTRACT_INFO',
                description: 'Extrahiert wichtige Informationen aus der E-Mail'
            },
            {
                id: 'checkSpamBtn',
                icon: '🛡️',
                text: 'Spam prüfen',
                action: 'CHECK_SPAM',
                description: 'Prüft, ob die E-Mail Spam ist'
            },
            {
                id: 'findSimilarBtn',
                icon: '🔗',
                text: 'Ähnliche finden',
                action: 'FIND_SIMILAR',
                description: 'Findet ähnliche E-Mails'
            }
        ];
    }

    /**
     * Initialize the component
     * 
     * Creates the UI structure and sets up event listeners.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        this.createButtons();
        this.attachEventListeners();
    }

    /**
     * Create action buttons
     * 
     * Dynamically creates all advanced action buttons.
     * 
     * @example
     * this.createButtons();
     */
    createButtons() {
        this.container.innerHTML = '';
        
        this.actions.forEach(actionDef => {
            const button = this.createButton(actionDef);
            this.container.appendChild(button);
            this.buttons[actionDef.id] = button;
        });
    }

    /**
     * Create a single button
     * 
     * Creates a button element with the specified properties.
     * 
     * @param {Object} actionDef - Button definition
     * @returns {HTMLElement} Created button element
     * @example
     * const button = this.createButton({ id: 'translateBtn', icon: '🌐', text: 'Übersetzen' });
     */
    createButton(actionDef) {
        const button = document.createElement('button');
        button.id = actionDef.id;
        button.className = 'button';
        button.title = actionDef.description;
        
        button.innerHTML = `
            <span class="icon">${actionDef.icon}</span>
            <span class="text">${actionDef.text}</span>
        `;
        
        button.dataset.action = actionDef.action;
        
        return button;
    }

    /**
     * Attach event listeners
     * 
     * Sets up click handlers for toggle and buttons.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        // Toggle button click
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.toggleAdvanced();
            });
        }
        
        // Advanced action button clicks
        Object.values(this.buttons).forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e);
            });
        });
    }

    /**
     * Toggle advanced section
     * 
     * Shows or hides the advanced actions section.
     * 
     * @example
     * this.toggleAdvanced();
     */
    toggleAdvanced() {
        this.isExpanded = !this.isExpanded;
        
        if (this.contentArea) {
            this.contentArea.style.display = this.isExpanded ? 'block' : 'none';
        }
        
        if (this.toggleButton) {
            const chevron = this.toggleButton.querySelector('span:last-child');
            if (chevron) {
                chevron.textContent = this.isExpanded ? '▲' : '▼';
            }
        }
    }

    /**
     * Handle button click
     * 
     * Processes button clicks and executes the corresponding action.
     * 
     * @param {Event} event - Click event
     * @example
     * this.handleButtonClick(event);
     */
    async handleButtonClick(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        
        if (!action) {
            console.error('No action defined for button:', button.id);
            return;
        }
        
        try {
            // Disable button during execution
            button.disabled = true;
            const originalText = button.querySelector('.text').textContent;
            button.querySelector('.text').textContent = 'Verarbeite...';
            
            // Execute the action
            await this.executeAction(action);
            
        } catch (error) {
            console.error(`Error executing action ${action}:`, error);
            this.manager.showError(`Fehler beim Ausführen von ${action}`);
        } finally {
            // Re-enable button
            button.disabled = false;
            button.querySelector('.text').textContent = originalText;
        }
    }

    /**
     * Execute advanced action
     * 
     * Executes the specified advanced action.
     * 
     * @param {string} action - Action to execute
     * @async
     * @example
     * await this.executeAction('TRANSLATE');
     */
    async executeAction(action) {
        switch (action) {
            case 'TRANSLATE':
                await this.manager.executeAIAction('TRANSLATE_EMAIL');
                break;
                
            case 'EXTRACT_INFO':
                await this.manager.executeAIAction('EXTRACT_INFO');
                break;
                
            case 'CHECK_SPAM':
                await this.manager.executeAIAction('CHECK_SPAM');
                break;
                
            case 'FIND_SIMILAR':
                await this.manager.executeAIAction('FIND_SIMILAR');
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    /**
     * Show advanced section
     * 
     * Shows the advanced actions section.
     * 
     * @example
     * this.showAdvanced();
     */
    showAdvanced() {
        if (!this.isExpanded) {
            this.toggleAdvanced();
        }
    }

    /**
     * Hide advanced section
     * 
     * Hides the advanced actions section.
     * 
     * @example
     * this.hideAdvanced();
     */
    hideAdvanced() {
        if (this.isExpanded) {
            this.toggleAdvanced();
        }
    }

    /**
     * Enable/disable buttons
     * 
     * Enables or disables all advanced action buttons.
     * 
     * @param {boolean} enabled - Whether to enable buttons
     * @example
     * this.setButtonsEnabled(false);
     */
    setButtonsEnabled(enabled) {
        Object.values(this.buttons).forEach(button => {
            button.disabled = !enabled;
        });
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
        // Remove event listeners
        if (this.toggleButton) {
            this.toggleButton.removeEventListener('click', this.toggleAdvanced);
        }
        
        Object.values(this.buttons).forEach(button => {
            button.removeEventListener('click', this.handleButtonClick);
        });
        
        this.buttons = {};
    }
};

/**
 * Make AdvancedActionsComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.AdvancedActionsComponent = AdvancedActionsComponent;
} 