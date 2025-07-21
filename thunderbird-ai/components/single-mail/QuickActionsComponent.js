/**
 * QuickActionsComponent - Manages quick action buttons
 * 
 * Handles the creation and management of quick action buttons for email processing.
 * Each button has a specific AI action associated with it.
 * 
 * @example
 * const quickActions = new QuickActionsComponent(manager);
 * quickActions.initialize();
 */
const QuickActionsComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference and button definitions.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const quickActions = new QuickActionsComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.quickActionsGrid;
        this.buttons = {};
        
        // Define quick actions with their properties
        this.actions = [
            {
                id: 'summarizeBtn',
                icon: '📄',
                text: 'Zusammenfassen',
                shortcut: 'Strg+Alt+S',
                action: 'SUMMARIZE',
                className: 'primary',
                description: 'Erstellt eine kurze Zusammenfassung der E-Mail'
            },
            {
                id: 'replyBtn',
                icon: '✍️',
                text: 'Antwort vorschlagen',
                shortcut: 'Strg+Alt+R',
                action: 'SUGGEST_REPLY',
                description: 'Schlägt eine passende Antwort vor'
            },
            {
                id: 'categorizeBtn',
                icon: '📂',
                text: 'Kategorisieren',
                shortcut: 'Strg+Alt+C',
                action: 'CATEGORIZE',
                description: 'Kategorisiert die E-Mail automatisch'
            },
            {
                id: 'importanceBtn',
                icon: '⚡',
                text: 'Wichtigkeit prüfen',
                action: 'CHECK_IMPORTANCE',
                description: 'Bewertet die Wichtigkeit der E-Mail'
            },
            {
                id: 'chatBtn',
                icon: '💬',
                text: 'AI Chat',
                action: 'OPEN_CHAT',
                description: 'Öffnet einen AI-Chat für die E-Mail'
            },
            {
                id: 'testBtn',
                icon: '🧪',
                text: 'Test Button',
                action: 'TEST',
                className: 'test',
                description: 'Testet die API-Verbindung'
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
     * Dynamically creates all quick action buttons based on the actions definition.
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
     * @param {string} actionDef.id - Button ID
     * @param {string} actionDef.icon - Button icon
     * @param {string} actionDef.text - Button text
     * @param {string} actionDef.shortcut - Keyboard shortcut
     * @param {string} actionDef.action - AI action to execute
     * @param {string} actionDef.className - CSS class name
     * @param {string} actionDef.description - Button description
     * @returns {HTMLElement} Created button element
     * @example
     * const button = this.createButton({ id: 'summarizeBtn', icon: '📄', text: 'Zusammenfassen' });
     */
    createButton(actionDef) {
        const button = document.createElement('button');
        button.id = actionDef.id;
        button.className = `button ${actionDef.className || ''}`;
        button.title = actionDef.description;
        
        button.innerHTML = `
            <span class="icon">${actionDef.icon}</span>
            <span class="text">${actionDef.text}</span>
            ${actionDef.shortcut ? `<span class="shortcut">${actionDef.shortcut}</span>` : ''}
        `;
        
        // Store action data for event handling
        button.dataset.action = actionDef.action;
        
        return button;
    }

    /**
     * Attach event listeners
     * 
     * Sets up click handlers for all buttons and keyboard shortcuts.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        // Add click listeners to all buttons
        Object.values(this.buttons).forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e);
            });
        });
        
        // Add keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    /**
     * Handle button click
     * 
     * Processes button clicks and executes the corresponding AI action.
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
        
        // Store original text outside try block
        const originalText = button.querySelector('.text').textContent;
        
        try {
            // Disable button during execution
            button.disabled = true;
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
     * Execute AI action
     * 
     * Executes the specified AI action through the manager.
     * 
     * @param {string} action - Action to execute
     * @async
     * @example
     * await this.executeAction('SUMMARIZE');
     */
    async executeAction(action) {
        switch (action) {
            case 'SUMMARIZE':
                await this.manager.executeAIAction('SUMMARIZE_EMAIL');
                break;
                
            case 'SUGGEST_REPLY':
                await this.manager.executeAIAction('SUGGEST_REPLY');
                break;
                
            case 'CATEGORIZE':
                await this.manager.executeAIAction('CATEGORIZE_EMAIL');
                break;
                
            case 'CHECK_IMPORTANCE':
                await this.manager.executeAIAction('CHECK_IMPORTANCE');
                break;
                
            case 'OPEN_CHAT':
                await this.openAIChat();
                break;
                
            case 'TEST':
                await this.testAPI();
                break;
                
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    /**
     * Open AI chat
     * 
     * Opens an AI chat interface for the current email.
     * 
     * @async
     * @example
     * await this.openAIChat();
     */
    async openAIChat() {
        try {
            // For now, just show a message
            this.manager.updateStatus('AI Chat wird implementiert...', 'info');
            this.manager.log('AI Chat feature not yet implemented', 'warning');
            
            // TODO: Implement chat interface
            // This could open a new window or overlay with chat functionality
            
        } catch (error) {
            console.error('Error opening AI chat:', error);
            this.manager.showError('Fehler beim Öffnen des AI Chats');
        }
    }

    /**
     * Test API connection
     * 
     * Tests the API connection and shows the result.
     * 
     * @async
     * @example
     * await this.testAPI();
     */
    async testAPI() {
        try {
            const response = await this.manager.sendToBackground('testApiConnection');
            
            if (response && response.success) {
                this.manager.updateStatus('API-Verbindung erfolgreich!', 'success');
                this.manager.log('API test successful', 'success');
            } else {
                throw new Error(response?.error || 'API test failed');
            }
            
        } catch (error) {
            console.error('API test error:', error);
            this.manager.showError('API-Test fehlgeschlagen: ' + error.message);
        }
    }

    /**
     * Setup keyboard shortcuts
     * 
     * Sets up keyboard shortcuts for quick actions.
     * 
     * @example
     * this.setupKeyboardShortcuts();
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Check for Ctrl+Alt combinations
            if (event.ctrlKey && event.altKey) {
                switch (event.key.toLowerCase()) {
                    case 's':
                        event.preventDefault();
                        this.buttons.summarizeBtn?.click();
                        break;
                        
                    case 'r':
                        event.preventDefault();
                        this.buttons.replyBtn?.click();
                        break;
                        
                    case 'c':
                        event.preventDefault();
                        this.buttons.categorizeBtn?.click();
                        break;
                }
            }
        });
    }

    /**
     * Enable/disable buttons
     * 
     * Enables or disables all quick action buttons.
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
     * Get button by ID
     * 
     * Retrieves a button element by its ID.
     * 
     * @param {string} id - Button ID
     * @returns {HTMLElement|null} Button element or null
     * @example
     * const button = this.getButton('summarizeBtn');
     */
    getButton(id) {
        return this.buttons[id] || null;
    }

    /**
     * Update button text
     * 
     * Updates the text of a specific button.
     * 
     * @param {string} id - Button ID
     * @param {string} text - New text
     * @example
     * this.updateButtonText('summarizeBtn', 'Neu zusammenfassen');
     */
    updateButtonText(id, text) {
        const button = this.getButton(id);
        if (button) {
            const textElement = button.querySelector('.text');
            if (textElement) {
                textElement.textContent = text;
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
        // Remove event listeners
        Object.values(this.buttons).forEach(button => {
            button.removeEventListener('click', this.handleButtonClick);
        });
        
        // Clear references
        this.buttons = {};
    }
};

/**
 * Make QuickActionsComponent available globally for non-module environments
 * 
 * This allows the QuickActionsComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.QuickActionsComponent = QuickActionsComponent;
} 