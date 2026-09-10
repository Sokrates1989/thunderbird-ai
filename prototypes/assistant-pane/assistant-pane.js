/** Manages message-scoped chat inside the persistent prototype pane. */
const AssistantPaneManager = class {
    constructor() {
        this.tabId = null;
        this.currentMessageId = null;
        this.currentSubject = '';
        this.conversations = new Map();
        this.isSending = false;
        this.sendingMessageId = null;
        this.confirm = message => window.confirm(message);
        this.elements = {
            context: document.getElementById('assistantPaneContext'),
            empty: document.getElementById('assistantPaneEmpty'),
            messages: document.getElementById('assistantPaneMessages'),
            restart: document.getElementById('assistantPaneRestart'),
            close: document.getElementById('assistantPaneClose'),
            summarize: document.getElementById('assistantPaneSummarize'),
            input: document.getElementById('assistantPaneInput'),
            send: document.getElementById('assistantPaneSend')
        };
        this.onDisplayedMessages = (tab, displayed) => {
            if (tab?.id === this.tabId) {
                this.selectDisplayedMessages(displayed);
            }
        };
        this.onSendClick = () => {
            void this.sendFromInput();
        };
        this.onSummarizeClick = () => {
            void this.sendQuestion(I18n.t('assistantPaneSummaryPrompt'));
        };
        this.onRestartClick = () => this.restartConversation();
        this.onCloseClick = () => {
            void this.closePane();
        };
        this.onInputKeyDown = event => this.handleInputKeyDown(event);
    }

    /** Bind controls, resolve the host mail tab, and follow its displayed message. */
    async initialize() {
        this.elements.send.addEventListener('click', this.onSendClick);
        this.elements.summarize.addEventListener('click', this.onSummarizeClick);
        this.elements.restart.addEventListener('click', this.onRestartClick);
        this.elements.close.addEventListener('click', this.onCloseClick);
        this.elements.input.addEventListener('keydown', this.onInputKeyDown);
        browser.messageDisplay.onMessagesDisplayed.addListener(this.onDisplayedMessages);

        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        this.tabId = tab?.id ?? null;
        if (this.tabId === null) {
            this.selectDisplayedMessages([]);
            return;
        }
        const displayed = await browser.messageDisplay.getDisplayedMessages(this.tabId);
        this.selectDisplayedMessages(displayed);
    }

    /** Normalize both array and paginated MessageList event shapes. */
    messageArray(displayed) {
        if (Array.isArray(displayed)) {
            return displayed;
        }
        return Array.isArray(displayed?.messages) ? displayed.messages : [];
    }

    /** Switch context without modifying or replacing Thunderbird's message display. */
    selectDisplayedMessages(displayed) {
        const [message] = this.messageArray(displayed);
        this.currentMessageId = message?.id ?? null;
        this.currentSubject = message?.subject || I18n.t('noSubject');
        this.elements.context.textContent = this.currentMessageId === null
            ? I18n.t('assistantPaneNoEmail')
            : I18n.t('assistantPaneContext', { subject: this.currentSubject });
        this.renderConversation();
        this.updateControls();
    }

    /** Return the durable in-memory conversation associated with one message. */
    conversationFor(messageId) {
        if (!this.conversations.has(messageId)) {
            this.conversations.set(messageId, []);
        }
        return this.conversations.get(messageId);
    }

    /** Render the selected message's conversation plus any request still in flight. */
    renderConversation() {
        this.elements.messages.replaceChildren();
        const conversation = this.currentMessageId === null
            ? []
            : this.conversationFor(this.currentMessageId);
        for (const entry of conversation) {
            this.elements.messages.appendChild(this.createMessageRow(entry.role, entry.content));
        }
        if (this.isSending && this.sendingMessageId === this.currentMessageId) {
            this.elements.messages.appendChild(this.createPendingRow());
        }
        this.elements.empty.hidden = this.currentMessageId !== null && conversation.length > 0;
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    /** Build one safe message bubble and render Markdown only for successful AI responses. */
    createMessageRow(role, content) {
        const assistantRole = role !== 'user';
        const row = document.createElement('div');
        row.className = `assistant-pane-message-row ${assistantRole ? 'assistant' : 'user'}`;
        const avatar = document.createElement('span');
        avatar.className = 'assistant-pane-avatar';
        avatar.textContent = assistantRole ? '🤖' : '👤';
        avatar.setAttribute('role', 'img');
        avatar.setAttribute('aria-label', I18n.t(
            assistantRole ? 'chatAssistantMessageLabel' : 'chatUserMessageLabel'
        ));
        const bubble = document.createElement('div');
        bubble.className = `assistant-pane-message ${role}`;
        if (role === 'assistant') {
            bubble.classList.add('markdown-content');
            MarkdownRenderer.renderInto(bubble, content);
        } else {
            bubble.textContent = content;
        }
        row.append(avatar, bubble);
        return row;
    }

    /** Show a compact pending row without adding it to reusable chat history. */
    createPendingRow() {
        const row = this.createMessageRow('error', '…');
        row.querySelector('.assistant-pane-message')?.classList.add('pending');
        row.querySelector('.assistant-pane-avatar')?.setAttribute(
            'aria-label',
            I18n.t('chatAssistantWaitingLabel')
        );
        return row;
    }

    /** Keep every control synchronized with message availability and request ownership. */
    updateControls() {
        const available = this.currentMessageId !== null;
        this.elements.input.disabled = !available || this.isSending;
        this.elements.send.disabled = !available || this.isSending;
        this.elements.summarize.disabled = !available || this.isSending;
        const conversation = available ? this.conversationFor(this.currentMessageId) : [];
        this.elements.restart.disabled = this.isSending || conversation.length === 0;
    }

    /** Send on Enter while retaining Shift+Enter and IME composition for editing. */
    handleInputKeyDown(event) {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
            return;
        }
        event.preventDefault();
        void this.sendFromInput();
    }

    /** Read and clear the composer only when a real request can start. */
    async sendFromInput() {
        const query = this.elements.input.value.trim();
        if (!query || this.currentMessageId === null || this.isSending) {
            return;
        }
        this.elements.input.value = '';
        await this.sendQuestion(query);
    }

    /** Send one question with message-scoped history and protect against context changes. */
    async sendQuestion(query) {
        const normalizedQuery = String(query || '').trim();
        if (!normalizedQuery || this.currentMessageId === null || this.isSending) {
            return;
        }
        const messageId = this.currentMessageId;
        const conversation = this.conversationFor(messageId);
        const history = conversation
            .filter(entry => entry.role === 'user' || entry.role === 'assistant')
            .map(entry => ({ role: entry.role, content: entry.content }));
        conversation.push({ role: 'user', content: normalizedQuery });
        this.isSending = true;
        this.sendingMessageId = messageId;
        this.renderConversation();
        this.updateControls();

        try {
            const response = await RetryService.sendRuntimeMessage({
                action: CONFIG.ACTIONS.CHAT,
                messageId,
                query: normalizedQuery,
                history
            });
            conversation.push(response?.success
                ? { role: 'assistant', content: response.data.content }
                : { role: 'error', content: response?.error || I18n.t('unknownError') });
        } catch (error) {
            console.error('Assistant pane chat failed:', error);
            conversation.push({ role: 'error', content: I18n.t('unknownError') });
        } finally {
            this.isSending = false;
            this.sendingMessageId = null;
            this.renderConversation();
            this.updateControls();
            if (this.currentMessageId === messageId) {
                this.elements.input.focus();
            }
        }
    }

    /** Clear only the selected email's chat after explicit confirmation. */
    restartConversation() {
        if (this.currentMessageId === null || this.isSending) {
            return;
        }
        const conversation = this.conversationFor(this.currentMessageId);
        if (!conversation.length || !this.confirm(I18n.t('chatRestartConfirm'))) {
            return;
        }
        this.conversations.delete(this.currentMessageId);
        this.renderConversation();
        this.updateControls();
        this.elements.input.focus();
    }

    /** Ask the privileged boundary to remove this pane from its host mail tab. */
    async closePane() {
        if (this.tabId !== null) {
            await browser.aiAssistantPane.close(this.tabId);
        }
    }

    /** Remove extension listeners when the embedded page is unloaded. */
    cleanup() {
        browser.messageDisplay.onMessagesDisplayed.removeListener(this.onDisplayedMessages);
        this.elements.send.removeEventListener('click', this.onSendClick);
        this.elements.summarize.removeEventListener('click', this.onSummarizeClick);
        this.elements.restart.removeEventListener('click', this.onRestartClick);
        this.elements.close.removeEventListener('click', this.onCloseClick);
        this.elements.input.removeEventListener('keydown', this.onInputKeyDown);
    }
};

globalThis.AssistantPaneManager = AssistantPaneManager;
