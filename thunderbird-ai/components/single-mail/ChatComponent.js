/** Modal, message-scoped AI chat used by both chat entry points. */
const ChatComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.history = [];
        this.elements = {};
        this.isSending = false;
        this.progressTimer = null;
    }

    initialize() {
        const overlay = document.createElement('div');
        overlay.className = 'chat-overlay';
        overlay.hidden = true;
        overlay.innerHTML = `
            <section class="chat-dialog" role="dialog" aria-modal="true" aria-labelledby="chatTitle">
                <div class="chat-header">
                    <h2 id="chatTitle">${I18n.t('chatTitle')}</h2>
                    <button type="button" class="chat-close" aria-label="${I18n.t('chatClose')}">×</button>
                </div>
                <div class="chat-messages" aria-live="polite"></div>
                <div class="chat-composer">
                    <textarea class="chat-input" rows="2" placeholder="${I18n.t('chatPlaceholder')}"></textarea>
                    <button type="button" class="chat-send">${I18n.t('chatSend')}</button>
                </div>
            </section>`;
        document.body.appendChild(overlay);
        this.elements = {
            overlay,
            messages: overlay.querySelector('.chat-messages'),
            input: overlay.querySelector('.chat-input'),
            send: overlay.querySelector('.chat-send'),
            close: overlay.querySelector('.chat-close')
        };
        this.elements.close.addEventListener('click', () => this.close());
        this.elements.send.addEventListener('click', () => this.send());
        this.elements.input.addEventListener('keydown', event => this.handleInputKeydown(event));
    }

    /** Send on Enter while retaining Shift+Enter for intentional line breaks. */
    handleInputKeydown(event) {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
            return;
        }
        event.preventDefault();
        this.send();
    }

    open() {
        this.elements.overlay.hidden = false;
        this.elements.input.focus();
    }

    close() {
        this.elements.overlay.hidden = true;
    }

    async send() {
        const query = this.elements.input.value.trim();
        if (!query || this.isSending) {
            return;
        }
        this.appendMessage('user', query);
        this.elements.input.value = '';
        this.isSending = true;
        this.elements.input.disabled = true;
        this.elements.send.disabled = true;
        const pendingMessage = this.appendPendingMessage();

        try {
            const response = await this.manager.sendToBackground(CONFIG.ACTIONS.CHAT, {
                messageId: this.manager.emailId,
                query,
                history: this.history
            });
            if (!response?.success) {
                this.resolvePendingMessage(
                    pendingMessage,
                    'error',
                    response?.error || I18n.t('unknownError')
                );
                return;
            }
            this.history.push({ role: 'user', content: query });
            this.history.push({ role: 'assistant', content: response.data.content });
            this.resolvePendingMessage(pendingMessage, 'assistant', response.data.content);
        } catch (error) {
            console.error('Email chat failed:', error);
            this.resolvePendingMessage(pendingMessage, 'error', I18n.t('unknownError'));
        } finally {
            this.stopProgress();
            this.isSending = false;
            this.elements.input.disabled = false;
            this.elements.send.disabled = false;
            this.elements.input.focus();
        }
    }

    /** Build one aligned message row with a role-specific avatar and bubble. */
    createMessage(role) {
        const assistantRole = role !== 'user';
        const row = document.createElement('div');
        row.className = `chat-message-row ${assistantRole ? 'assistant' : 'user'}`;
        const avatar = document.createElement('span');
        avatar.className = 'chat-avatar';
        avatar.textContent = assistantRole ? '🤖' : '👤';
        avatar.setAttribute('role', 'img');
        avatar.setAttribute('aria-label', I18n.t(
            assistantRole ? 'chatAssistantMessageLabel' : 'chatUserMessageLabel'
        ));
        const bubble = document.createElement('div');
        bubble.className = `chat-message ${role}`;
        row.append(avatar, bubble);
        this.elements.messages.appendChild(row);
        return { row, avatar, bubble };
    }

    appendMessage(role, content) {
        const message = this.createMessage(role);
        if (role === 'assistant') {
            message.bubble.classList.add('markdown-content');
            MarkdownRenderer.renderInto(message.bubble, content);
        } else {
            message.bubble.textContent = content;
        }
        this.scrollToLatestMessage();
        return message;
    }

    /** Show an assistant bubble immediately and animate one to four waiting dots. */
    appendPendingMessage() {
        this.stopProgress();
        const message = this.createMessage('assistant');
        message.row.classList.add('pending');
        message.bubble.classList.add('chat-pending');
        message.avatar.setAttribute('aria-label', I18n.t('chatAssistantWaitingLabel'));
        const indicator = document.createElement('span');
        indicator.className = 'chat-progress';
        indicator.textContent = '.';
        indicator.setAttribute('aria-hidden', 'true');
        message.bubble.appendChild(indicator);
        let dotCount = 1;
        this.progressTimer = setInterval(() => {
            dotCount = dotCount === 4 ? 1 : dotCount + 1;
            indicator.textContent = '.'.repeat(dotCount);
        }, 350);
        this.scrollToLatestMessage();
        return message;
    }

    /** Replace the waiting bubble in place so the conversation never jumps. */
    resolvePendingMessage(message, role, content) {
        this.stopProgress();
        message.row.className = `chat-message-row ${role === 'user' ? 'user' : 'assistant'}`;
        message.bubble.className = `chat-message ${role}`;
        message.bubble.replaceChildren();
        message.avatar.setAttribute('aria-label', I18n.t(
            role === 'user' ? 'chatUserMessageLabel' : 'chatAssistantMessageLabel'
        ));
        if (role === 'assistant') {
            message.bubble.classList.add('markdown-content');
            MarkdownRenderer.renderInto(message.bubble, content);
        } else {
            message.bubble.textContent = content;
        }
        this.scrollToLatestMessage();
    }

    stopProgress() {
        if (this.progressTimer !== null) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
    }

    scrollToLatestMessage() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    cleanup() {
        this.stopProgress();
        this.elements.overlay?.remove();
        this.history = [];
    }
};

if (typeof window !== 'undefined') {
    window.ChatComponent = ChatComponent;
}
