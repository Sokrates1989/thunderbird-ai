/** Coordinates the single-message popup and its child components. */
const SingleMailManager = class {
    constructor(options = {}) {
        this.emailId = options.emailId || null;
        this.emailData = options.emailData || null;
        this.components = {};
        this.isInitialized = false;
        this.elements = {
            quickActionsGrid: document.getElementById('quickActionsGrid'),
            mailActionsGrid: document.getElementById('mailActionsGrid'),
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
        this.components.mailActions = new MailActionsComponent(this);
        this.components.emailDetails = new EmailDetailsComponent(this);
        this.components.advancedActions = new AdvancedActionsComponent(this);
        this.components.results = new ResultsComponent(this);
        this.components.footerActions = new FooterActionsComponent(this);
        this.components.status = new StatusComponent(this);
        this.components.console = new ConsoleComponent(this);
        this.components.loading = new LoadingComponent(this);
        this.components.errorDialog = new ErrorDialogComponent(this);
        this.components.chat = new ChatComponent(this);
        this.components.replyComposer = new ReplyComposerComponent(this);
    }

    async initialize() {
        try {
            for (const component of Object.values(this.components)) {
                await component.initialize?.();
            }
            await this.loadCurrentEmailData();
            if (this.emailData) {
                this.updateUIWithEmailData();
                await this.restoreSession();
            } else {
                this.showGeneralInterface();
            }
            this.isInitialized = true;
            this.log('SingleMailManager initialized successfully', 'success');

            const parameters = new URLSearchParams(window.location.search);
            if (parameters.get('reply') === '1') {
                await this.openReplyComposer();
            } else if (parameters.get('chat') === '1') {
                await this.openChat();
            } else if (parameters.get('summarize') === '1') {
                await this.executeAIAction('SUMMARIZE_EMAIL');
            }
        } catch (error) {
            console.error('Could not initialize the message UI:', error);
            this.showError(I18n.t('initializeFailed'));
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
        this.components.mailActions.updateMessage?.(this.emailData);
        this.updateStatus(I18n.t('emailLoaded', { subject: this.emailData.subject }));
    }

    /** Restore the latest result and completed chat turns retained for this message. */
    async restoreSession() {
        try {
            const response = await this.sendToBackground(
                CONFIG.ACTIONS.GET_SINGLE_MAIL_SESSION,
                { messageId: this.emailId }
            );
            const session = response?.success ? response.data : null;
            if (session?.result?.data) {
                if (session.result.kind === 'scoring') {
                    this.components.results.showScoring(session.result.data);
                } else {
                    this.components.results.showResults(session.result.data);
                }
            }
            this.components.chat.restore(session?.chatHistory || []);
        } catch (error) {
            this.log(`Could not restore the single-mail session: ${error.message}`, 'warning');
        }
    }

    showGeneralInterface() {
        this.components.header.updateEmailSubject?.(I18n.t('noEmailSelectedTitle'));
        this.components.emailDetails.updateEmailData?.({
            from: '-',
            subject: I18n.t('noEmailSelected'),
            date: '-',
            size: 0,
            status: I18n.t('openEmailPrompt')
        });
        this.components.quickActions.setButtonsEnabled(false);
        this.components.mailActions.setButtonsEnabled(false);
        this.components.advancedActions.setButtonsEnabled(false);
        this.updateStatus(I18n.t('messageNotFound'), 'warning');
    }

    async sendToBackground(action, data = {}) {
        return RetryService.sendRuntimeMessage({ action, ...data });
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
                const message = response?.error || I18n.t('unknownError');
                this.showError(message);
                this.updateStatus(message, 'error');
                return null;
            }
            this.components.results.showResults(response.data);
            this.updateStatus(I18n.t('actionCompleted', { title: response.data.title }), 'success');
            return response.data;
        } catch (error) {
            console.error('AI action failed:', error);
            const message = I18n.t('unknownError');
            this.showError(message);
            this.updateStatus(message, 'error');
            error.uiShown = true;
            throw error;
        } finally {
            this.showLoading(false);
        }
    }

    async scoreCurrentEmail() {
        if (this.emailId === undefined || this.emailId === null) {
            throw new Error(I18n.t('messageNotFound'));
        }
        this.showLoading(true);
        this.updateStatus(I18n.t('singleScoreLoading'));
        try {
            const response = await this.sendToBackground(CONFIG.ACTIONS.SCORE_MESSAGE, {
                messageId: this.emailId
            });
            if (!response?.success) {
                throw new Error(response?.error || I18n.t('singleScoreFailed'));
            }
            this.components.results.showScoring(response.data);
            this.updateStatus(I18n.t('singleScoreReady'), 'success');
            return response.data;
        } finally {
            this.showLoading(false);
        }
    }

    /** Open chat in a roomy durable tab, with an in-page fallback for launch failures. */
    async openChat() {
        if (this.emailId === undefined || this.emailId === null) {
            this.showError(I18n.t('messageNotFound'));
            return;
        }
        const parameters = new URLSearchParams(window.location.search);
        if (parameters.get('chat') !== '1' && parameters.get('view') !== 'window') {
            try {
                await SingleMailWorkspaceService.openExpanded(
                    this.emailId,
                    'chat',
                    'single-mail-action'
                );
                return;
            } catch (error) {
                this.log(`Could not open chat workspace tab: ${error.message}`, 'warning');
            }
        }
        this.components.chat.open();
    }

    /** Move the current message and requested AI workspace into a durable Thunderbird tab. */
    async openExpandedView() {
        if (this.emailId === undefined || this.emailId === null) {
            throw new Error(I18n.t('messageNotFound'));
        }
        const parameters = new URLSearchParams(window.location.search);
        const mode = ['reply', 'chat', 'summarize']
            .find(candidate => parameters.get(candidate) === '1') || null;
        await SingleMailWorkspaceService.openExpanded(this.emailId, mode, 'manual');
        window.close();
    }

    /** Return from the durable workspace to the source message and its compact overlay. */
    async returnToOverlay() {
        return SingleMailWorkspaceService.returnToOverlay(this.emailId);
    }

    /** Switch the current document to another single-mail container. */
    async switchView(mode) {
        if (mode === 'overlay') {
            return this.returnToOverlay();
        }
        if (mode === 'window') {
            return this.openPersistentWindowView();
        }
        if (mode === 'tab') {
            return this.openExpandedView();
        }
        throw new Error(`Unsupported single-mail view: ${mode}`);
    }

    /** Open the non-modal compact window and close the document that launched it. */
    async openPersistentWindowView() {
        if (this.emailId === undefined || this.emailId === null) {
            throw new Error(I18n.t('messageNotFound'));
        }
        await SingleMailWorkspaceService.openPersistentWindow(
            this.emailId,
            'manual-switch'
        );
        await this.closeCurrentView();
    }

    /** Close an expanded Thunderbird tab explicitly and popup documents through window.close. */
    async closeCurrentView() {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view === 'expanded' && typeof browser.tabs.getCurrent === 'function') {
            const current = await browser.tabs.getCurrent();
            if (current?.id !== undefined) {
                await browser.tabs.remove(current.id);
                return;
            }
        }
        window.close();
    }

    /** Open the durable reply workspace in a Thunderbird tab, with an in-page fallback. */
    async openReplyComposer() {
        if (this.emailId === undefined || this.emailId === null) {
            this.showError(I18n.t('messageNotFound'));
            return;
        }
        const parameters = new URLSearchParams(window.location.search);
        if (parameters.get('reply') !== '1' && parameters.get('view') !== 'window') {
            try {
                await SingleMailWorkspaceService.openExpanded(
                    this.emailId,
                    'reply',
                    'single-mail-action'
                );
                return;
            } catch (error) {
                this.log(`Could not open reply workspace tab: ${error.message}`, 'warning');
            }
        }
        await this.components.replyComposer.open();
    }

    /** Clear retained chat state after the chat component confirms a restart. */
    async clearChatSession() {
        const response = await this.sendToBackground(CONFIG.ACTIONS.CLEAR_SINGLE_MAIL_CHAT, {
            messageId: this.emailId
        });
        if (!response?.success) {
            throw new Error('The retained single-mail chat could not be cleared.');
        }
    }

    showLoading(show) {
        this.components.loading?.show?.(show);
    }

    updateStatus(message, type = 'info') {
        this.components.status?.updateStatus?.(message, type);
    }

    showError(message, title = I18n.t('errorTitle')) {
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
