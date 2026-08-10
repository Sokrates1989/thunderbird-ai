/** Safely renders AI results and runs their follow-up actions. */
const ResultsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.resultsArea;
        this.elements = {
            title: document.getElementById('resultsTitle'),
            content: document.getElementById('resultsContent'),
            actions: document.getElementById('resultsActions')
        };
        this.currentResult = null;
    }

    initialize() {}

    showResults(result) {
        this.currentResult = result;
        this.elements.title.textContent = result?.title || I18n.t('resultsDefault');
        this.elements.content.textContent = result?.content || I18n.t('noResults');
        this.createActionButtons(result?.actions || []);
        this.container.style.display = 'block';
    }

    createActionButtons(actions) {
        this.elements.actions.replaceChildren();
        for (const action of actions) {
            const button = document.createElement('button');
            button.className = 'result-action-btn';
            button.textContent = action.label || action;
            button.addEventListener('click', () => this.handleAction(action));
            this.elements.actions.appendChild(button);
        }
        for (const message of this.currentResult?.similarMessages || []) {
            const button = document.createElement('button');
            button.className = 'result-action-btn';
            button.textContent = `${I18n.t('openMessage')}: ${message.subject}`;
            button.addEventListener('click', () => this.handleAction({
                type: 'open-message',
                messageId: message.id
            }));
            this.elements.actions.appendChild(button);
        }
    }

    async handleAction(action) {
        try {
            const type = action.type || action;
            if (type === 'copy') {
                await navigator.clipboard.writeText(this.currentResult.content);
                this.manager.updateStatus(I18n.t('copied'), 'success');
            } else if (type === 'save') {
                const saved = await StorageManager.saveResult({
                    title: this.currentResult.title,
                    content: this.currentResult.content,
                    messageId: this.currentResult.messageId,
                    model: this.currentResult.model
                });
                if (!saved) {
                    throw new Error(I18n.t('resultSaveFailed'));
                }
                this.manager.updateStatus(I18n.t('saved'), 'success');
            } else if (type === 'reply') {
                const messageId = this.currentResult.messageId || this.manager.emailId;
                await browser.compose.beginReply(messageId, 'replyToSender', {
                    plainTextBody: this.currentResult.content
                });
                this.manager.updateStatus(I18n.t('replyOpened'), 'success');
            } else if (type === 'open-message') {
                await browser.messageDisplay.open({
                    messageId: action.messageId,
                    location: 'tab'
                });
            }
        } catch (error) {
            this.manager.showError(I18n.t('unknownError'));
        }
    }

    hide() {
        this.container.style.display = 'none';
    }

    clear() {
        this.currentResult = null;
        this.hide();
    }

    cleanup() {
        this.currentResult = null;
    }
};

if (typeof window !== 'undefined') {
    window.ResultsComponent = ResultsComponent;
}
