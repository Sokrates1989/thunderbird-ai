/**
 * Thunderbird AI Assistant - Message Display Component
 * 
 * This module provides the main user interface component for the Thunderbird AI Assistant.
 * It handles email display, user interactions, and AI-powered email processing.
 * 
 * @module MessageDisplayComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Main MessageDisplay class for managing the message display interface
 * 
 * This class handles the main user interface for the Thunderbird AI Assistant.
 * It manages email display, user interactions, AI processing, and result presentation.
 * 
 * @class MessageDisplay
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const MessageDisplay = class {
    /**
     * Initialize the MessageDisplay component
     * 
     * Sets up the component, initializes UI elements, attaches event listeners,
     * and loads the current email message for display.
     * 
     * @constructor
     * @example
     * const messageDisplay = new MessageDisplay();
     */
    constructor() {
        this.currentMessage = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadCurrentMessage();
    }

    /**
     * Initialize UI element references
     * 
     * Gets references to all DOM elements used by the component.
     * This includes buttons, display areas, and form elements.
     * 
     * @example
     * this.initializeElements();
     */
    initializeElements() {
        // Header elements
        this.emailSubject = document.getElementById('emailSubject');
        
        // Email info elements
        this.emailFrom = document.getElementById('emailFrom');
        this.emailDate = document.getElementById('emailDate');
        this.emailSize = document.getElementById('emailSize');
        this.emailStatus = document.getElementById('emailStatus');
        
        // Action buttons
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.replyBtn = document.getElementById('replyBtn');
        this.categorizeBtn = document.getElementById('categorizeBtn');
        this.importanceBtn = document.getElementById('importanceBtn');
        this.testBtn = document.getElementById('testBtn');
        
        // Advanced action buttons
        this.translateBtn = document.getElementById('translateBtn');
        this.extractInfoBtn = document.getElementById('extractInfoBtn');
        this.checkSpamBtn = document.getElementById('checkSpamBtn');
        this.findSimilarBtn = document.getElementById('findSimilarBtn');
        
        // Advanced section
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedContent = document.getElementById('advancedContent');
        
        // Footer buttons
        this.settingsBtn = document.getElementById('settingsBtn');
        this.helpBtn = document.getElementById('helpBtn');
        
        // Results area
        this.resultsArea = document.getElementById('resultsArea');
        this.resultsTitle = document.getElementById('resultsTitle');
        this.resultsContent = document.getElementById('resultsContent');
        this.resultsActions = document.getElementById('resultsActions');
        
        // Status elements
        this.status = document.getElementById('status');
        this.consoleOutput = document.getElementById('consoleOutput');
        
        console.log('All MessageDisplay elements initialized');
    }

    /**
     * Attach event listeners to UI elements
     * 
     * Sets up click handlers, keyboard shortcuts, and other event listeners
     * for user interactions with the interface.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        console.log('Attaching MessageDisplay event listeners...');
        
        // Quick action buttons
        if (this.summarizeBtn) {
            this.summarizeBtn.addEventListener('click', () => this.handleAction('summarize'));
        }
        if (this.replyBtn) {
            this.replyBtn.addEventListener('click', () => this.handleAction('reply'));
        }
        if (this.categorizeBtn) {
            this.categorizeBtn.addEventListener('click', () => this.handleAction('categorize'));
        }
        if (this.importanceBtn) {
            this.importanceBtn.addEventListener('click', () => this.handleAction('importance'));
        }
        if (this.testBtn) {
            this.testBtn.addEventListener('click', () => this.handleTestAction());
        }
        
        // Advanced action buttons
        if (this.translateBtn) {
            this.translateBtn.addEventListener('click', () => this.handleAction('translate'));
        }
        if (this.extractInfoBtn) {
            this.extractInfoBtn.addEventListener('click', () => this.handleAction('extractInfo'));
        }
        if (this.checkSpamBtn) {
            this.checkSpamBtn.addEventListener('click', () => this.handleAction('checkSpam'));
        }
        if (this.findSimilarBtn) {
            this.findSimilarBtn.addEventListener('click', () => this.handleAction('findSimilar'));
        }
        
        // Advanced section toggle
        if (this.advancedToggle && this.advancedContent) {
            this.advancedToggle.addEventListener('click', () => 
                UIUtils.toggleAdvanced(this.advancedToggle, this.advancedContent));
        }
        
        // Footer actions
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', () => this.showHelp());
        }
        
        // Error dialog close button and click outside
        const errorCloseBtn = document.getElementById('errorCloseBtn');
        const errorDialog = document.getElementById('errorDialog');
        
        if (errorCloseBtn) {
            errorCloseBtn.addEventListener('click', () => {
                UIUtils.hideError();
            });
        }
        
        if (errorDialog) {
            // Close dialog when clicking outside
            errorDialog.addEventListener('click', (e) => {
                if (e.target === errorDialog) {
                    UIUtils.hideError();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        console.log('All MessageDisplay event listeners attached');
    }

    /**
     * Load current email message
     * 
     * Retrieves the currently displayed email message from Thunderbird
     * and updates the interface to show its information.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.loadCurrentMessage();
     */
    async loadCurrentMessage() {
        try {
            console.log('Loading current message...');
            
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
            
            if (!displayedMessages || !displayedMessages.messages || displayedMessages.messages.length === 0) {
                console.log('No specific email displayed - showing general interface');
                this.currentMessage = null;
                this.displayGeneralInterface();
                return;
            }
            
            this.currentMessage = displayedMessages.messages[0];
            console.log('Current message:', this.currentMessage);
            await this.displayMessageInfo(this.currentMessage);
            
        } catch (error) {
            console.error('Error loading current message:', error);
            this.currentMessage = null;
            this.displayGeneralInterface();
            UIUtils.showError('Fehler beim Laden der E-Mail: ' + error.message);
        }
    }

    /**
     * Display email message information
     * 
     * Updates the interface to show information about the specified email message.
     * Includes subject, sender, date, size, and status information.
     * 
     * @async
     * @param {Object} message - Email message object to display
     * @returns {Promise<void>}
     * 
     * @example
     * await this.displayMessageInfo(message);
     */
    async displayMessageInfo(message) {
        try {
            // Update header
            this.emailSubject.textContent = message.subject || 'Kein Betreff';
            
            // Update email info
            const metadata = MessageService.extractMetadata(message);
            this.emailFrom.textContent = metadata.author;
            this.emailDate.textContent = metadata.date;
            this.emailSize.textContent = MessageService.formatFileSize(message.size || 0);
            
            // Update status badges
            this.updateStatusBadges(message);
            
        } catch (error) {
            console.error('Error displaying message info:', error);
        }
    }

    /**
     * Display general interface when no email is selected
     * 
     * Shows a general interface with placeholder information
     * when no specific email is currently displayed.
     * 
     * @example
     * this.displayGeneralInterface();
     */
    displayGeneralInterface() {
        this.emailSubject.textContent = 'AI Assistant - Keine E-Mail ausgewählt';
        this.emailFrom.textContent = '-';
        this.emailDate.textContent = '-';
        this.emailSize.textContent = '-';
        this.emailStatus.textContent = 'Bitte öffnen Sie eine E-Mail';
    }

    /**
     * Update status badges for email message
     * 
     * Updates the status display to show important flags and tags
     * associated with the email message.
     * 
     * @param {Object} message - Email message object
     * @example
     * this.updateStatusBadges(message);
     */
    updateStatusBadges(message) {
        const status = [];
        
        if (message.flagged) status.push('⭐ Wichtig');
        if (message.hasAttachments) status.push('📎 Anhänge');
        if (message.tags && message.tags.length > 0) {
            status.push(`🏷️ ${message.tags.join(', ')}`);
        }
        
        this.emailStatus.textContent = status.length > 0 ? status.join(' | ') : 'Normal';
    }

    /**
     * Handle test action
     * 
     * Processes the test button click and sends a test message to the background script.
     * Used for debugging and verifying add-on functionality.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.handleTestAction();
     */
    async handleTestAction() {
        try {
            console.log('Handling test action...');
            
            const result = await this.sendToBackground(CONFIG.ACTIONS.TEST, {
                message: 'Test from MessageDisplay component'
            });
            
            if (result.success) {
                // Show success message in results area
                this.showResults('test', {
                    success: true,
                    message: '🎉 Test erfolgreich! Das Add-on funktioniert!',
                    details: 'Background Script: ' + result.message + '\nTimestamp: ' + result.timestamp
                }, 'test');
                UIUtils.showToast('🎉 Test erfolgreich!', 'success');
                console.log('Test result:', result);
            } else {
                UIUtils.showError('Test fehlgeschlagen: ' + result.error);
            }
        } catch (error) {
            console.error('Error in test action:', error);
            UIUtils.showError('Test fehlgeschlagen: ' + error.message);
        }
    }

    /**
     * Handle general action processing
     * 
     * Processes various email actions like summarization, categorization,
     * reply generation, and other AI-powered features.
     * 
     * @async
     * @param {string} action - Action to perform ('summarize', 'reply', 'categorize', etc.)
     * @returns {Promise<void>}
     * 
     * @example
     * await this.handleAction('summarize');
     * await this.handleAction('reply');
     */
    async handleAction(action) {
        if (this.isProcessing) {
            UIUtils.showToast('Bitte warten Sie, bis die aktuelle Aktion abgeschlossen ist.', 'info');
            return;
        }

        // Check if we have a current message for email-related actions
        if (action !== 'test' && !this.currentMessage) {
            UIUtils.showError('Keine E-Mail ausgewählt. Bitte öffnen Sie eine E-Mail und versuchen Sie es erneut.');
            return;
        }

        try {
            this.isProcessing = true;
            UIUtils.showLoading(`Verarbeite ${action}...`);
            
            let result;
            switch (action) {
                case 'summarize':
                    result = await this.sendToBackground(CONFIG.ACTIONS.SUMMARIZE, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'reply':
                    result = await this.sendToBackground(CONFIG.ACTIONS.REPLY, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'categorize':
                    result = await this.sendToBackground(CONFIG.ACTIONS.CATEGORIZE, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'importance':
                    result = await this.sendToBackground(CONFIG.ACTIONS.IMPORTANCE, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'translate':
                    result = await this.sendToBackground(CONFIG.ACTIONS.TRANSLATE, {
                        messageId: this.currentMessage?.id,
                        targetLanguage: 'english'
                    });
                    break;
                case 'extractInfo':
                    result = await this.sendToBackground(CONFIG.ACTIONS.EXTRACT_INFO, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'checkSpam':
                    result = await this.sendToBackground(CONFIG.ACTIONS.CHECK_SPAM, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                case 'findSimilar':
                    result = await this.sendToBackground(CONFIG.ACTIONS.FIND_SIMILAR, {
                        messageId: this.currentMessage?.id
                    });
                    break;
                default:
                    throw new Error(`Unbekannte Aktion: ${action}`);
            }
            
            if (result.success) {
                this.showResults(this.getActionTitle(action), result, action);
                UIUtils.showToast(`${this.getActionTitle(action)} erfolgreich!`, 'success');
            } else {
                UIUtils.showError(`Fehler bei ${this.getActionTitle(action)}: ${result.error}`);
            }
            
        } catch (error) {
            console.error(`Error in ${action} action:`, error);
            UIUtils.showError(`Fehler bei ${this.getActionTitle(action)}: ${error.message}`);
        } finally {
            this.isProcessing = false;
            UIUtils.hideLoading();
        }
    }

    /**
     * Show results in the results area
     * 
     * Displays the results of AI processing in the results area.
     * Formats the content appropriately based on the action type.
     * 
     * @param {string} title - Title for the results
     * @param {Object} result - Result object from background script
     * @param {string} action - Action that was performed
     * @example
     * this.showResults('Zusammenfassung', result, 'summarize');
     */
    showResults(title, result, action) {
        // Show results area
        this.resultsArea.style.display = 'block';
        this.resultsTitle.textContent = title;
        
        // Clear previous content
        this.resultsContent.innerHTML = '';
        this.resultsActions.innerHTML = '';
        
        // Format and display content
        let content = '';
        switch (action) {
            case 'summarize':
                content = result.summary || result.content || 'Keine Zusammenfassung verfügbar';
                break;
            case 'reply':
                content = result.reply || 'Kein Antwortvorschlag verfügbar';
                break;
            case 'categorize':
                content = `Kategorie: ${result.category || 'Unbekannt'}\nKonfidenz: ${result.confidence || 0}%`;
                break;
            case 'importance':
                content = `Wichtigkeit: ${result.importance || 'Normal'}\nKonfidenz: ${result.confidence || 0}%`;
                break;
            case 'test':
                content = result.message + '\n\n' + (result.details || '');
                break;
            default:
                content = JSON.stringify(result, null, 2);
        }
        
        // Format content with HTML
        const formattedContent = UIUtils.formatSummaryText(content);
        this.resultsContent.innerHTML = formattedContent;
        
        // Add action buttons
        this.addResultActions(result, action);
    }

    /**
     * Add action buttons to results
     * 
     * Adds context-specific action buttons to the results area.
     * Includes copy, reply, and other relevant actions.
     * 
     * @param {Object} result - Result object from background script
     * @param {string} action - Action that was performed
     * @example
     * this.addResultActions(result, 'summarize');
     */
    addResultActions(result, action) {
        // Copy button
        this.addResultAction('📋 Kopieren', () => {
            let textToCopy = '';
            switch (action) {
                case 'summarize':
                    textToCopy = result.summary || result.content || '';
                    break;
                case 'reply':
                    textToCopy = result.reply || '';
                    break;
                default:
                    textToCopy = JSON.stringify(result, null, 2);
            }
            this.copyToClipboard(textToCopy);
        });
        
        // Action-specific buttons
        if (action === 'reply' && result.reply) {
            this.addResultAction('✍️ Antwort erstellen', () => {
                this.openReplyComposer(result.reply);
            });
        }
        
        if (action === 'categorize' && result.category) {
            this.addResultAction('🏷️ Kategorie anwenden', () => {
                this.applyCategory(result.category);
            });
        }
        
        if (action === 'importance' && result.importance === 'high') {
            this.addResultAction('⭐ Als wichtig markieren', () => {
                this.markAsImportant();
            });
        }
    }

    /**
     * Add a single action button to results
     * 
     * Creates and adds a single action button to the results actions area.
     * 
     * @param {string} text - Button text
     * @param {Function} callback - Click callback function
     * @example
     * this.addResultAction('Copy', () => copyToClipboard(text));
     */
    addResultAction(text, callback) {
        const button = UIUtils.createActionButton(text, callback);
        this.resultsActions.appendChild(button);
    }

    /**
     * Copy text to clipboard
     * 
     * Copies the specified text to the user's clipboard and shows feedback.
     * 
     * @async
     * @param {string} text - Text to copy to clipboard
     * @returns {Promise<void>}
     * 
     * @example
     * await this.copyToClipboard('Text to copy');
     */
    async copyToClipboard(text) {
        const success = await UIUtils.copyToClipboard(text);
        if (success) {
            UIUtils.showToast('In Zwischenablage kopiert!', 'success');
        } else {
            UIUtils.showError('Fehler beim Kopieren');
        }
    }

    /**
     * Open reply composer
     * 
     * Opens Thunderbird's reply composer with the specified reply text.
     * 
     * @async
     * @param {string} replyText - Reply text to include in composer
     * @returns {Promise<void>}
     * 
     * @example
     * await this.openReplyComposer('Thank you for your email...');
     */
    async openReplyComposer(replyText) {
        try {
            await browser.compose.beginReply(this.currentMessage.id, 'replyToSender', {
                body: replyText
            });
            window.close();
        } catch (error) {
            console.error('Error opening reply composer:', error);
            UIUtils.showError('Fehler beim Öffnen des Antwort-Editors');
        }
    }

    /**
     * Improve reply text using AI
     * 
     * Uses AI to improve and enhance reply text before sending.
     * 
     * @async
     * @param {string} text - Original reply text
     * @returns {Promise<string>} Improved reply text
     * 
     * @example
     * const improvedText = await this.improveReplyText('Original reply');
     */
    async improveReplyText(text) {
        try {
            const result = await this.sendToBackground(CONFIG.ACTIONS.IMPROVE_TEXT, {
                text: text,
                type: 'reply'
            });
            
            if (result.success) {
                return result.improvedText;
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error improving reply text:', error);
            return text; // Return original text if improvement fails
        }
    }

    /**
     * Apply category to email
     * 
     * Applies the specified category tag to the current email message.
     * 
     * @async
     * @param {string} category - Category to apply
     * @returns {Promise<void>}
     * 
     * @example
     * await this.applyCategory('wichtig');
     */
    async applyCategory(category) {
        try {
            await MessageService.updateMessageTags(this.currentMessage.id, [category]);
            UIUtils.showToast(`Kategorie "${category}" angewendet!`, 'success');
        } catch (error) {
            console.error('Error applying category:', error);
            UIUtils.showError('Fehler beim Anwenden der Kategorie');
        }
    }

    /**
     * Mark email as important
     * 
     * Flags the current email message as important.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.markAsImportant();
     */
    async markAsImportant() {
        try {
            await MessageService.markAsImportant(this.currentMessage.id);
            UIUtils.showToast('E-Mail als wichtig markiert!', 'success');
            this.updateStatusBadges(this.currentMessage);
        } catch (error) {
            console.error('Error marking as important:', error);
            UIUtils.showError('Fehler beim Markieren als wichtig');
        }
    }

    /**
     * Show email attachments
     * 
     * Displays information about email attachments in the results area.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.showAttachments();
     */
    async showAttachments() {
        if (!this.currentMessage || !this.currentMessage.hasAttachments) {
            UIUtils.showToast('Keine Anhänge verfügbar', 'info');
            return;
        }
        
        try {
            const attachments = await MessageService.getAttachments(this.currentMessage.id);
            let content = '**Anhänge:**\n\n';
            
            attachments.forEach(attachment => {
                content += `📎 ${attachment.name} (${MessageService.formatFileSize(attachment.size)})\n`;
            });
            
            this.showResults('attachments', { content }, 'attachments');
        } catch (error) {
            console.error('Error showing attachments:', error);
            UIUtils.showError('Fehler beim Laden der Anhänge');
        }
    }

    /**
     * Open settings page
     * 
     * Opens the add-on settings page in a new tab.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.openSettings();
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
            UIUtils.showError('Fehler beim Öffnen der Einstellungen');
        }
    }

    /**
     * Show help information
     * 
     * Displays help information in the results area.
     * 
     * @example
     * this.showHelp();
     */
    showHelp() {
        const helpContent = `
            **Thunderbird AI Assistant - Hilfe**
            
            **Schnellaktionen:**
            • 📄 Zusammenfassen: Erstellt eine KI-Zusammenfassung der E-Mail
            • ✍️ Antwort vorschlagen: Generiert einen Antwortvorschlag
            • 📂 Kategorisieren: Kategorisiert die E-Mail automatisch
            • ⚡ Wichtigkeit prüfen: Bewertet die Dringlichkeit
            
            **Tastenkürzel:**
            • Strg+Alt+S: Zusammenfassen
            • Strg+Alt+R: Antwort vorschlagen
            • Strg+Alt+C: Kategorisieren
            
            **Einstellungen:**
            Konfigurieren Sie Ihren OpenAI API-Schlüssel in den Einstellungen für erweiterte Funktionen.
        `;
        
        this.showResults('help', { content: helpContent }, 'help');
    }

    /**
     * Handle keyboard shortcuts
     * 
     * Processes keyboard events for global shortcuts.
     * Supports Ctrl+Alt combinations for quick actions.
     * 
     * @param {KeyboardEvent} e - Keyboard event object
     * @example
     * document.addEventListener('keydown', (e) => this.handleKeyboard(e));
     */
    handleKeyboard(e) {
        const shortcuts = {
            's': () => this.handleAction('summarize'),
            'r': () => this.handleAction('reply'),
            'c': () => this.handleAction('categorize'),
            'i': () => this.handleAction('importance')
        };
        
        UIUtils.handleKeyboardShortcuts(e, shortcuts);
    }

    /**
     * Send message to background script
     * 
     * Sends a message to the background script and waits for a response.
     * Used for all communication with the background script.
     * 
     * @async
     * @param {string} action - Action to perform
     * @param {Object} data - Data to send with the message
     * @returns {Promise<Object>} Response from background script
     * 
     * @example
     * const result = await this.sendToBackground('summarize', { messageId: 'msg123' });
     */
    async sendToBackground(action, data) {
        try {
            return await browser.runtime.sendMessage({
                action: action,
                ...data
            });
        } catch (error) {
            console.error('Error sending message to background:', error);
            throw error;
        }
    }

    /**
     * Get action title for display
     * 
     * Returns a human-readable title for the specified action.
     * Used for displaying action names in the interface.
     * 
     * @param {string} action - Action identifier
     * @returns {string} Human-readable action title
     * 
     * @example
     * const title = this.getActionTitle('summarize'); // Returns '📄 E-Mail Zusammenfassung'
     */
    getActionTitle(action) {
        const titles = {
            'summarize': '📄 E-Mail Zusammenfassung',
            'reply': '✍️ Antwortvorschlag',
            'categorize': '📂 Kategorisierung',
            'importance': '⚡ Wichtigkeitsanalyse',
            'translate': '🌐 Übersetzung',
            'extractInfo': '🔍 Informationsextraktion',
            'checkSpam': '🛡️ Spam-Prüfung',
            'findSimilar': '🔗 Ähnliche E-Mails',
            'attachments': '📎 Anhänge',
            'help': '❓ Hilfe',
            'test': '🧪 Test Ergebnis'
        };
        return titles[action] || action;
    }
};

/**
 * Make MessageDisplay available globally for non-module environments
 * 
 * This allows the MessageDisplay to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.MessageDisplay = MessageDisplay;
} 