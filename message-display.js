// Message Display Popup Script
class MessageDisplayPopup {
    constructor() {
        console.log('MessageDisplayPopup constructor called');
        this.currentMessage = null;
        this.isProcessing = false;
        this.initializeElements();
        this.attachEventListeners();
        this.loadCurrentMessage();
    }

    initializeElements() {
        console.log('Initializing elements...');
        
        // Header elements
        this.emailSubject = document.getElementById('emailSubject');
        console.log('emailSubject:', this.emailSubject);
        
        // Action buttons
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.replyBtn = document.getElementById('replyBtn');
        this.categorizeBtn = document.getElementById('categorizeBtn');
        this.importanceBtn = document.getElementById('importanceBtn');
        this.chatBtn = document.getElementById('chatBtn');
        this.testBtn = document.getElementById('testBtn');
        
        console.log('testBtn found:', this.testBtn);
        
        // Results area
        this.resultsArea = document.getElementById('resultsArea');
        this.resultsTitle = document.getElementById('resultsTitle');
        this.resultsContent = document.getElementById('resultsContent');
        this.resultsActions = document.getElementById('resultsActions');
        this.closeResults = document.getElementById('closeResults');
        
        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Email info
        this.emailFrom = document.getElementById('emailFrom');
        this.emailDate = document.getElementById('emailDate');
        this.emailSize = document.getElementById('emailSize');
        this.emailStatus = document.getElementById('emailStatus');
        
        // Advanced section
        this.advancedToggle = document.getElementById('advancedToggle');
        this.advancedContent = document.getElementById('advancedContent');
        this.translateBtn = document.getElementById('translateBtn');
        this.extractInfoBtn = document.getElementById('extractInfoBtn');
        this.checkSpamBtn = document.getElementById('checkSpamBtn');
        this.findSimilarBtn = document.getElementById('findSimilarBtn');
        
        // Footer buttons
        this.settingsBtn = document.getElementById('settingsBtn');
        this.chatBtn = document.getElementById('chatBtn');
        this.helpBtn = document.getElementById('helpBtn');
        
        // Error dialog
        this.errorDialog = document.getElementById('errorDialog');
        this.errorMessage = document.getElementById('errorMessage');
        this.errorCloseBtn = document.getElementById('errorCloseBtn');
        
        console.log('All elements initialized');
    }

    attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // Quick action buttons
        if (this.summarizeBtn) {
            this.summarizeBtn.addEventListener('click', () => this.handleAction('summarize'));
            console.log('summarizeBtn listener attached');
        }
        if (this.replyBtn) {
            this.replyBtn.addEventListener('click', () => this.handleAction('reply'));
            console.log('replyBtn listener attached');
        }
        if (this.categorizeBtn) {
            this.categorizeBtn.addEventListener('click', () => this.handleAction('categorize'));
            console.log('categorizeBtn listener attached');
        }
        if (this.importanceBtn) {
            this.importanceBtn.addEventListener('click', () => this.handleAction('importance'));
            console.log('importanceBtn listener attached');
        }
        if (this.testBtn) {
            this.testBtn.addEventListener('click', () => this.handleTestAction());
            console.log('testBtn listener attached');
        } else {
            console.error('testBtn not found!');
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
        if (this.advancedToggle) {
            this.advancedToggle.addEventListener('click', () => this.toggleAdvanced());
        }
        
        // Results area
        if (this.closeResults) {
            this.closeResults.addEventListener('click', () => this.hideResults());
        }
        
        // Footer actions
        if (this.settingsBtn) {
            this.settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (this.chatBtn) {
            this.chatBtn.addEventListener('click', () => this.openChat());
        }
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', () => this.showHelp());
        }
        
        // Error dialog
        if (this.errorCloseBtn) {
            this.errorCloseBtn.addEventListener('click', () => this.hideError());
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        console.log('All event listeners attached');
    }

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
                // Fallback: try to get message from active tab
                displayedMessages = { messages: [] };
            }
            
