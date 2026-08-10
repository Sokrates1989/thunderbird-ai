/** Coordinates the single-message popup and its child components. */
const SingleMailManager = class {
    constructor(options = {}) {
        this.emailId = options.emailId || null;
        this.emailData = options.emailData || null;
        this.components = {};
        this.isInitialized = false;
        this.elements = {
            quickActionsGrid: document.getElementById('quickActionsGrid'),
            emailInfo: document.getElementById('emailInfo'),
            advancedActionsGrid: document.getElementById('advancedActionsGrid'),
            resultsArea: document.getElementById('resultsArea'),
            footerActions: document.getElementById('footerActions'),
            status: document.getElementById('status'),
            consoleOutput: document.getElementById('consoleOutput')
        };
        this.initializeComponents();
    }

    initializeComponents() {
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
        this.components.chat = new ChatComponent(this);
    }

    async initialize() {
        try {
            for (const component of Object.values(this.components)) {
                await component.initialize?.();
            }
            await this.loadCurrentEmailData();
            if (this.emailData) {
                this.updateUIWithEmailData();
                await this.showAutomaticResult();
            } else {
                this.showGeneralInterface();
            }
            this.isInitialized = true;
            this.log('SingleMailManager initialized successfully', 'success');

            if (new URLSearchParams(window.location.search).get('chat') === '1') {
                this.openChat();
            }
        } catch (error) {
            console.error('Could not initialize the message UI:', error);
            this.showError(`Fehler beim Initialisieren: ${error.message}`);
        }
    }

    async loadCurrentEmailData() {
        if (this.emailData) {
            return;
        }

        const requestedId = new URLSearchParams(window.location.search).get('messageId');
        if (requestedId) {
            const parsedId = /^\d+$/u.test(requestedId) ? Number(requestedId) : requestedId;
            this.emailData = await browser.messages.get(parsedId);
            this.emailId = this.emailData?.id || parsedId;
            return;
        }

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            return;
        }
        const displayed = await browser.messageDisplay.getDisplayedMessages(tab.id);
        const messages = Array.isArray(displayed) ? displayed : displayed?.messages;
        this.emailData = messages?.[0] || null;
        this.emailId = this.emailData?.id || null;
    }

    updateUIWithEmailData() {
        this.components.header.updateEmailSubject?.(this.emailData.subject);
        this.components.emailDetails.updateEmailData?.({
            ...this.emailData,
            from: this.emailData.author || this.emailData.from,
            status: this.emailData.flagged ? 'flagged' : (this.emailData.read ? 'read' : 'unread')
        });
        this.updateStatus(`E-Mail geladen: ${this.emailData.subject}`);
    }

    async showAutomaticResult() {
        const response = await this.sendToBackground(CONFIG.ACTIONS.GET_AUTOMATIC_RESULT, {
            messageId: this.emailId
        });
        if (response?.success && response.data) {
            this.components.results.showResults(response.data);
        }
    }

    showGeneralInterface() {
        this.components.header.updateEmailSubject?.('AI Assistant – Keine E-Mail ausgewählt');
        this.components.emailDetails.updateEmailData?.({
            from: '-',
            subject: 'Keine E-Mail ausgewählt',
            date: '-',
            size: 0,
            status: 'Bitte öffnen Sie eine E-Mail'
        });
        this.components.quickActions.setButtonsEnabled(false);
        this.components.advancedActions.setButtonsEnabled(false);
        this.updateStatus(I18n.t('messageNotFound'), 'warning');
    }

    async sendToBackground(action, data = {}) {
        return browser.runtime.sendMessage({ action, ...data });
    }

    async executeAIAction(action, options = {}) {
        if (this.emailId === undefined || this.emailId === null) {
            throw new Error(I18n.t('messageNotFound'));
        }
        this.showLoading(true);
        this.updateStatus(I18n.t('processing'));

        const actionMap = {
            SUMMARIZE_EMAIL: CONFIG.ACTIONS.SUMMARIZE,
            SUGGEST_REPLY: CONFIG.ACTIONS.REPLY,
            CATEGORIZE_EMAIL: CONFIG.ACTIONS.CATEGORIZE,
            CHECK_IMPORTANCE: CONFIG.ACTIONS.IMPORTANCE,
            TRANSLATE_EMAIL: CONFIG.ACTIONS.TRANSLATE,
            EXTRACT_INFO: CONFIG.ACTIONS.EXTRACT_INFO,
            CHECK_SPAM: CONFIG.ACTIONS.CHECK_SPAM,
            FIND_SIMILAR: CONFIG.ACTIONS.FIND_SIMILAR
        };

        try {
            const response = await this.sendToBackground(actionMap[action] || action, {
                messageId: this.emailId,
                ...options
            });
            if (!response?.success) {
                throw new Error(response?.error || 'Unbekannter Fehler');
            }
            this.components.results.showResults(response.data);
            this.updateStatus(`${response.data.title} erstellt.`, 'success');
            return response.data;
        } catch (error) {
            this.showError(error.message);
            this.updateStatus(error.message, 'error');
            error.uiShown = true;
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    openChat() {
        if (this.emailId === undefined || this.emailId === null) {
            this.showError(I18n.t('messageNotFound'));
            return;
        }
        this.components.chat.open();
    }

    showLoading(show) {
        this.components.loading?.show?.(show);
    }

    updateStatus(message, type = 'info') {
        this.components.status?.updateStatus?.(message, type);
    }

    showError(message, title = 'Fehler') {
        this.components.errorDialog?.showError?.(message, title);
    }

    log(message, level = 'info') {
        this.components.console?.log?.(message, level);
    }

    getComponent(name) {
        return this.components[name] || null;
    }

    cleanup() {
        for (const component of Object.values(this.components)) {
            component.cleanup?.();
        }
        this.isInitialized = false;
    }
};

if (typeof window !== 'undefined') {
    window.SingleMailManager = SingleMailManager;
}
