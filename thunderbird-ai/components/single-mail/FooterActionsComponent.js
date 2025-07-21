/**
 * FooterActionsComponent - Manages footer action buttons
 * 
 * Handles the footer action buttons for settings, chat, and help.
 * 
 * @example
 * const footerActions = new FooterActionsComponent(manager);
 * footerActions.initialize();
 */
const FooterActionsComponent = class {
    /**
     * Constructor
     * 
     * Initializes the component with manager reference.
     * 
     * @param {SingleMailManager} manager - Reference to the main manager
     * @example
     * const footerActions = new FooterActionsComponent(manager);
     */
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.footerActions;
        this.buttons = {};
        
        // Define footer actions
        this.actions = [
            {
                id: 'settingsBtn',
                icon: '⚙️',
                text: 'Einstellungen',
                action: 'OPEN_SETTINGS'
            },
            {
                id: 'chatBtn',
                icon: '💬',
                text: 'AI Chat',
                action: 'OPEN_CHAT'
            },
            {
                id: 'helpBtn',
                icon: '❓',
                text: 'Hilfe',
                action: 'OPEN_HELP'
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
     * Dynamically creates all footer action buttons.
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
     * const button = this.createButton({ id: 'settingsBtn', icon: '⚙️', text: 'Einstellungen' });
     */
    createButton(actionDef) {
        const button = document.createElement('button');
        button.id = actionDef.id;
        button.className = 'footer-btn';
        
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
     * Sets up click handlers for all buttons.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        Object.values(this.buttons).forEach(button => {
            button.addEventListener('click', (e) => {
                this.handleButtonClick(e);
            });
        });
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
    handleButtonClick(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;
        
        if (!action) {
            console.error('No action defined for button:', button.id);
            return;
        }
        
        this.executeAction(action);
    }

    /**
     * Execute footer action
     * 
     * Executes the specified footer action.
     * 
     * @param {string} action - Action to execute
     * @example
     * this.executeAction('OPEN_SETTINGS');
     */
    executeAction(action) {
        switch (action) {
            case 'OPEN_SETTINGS':
                this.openSettings();
                break;
                
            case 'OPEN_CHAT':
                this.openChat();
                break;
                
            case 'OPEN_HELP':
                this.openHelp();
                break;
                
            default:
                console.error('Unknown footer action:', action);
        }
    }

    /**
     * Open settings
     * 
     * Opens the settings page.
     * 
     * @example
     * this.openSettings();
     */
    async openSettings() {
        try {
            // Open settings in a new tab
            await browser.tabs.create({
                url: browser.runtime.getURL('settings.html')
            });
            // Close the popup
            window.close();
        } catch (error) {
            console.error('Error opening settings:', error);
            this.manager.showError('Fehler beim Öffnen der Einstellungen');
        }
    }

    /**
     * Open chat
     * 
     * Opens the AI chat interface.
     * 
     * @example
     * this.openChat();
     */
    openChat() {
        // TODO: Implement chat opening
        this.manager.updateStatus('AI Chat wird geöffnet...', 'info');
    }

    /**
     * Open help
     * 
     * Opens the help documentation.
     * 
     * @example
     * this.openHelp();
     */
    openHelp() {
        // TODO: Implement help opening
        this.manager.updateStatus('Hilfe wird geöffnet...', 'info');
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
        Object.values(this.buttons).forEach(button => {
            button.removeEventListener('click', this.handleButtonClick);
        });
        
        this.buttons = {};
    }
};

/**
 * Make FooterActionsComponent available globally for non-module environments
 */
if (typeof window !== 'undefined') {
    window.FooterActionsComponent = FooterActionsComponent;
} 