            if (!displayedMessages || !displayedMessages.messages || displayedMessages.messages.length === 0) {
                console.log('No specific email displayed - showing general interface');
                // No specific email - show general AI chat interface
                this.currentMessage = null;
                this.displayGeneralInterface();
                return;
            }
            
            this.currentMessage = displayedMessages.messages[0];
            console.log('Current message:', this.currentMessage);
            await this.displayMessageInfo(this.currentMessage);
            
        } catch (error) {
            console.error('Error loading current message:', error);
            // Show general interface on error
            this.currentMessage = null;
            this.displayGeneralInterface();
            this.showError('Fehler beim Laden der E-Mail: ' + error.message);
        }
    }

    async displayMessageInfo(message) {
        try {
            // Update header
            this.emailSubject.textContent = message.subject || 'Kein Betreff';
            
            // Update email info
            this.emailFrom.textContent = message.author || 'Unbekannt';
            this.emailDate.textContent = message.date ? 
                new Date(message.date).toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) : 'Unbekannt';
            this.emailSize.textContent = this.formatFileSize(message.size || 0);
            
            // Update status badges
            this.updateStatusBadges(message);
            
        } catch (error) {
            console.error('Error displaying message info:', error);
        }
    }

    displayGeneralInterface() {
        this.emailSubject.textContent = 'AI Assistant - Alle E-Mails';
        this.emailFrom.textContent = 'Allgemeine AI-Funktionen verfügbar';
        this.emailDate.textContent = '';
        this.emailSize.textContent = '';
        this.emailStatus.innerHTML = '<span class="status-badge ready">Bereit</span>';
        
        // Show only general actions (hide email-specific ones)
        this.summarizeBtn.style.display = 'none';
        this.replyBtn.style.display = 'none';
        this.categorizeBtn.style.display = 'none';
        this.importanceBtn.style.display = 'none';
        
        // Highlight chat button
        if (this.chatBtn) {
            this.chatBtn.style.backgroundColor = '#007acc';
            this.chatBtn.style.color = 'white';
        }
    }

    updateStatusBadges(message) {
        this.emailStatus.innerHTML = '';
        
        const badges = [];
        
        if (message.flagged) badges.push({ text: 'Markiert', class: 'flagged' });
        if (!message.read) badges.push({ text: 'Ungelesen', class: 'unread' });
        if (message.junk) badges.push({ text: 'Spam', class: 'spam' });
        if (message.tags && message.tags.length > 0) {
            message.tags.forEach(tag => {
                badges.push({ text: tag, class: 'tag' });
            });
        }
        
        badges.forEach(badge => {
            const badgeEl = document.createElement('span');
            badgeEl.className = `status-badge ${badge.class}`;
            badgeEl.textContent = badge.text;
            this.emailStatus.appendChild(badgeEl);
        });
        
        if (badges.length === 0) {
            const noBadge = document.createElement('span');
            noBadge.className = 'status-badge normal';
            noBadge.textContent = 'Normal';
            this.emailStatus.appendChild(noBadge);
        }
    }

    async handleTestAction() {
        console.log('Test button clicked!');
        
        // Show a simple alert
        alert('🎉 Test erfolgreich! Das Add-on funktioniert!\n\n• JavaScript läuft\n• Event-Handler funktionieren\n• Popup ist aktiv');
        
        // Also show a toast message
        this.showToast('Test erfolgreich! Add-on funktioniert!');
        
        // Try to communicate with background script
        try {
            const result = await this.sendToBackground('testConnection', { message: 'Hello from popup!' });
            console.log('Background response:', result);
            
            if (result && result.success) {
                this.showToast('✅ Kommunikation mit Background-Script funktioniert!');
            } else {
                this.showToast('⚠️ Background-Script Kommunikation fehlgeschlagen');
            }
        } catch (error) {
            console.error('Test communication failed:', error);
            this.showToast('❌ Background-Script Kommunikation fehlgeschlagen');
        }
    }

    async handleAction(action) {
        if (this.isProcessing || !this.currentMessage) {
            return;
        }
        
        this.isProcessing = true;
        this.showLoading();
        
        try {
            let result;
            let resultTitle;
            
            switch (action) {
                case 'summarize':
                    resultTitle = 'E-Mail Zusammenfassung';
                    result = await this.sendToBackground('summarizeMessage', {
                        messageId: this.currentMessage.id
                    });
                    break;
                    
                case 'reply':
                    resultTitle = 'Antwortvorschlag';
                    result = await this.sendToBackground('suggestReply', {
                        messageId: this.currentMessage.id,
                        context: { tone: 'professionell', language: 'deutsch' }
                    });
                    break;
                    
                case 'categorize':
                    resultTitle = 'Kategorisierung';
                    result = await this.sendToBackground('categorizeMessage', {
                        messageId: this.currentMessage.id
                    });
                    break;
                    
                case 'importance':
                    resultTitle = 'Wichtigkeitsprüfung';
                    result = await this.sendToBackground('checkImportance', {
                        messageId: this.currentMessage.id
                    });
                    break;
                    
                case 'translate':
                    resultTitle = 'Übersetzung';
                    result = await this.sendToBackground('improveText', {
                        text: 'E-Mail übersetzen',
                        type: 'translate'
                    });
                    break;
                    
                case 'extractInfo':
                    resultTitle = 'Informationsextraktion';
                    result = await this.sendToBackground('improveText', {
                        text: 'Informationen aus E-Mail extrahieren',
                        type: 'extract'
                    });
                    break;
                    
                case 'checkSpam':
                    resultTitle = 'Spam-Prüfung';
                    result = await this.sendToBackground('categorizeMessage', {
                        messageId: this.currentMessage.id
                    });
                    break;
                    
                case 'findSimilar':
                    resultTitle = 'Ähnliche E-Mails';
                    result = { success: true, message: 'Suche nach ähnlichen E-Mails...' };
                    break;
                    
                default:
                    throw new Error(`Unbekannte Aktion: ${action}`);
            }
            
            if (result.success) {
                this.showResults(resultTitle, result, action);
            } else {
                this.showError(result.error || 'Unbekannter Fehler');
            }
            
        } catch (error) {
            console.error(`Error handling action ${action}:`, error);
            this.showError(`Fehler bei ${action}: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.hideLoading();
        }
    }

    showResults(title, result, action) {
        this.resultsTitle.textContent = title;
        this.resultsContent.innerHTML = '';
        this.resultsActions.innerHTML = '';
        
        // Display result content
        const contentEl = document.createElement('div');
        contentEl.className = 'result-content';
        
        switch (action) {
            case 'summarize':
                contentEl.innerHTML = `<p class="summary-text">${this.escapeHtml(result.summary)}</p>`;
                this.addResultAction('In Zwischenablage kopieren', () => this.copyToClipboard(result.summary));
                break;
                
            case 'reply':
                contentEl.innerHTML = `<div class="reply-preview">${this.escapeHtml(result.reply)}</div>`;
                this.addResultAction('Antwort öffnen', () => this.openReplyComposer(result.reply));
                this.addResultAction('Text verbessern', () => this.improveReplyText(result.reply));
                break;
                
            case 'categorize':
                contentEl.innerHTML = `<p class="category-result">Kategorie: <strong>${this.escapeHtml(result.category)}</strong></p>`;
                this.addResultAction('Kategorie anwenden', () => this.applyCategory(result.category));
                break;
                
            case 'importance':
                const importanceClass = result.importance === 'high' ? 'high' : 'normal';
                contentEl.innerHTML = `<p class="importance-result ${importanceClass}">Wichtigkeit: <strong>${result.importance === 'high' ? 'Hoch' : 'Normal'}</strong></p>`;
                if (result.importance === 'high') {
                    this.addResultAction('Als wichtig markieren', () => this.markAsImportant());
                }
                break;
                
            default:
                contentEl.innerHTML = `<p>${this.escapeHtml(result.message || result.response || 'Aktion erfolgreich ausgeführt')}</p>`;
        }
        
        this.resultsContent.appendChild(contentEl);
        this.resultsArea.style.display = 'block';
        this.resultsArea.scrollIntoView({ behavior: 'smooth' });
    }

    addResultAction(text, callback) {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'result-action-btn';
        actionBtn.textContent = text;
        actionBtn.addEventListener('click', callback);
        this.resultsActions.appendChild(actionBtn);
    }

    hideResults() {
        this.resultsArea.style.display = 'none';
    }

    showLoading() {
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorDialog.style.display = 'flex';
    }

    hideError() {
        this.errorDialog.style.display = 'none';
    }

    toggleAdvanced() {
        const isVisible = this.advancedContent.style.display !== 'none';
        this.advancedContent.style.display = isVisible ? 'none' : 'block';
        const chevron = this.advancedToggle.querySelector('.chevron');
        chevron.textContent = isVisible ? '▼' : '▲';
    }

    async sendToBackground(action, data) {
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ action, ...data })
                .then(resolve)
                .catch(reject);
        });
    }

    // Action handlers
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Text in Zwischenablage kopiert');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('Kopieren fehlgeschlagen');
        }
    }

    async openReplyComposer(replyText) {
        try {
            await browser.compose.beginReply(this.currentMessage.id, 'replyToSender', {
                body: replyText
            });
            window.close();
        } catch (error) {
            console.error('Error opening reply composer:', error);
            this.showError('Fehler beim Öffnen der Antwort: ' + error.message);
        }
    }

    async improveReplyText(text) {
        try {
            const result = await this.sendToBackground('improveText', {
                text: text,
                type: 'general'
            });
            
            if (result.success) {
                this.showResults('Verbesserter Text', { improvedText: result.improvedText }, 'improve');
            }
        } catch (error) {
            console.error('Error improving text:', error);
            this.showError('Fehler bei Textverbesserung: ' + error.message);
        }
    }

    async applyCategory(category) {
        try {
            await browser.messages.update(this.currentMessage.id, {
                tags: [...(this.currentMessage.tags || []), `ai-${category}`]
            });
            this.showToast('Kategorie angewendet');
            await this.loadCurrentMessage(); // Refresh message info
        } catch (error) {
            console.error('Error applying category:', error);
            this.showError('Fehler beim Anwenden der Kategorie: ' + error.message);
        }
    }

    async markAsImportant() {
        try {
            await browser.messages.update(this.currentMessage.id, {
                flagged: true,
                tags: [...(this.currentMessage.tags || []), 'ai-wichtig']
            });
            this.showToast('Als wichtig markiert');
            await this.loadCurrentMessage(); // Refresh message info
        } catch (error) {
            console.error('Error marking as important:', error);
            this.showError('Fehler beim Markieren: ' + error.message);
        }
    }

    async openSettings() {
        try {
            await browser.tabs.create({
                url: browser.runtime.getURL('popup/settings.html')
            });
        } catch (error) {
            console.error('Error opening settings:', error);
        }
    }

    async openChat() {
        try {
            await browser.tabs.create({
                url: browser.runtime.getURL('popup/chat.html')
            });
        } catch (error) {
            console.error('Error opening chat:', error);
        }
    }

    showHelp() {
        alert('Thunderbird AI Assistant\n\nVerwenden Sie die Buttons, um KI-Funktionen auf die aktuell angezeigte E-Mail anzuwenden.\n\nTastaturkürzel:\n- Strg+Alt+S: Zusammenfassen\n- Strg+Alt+R: Antwort vorschlagen\n- Strg+Alt+C: Kategorisieren');
    }

    handleKeyboard(e) {
        if (e.ctrlKey && e.altKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    e.preventDefault();
                    this.handleAction('summarize');
                    break;
                case 'r':
                    e.preventDefault();
                    this.handleAction('reply');
                    break;
                case 'c':
                    e.preventDefault();
                    this.handleAction('categorize');
                    break;
                case 'i':
                    e.preventDefault();
                    this.handleAction('importance');
                    break;
            }
        }
    }

    // Utility functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MessageDisplayPopup();
}); 