/**
 * SingleMailManager - Main coordinator for single mail UI components
 * 
 * Manages all UI components for the single mail interface, handles communication
 * with the background script, and coordinates user interactions.
 * 
 * @example
 * const manager = new SingleMailManager();
 * manager.initialize();
 */
const SingleMailManager = class {
    /**
     * Constructor
     * 
     * Initializes the manager with component references and state management.
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.emailId - ID of the email being displayed
     * @param {Object} options.emailData - Email data object
     * @example
     * const manager = new SingleMailManager({ emailId: '123', emailData: {...} });
     */
    constructor(options = {}) {
        this.emailId = options.emailId || null;
        this.emailData = options.emailData || null;
        this.components = {};
        this.isInitialized = false;
        
        // Store element references
        this.elements = {
            quickActionsGrid: document.getElementById('quickActionsGrid'),
            emailInfo: document.getElementById('emailInfo'),
            advancedActionsGrid: document.getElementById('advancedActionsGrid'),
            resultsArea: document.getElementById('resultsArea'),
            footerActions: document.getElementById('footerActions'),
            status: document.getElementById('status'),
            consoleOutput: document.getElementById('consoleOutput')
        };
        
        // Initialize component instances
        this.initializeComponents();
    }

    /**
     * Initialize all UI components
     * 
     * Creates and initializes all component instances.
     * 
     * @example
     * this.initializeComponents();
     */
    initializeComponents() {
        // Initialize each component
        this.components.header = new HeaderComponent(this);
        this.components.quickActions = new QuickActionsComponent(this);
        this.components.emailDetails = new EmailDetailsComponent(this);
        this.components.advancedActions = new AdvancedActionsComponent(this);
        this.components.results = new ResultsComponent(this);
        this.components.footerActions = new FooterActionsComponent(this);
        this.components.status = new StatusComponent(this);
        this.components.console = new ConsoleComponent(this);
        this.components.loading = new LoadingComponent(this);
        this.components.errorDialog = new ErrorDialogComponent(this);
    }

    /**
     * Initialize the manager
     * 
     * Sets up the UI, loads email data, and starts the interface.
     * 
     * @async
     * @example
     * await this.initialize();
     */
    async initialize() {
        try {
            // Initialize all components
            for (const [name, component] of Object.entries(this.components)) {
                if (component.initialize) {
                    await component.initialize();
                }
            }
            
            // Load current email data from Thunderbird context
            await this.loadCurrentEmailData();
            
            // Update UI with email data
            if (this.emailData) {
                await this.updateUIWithEmailData();
            } else {
                // Show general interface if no email is loaded
                this.showGeneralInterface();
            }
            
            this.isInitialized = true;
            this.log('SingleMailManager initialized successfully', 'success');
            
        } catch (error) {
            console.error('Error initializing SingleMailManager:', error);
            this.showError('Fehler beim Initialisieren der Benutzeroberfläche');
        }
    }

    /**
     * Load current email data from Thunderbird context
     * 
     * Retrieves the currently displayed email from Thunderbird.
     * 
     * @async
     * @example
     * await this.loadCurrentEmailData();
     */
    async loadCurrentEmailData() {
        try {
            // If we already have email data, use it
            if (this.emailData) {
                return;
            }
            
            // Get current tab
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', tab);
            
            // Try to get displayed messages
            let displayedMessages;
            try {
                displayedMessages = await browser.messageDisplay.getDisplayedMessages(tab.id);
                console.log('Displayed messages:', displayedMessages);
            } catch (error) {
                console.log('No messageDisplay API available, trying alternative method');
                displayedMessages = { messages: [] };
            }
            
            if (displayedMessages && displayedMessages.messages && displayedMessages.messages.length > 0) {
                this.emailData = displayedMessages.messages[0];
                this.emailId = this.emailData.id;
                console.log('Current email loaded:', this.emailData);
                console.log('Email ID:', this.emailId, 'Type:', typeof this.emailId);
            } else {
                console.log('No email currently displayed');
                this.emailData = null;
                this.emailId = null;
            }
            
        } catch (error) {
            console.error('Error loading current email data:', error);
            this.emailData = null;
            this.emailId = null;
        }
    }

    /**
     * Load email data from background script
     * 
     * Retrieves email data for the current email ID.
     * 
     * @async
     * @example
     * await this.loadEmailData();
     */
    async loadEmailData() {
        try {
            const response = await this.sendToBackground(CONFIG.ACTIONS.GET_EMAIL_DATA, {
                emailId: this.emailId
            });
            
            if (response && response.success) {
                this.emailData = response.data;
            } else {
                throw new Error('Failed to load email data');
            }
        } catch (error) {
            console.error('Error loading email data:', error);
            throw error;
        }
    }

    /**
     * Update UI with email data
     * 
     * Updates all components with the loaded email data.
     * 
     * @async
     * @example
     * await this.updateUIWithEmailData();
     */
    async updateUIWithEmailData() {
        try {
            // Update header with email subject
            if (this.components.header.updateEmailSubject) {
                this.components.header.updateEmailSubject(this.emailData.subject);
            }
            
            // Update email details
            if (this.components.emailDetails.updateEmailData) {
                this.components.emailDetails.updateEmailData(this.emailData);
            }
            
            // Update status
            this.updateStatus('E-Mail geladen: ' + this.emailData.subject);
            
        } catch (error) {
            console.error('Error updating UI with email data:', error);
            this.showError('Fehler beim Aktualisieren der E-Mail-Daten');
        }
    }

    /**
     * Show general interface when no email is selected
     * 
     * Shows a general interface with placeholder information
     * when no specific email is currently displayed.
     * 
     * @example
     * this.showGeneralInterface();
     */
    showGeneralInterface() {
        try {
            // Update header
            if (this.components.header.updateEmailSubject) {
                this.components.header.updateEmailSubject('AI Assistant - Keine E-Mail ausgewählt');
            }
            
            // Update email details with placeholder data
            if (this.components.emailDetails.updateEmailData) {
                this.components.emailDetails.updateEmailData({
                    from: '-',
                    subject: 'Keine E-Mail ausgewählt',
                    date: '-',
                    size: 0,
                    status: 'Bitte öffnen Sie eine E-Mail'
                });
            }
            
            // Update status
            this.updateStatus('Bitte öffnen Sie eine E-Mail', 'info');
            
        } catch (error) {
            console.error('Error showing general interface:', error);
        }
    }

    /**
     * Send message to background script
     * 
     * Sends a message to the background script and waits for response.
     * 
     * @param {string} action - Action to perform
     * @param {Object} data - Data to send
     * @returns {Promise<Object>} Response from background script
     * @example
     * const response = await this.sendToBackground('SUMMARIZE_EMAIL', { emailId: '123' });
     */
    async sendToBackground(action, data = {}) {
        return new Promise((resolve, reject) => {
            try {
                browser.runtime.sendMessage({
                    action: action,
                    ...data
                }).then(response => {
                    resolve(response);
                }).catch(error => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Execute AI action
     * 
     * Executes an AI-powered action on the current email.
     * 
     * @param {string} action - Action to execute
     * @param {Object} options - Action options
     * @async
     * @example
     * await this.executeAIAction('SUMMARIZE', { model: 'gpt-4' });
     */
    async executeAIAction(action, options = {}) {
        try {
            this.showLoading(true);
            this.updateStatus(`Führe ${action} aus...`);
            
            // Map action names to background script actions
            const actionMap = {
                'SUMMARIZE_EMAIL': CONFIG.ACTIONS.SUMMARIZE,
                'SUGGEST_REPLY': CONFIG.ACTIONS.REPLY,
                'CATEGORIZE_EMAIL': CONFIG.ACTIONS.CATEGORIZE,
                'CHECK_IMPORTANCE': CONFIG.ACTIONS.IMPORTANCE,
                'TRANSLATE_EMAIL': CONFIG.ACTIONS.TRANSLATE,
                'EXTRACT_INFO': CONFIG.ACTIONS.EXTRACT_INFO,
                'CHECK_SPAM': CONFIG.ACTIONS.CHECK_SPAM,
                'FIND_SIMILAR': CONFIG.ACTIONS.FIND_SIMILAR
            };
            
            const backgroundAction = actionMap[action] || action;
            
            console.log('Sending action to background:', backgroundAction, 'with messageId:', this.emailId);
            const response = await this.sendToBackground(backgroundAction, {
                messageId: this.emailId,
                ...options
            });
            
            if (response && response.success) {
                // Update results component
                if (this.components.results.showResults) {
                    this.components.results.showResults(response.data || response);
                }
                
                this.updateStatus(`${action} erfolgreich ausgeführt`);
                this.log(`${action} completed successfully`, 'success');
                
            } else {
                throw new Error(response?.error || 'Unknown error');
            }
            
        } catch (error) {
            console.error(`Error executing AI action ${action}:`, error);
            this.showError(`Fehler beim Ausführen von ${action}: ${error.message}`);
            this.updateStatus(`Fehler bei ${action}`);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Show loading overlay
     * 
     * Shows or hides the loading overlay.
     * 
     * @param {boolean} show - Whether to show the overlay
     * @example
     * this.showLoading(true);
     */
    showLoading(show) {
        if (this.components.loading && this.components.loading.show) {
            this.components.loading.show(show);
        }
    }

    /**
     * Update status display
     * 
     * Updates the status message displayed to the user.
     * 
     * @param {string} message - Status message
     * @param {string} type - Status type (info, success, error, warning)
     * @example
     * this.updateStatus('E-Mail wird verarbeitet...', 'info');
     */
    updateStatus(message, type = 'info') {
        if (this.components.status && this.components.status.updateStatus) {
            this.components.status.updateStatus(message, type);
        }
    }

    /**
     * Show error dialog
     * 
     * Displays an error dialog to the user.
     * 
     * @param {string} message - Error message
     * @param {string} title - Error title
     * @example
     * this.showError('Ein Fehler ist aufgetreten', 'Fehler');
     */
    showError(message, title = 'Fehler') {
        if (this.components.errorDialog && this.components.errorDialog.showError) {
            this.components.errorDialog.showError(message, title);
        }
    }

    /**
     * Log message to console
     * 
     * Logs a message to the console component.
     * 
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, success, error, warning)
     * @example
     * this.log('Action completed', 'success');
     */
    log(message, level = 'info') {
        if (this.components.console && this.components.console.log) {
            this.components.console.log(message, level);
        }
    }

    /**
     * Get component by name
     * 
     * Retrieves a component instance by name.
     * 
     * @param {string} name - Component name
     * @returns {Object|null} Component instance or null
     * @example
     * const header = this.getComponent('header');
     */
    getComponent(name) {
        return this.components[name] || null;
    }

    /**
     * Cleanup manager
     * 
     * Performs cleanup when the manager is destroyed.
     * 
     * @example
     * this.cleanup();
     */
    cleanup() {
        // Cleanup all components
        for (const [name, component] of Object.entries(this.components)) {
            if (component.cleanup) {
                component.cleanup();
            }
        }
        
        this.isInitialized = false;
    }
};

/**
 * Make SingleMailManager available globally for non-module environments
 * 
 * This allows the SingleMailManager to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.SingleMailManager = SingleMailManager;
} 