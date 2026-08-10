/** Modal, message-scoped AI chat used by both chat entry points. */
const ChatComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.history = [];
        this.elements = {};
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
                <textarea class="chat-input" rows="3" placeholder="${I18n.t('chatPlaceholder')}"></textarea>
                <button type="button" class="chat-send">${I18n.t('chatSend')}</button>
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
        this.elements.input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                this.send();
            }
        });
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
        if (!query) {
            return;
        }
        this.appendMessage('user', query);
        this.elements.input.value = '';
        this.elements.send.disabled = true;

        try {
            const response = await this.manager.sendToBackground(CONFIG.ACTIONS.CHAT, {
                messageId: this.manager.emailId,
                query,
                history: this.history
            });
            if (!response?.success) {
                this.appendMessage('error', response?.error || I18n.t('unknownError'));
                return;
            }
            this.history.push({ role: 'user', content: query });
            this.history.push({ role: 'assistant', content: response.data.content });
            this.appendMessage('assistant', response.data.content);
        } catch (error) {
            console.error('Email chat failed:', error);
            this.appendMessage('error', I18n.t('unknownError'));
        } finally {
            this.elements.send.disabled = false;
            this.elements.input.focus();
        }
    }

    appendMessage(role, content) {
        const message = document.createElement('div');
        message.className = `chat-message ${role}`;
        message.textContent = content;
        this.elements.messages.appendChild(message);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    cleanup() {
        this.elements.overlay?.remove();
        this.history = [];
    }
};

if (typeof window !== 'undefined') {
    window.ChatComponent = ChatComponent;
}
