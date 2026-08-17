/** Creates and runs the popup's primary actions. */
const QuickActionsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.quickActionsGrid;
        this.buttons = {};
        const shortcut = key => `${I18n.t('shortcutControl')}+Alt+${key}`;
        this.actions = [
            { id: 'summarizeBtn', icon: '📄', text: I18n.t('quickSummarize'), shortcut: shortcut('S'), action: 'SUMMARIZE', className: 'ai-action', description: I18n.t('quickSummarizeDescription') },
            { id: 'replyBtn', icon: '✍️', text: I18n.t('quickReply'), shortcut: shortcut('R'), action: 'SUGGEST_REPLY', className: 'ai-action', description: I18n.t('quickReplyDescription') },
            { id: 'chatBtn', icon: '💬', text: I18n.t('quickChat'), action: 'OPEN_CHAT', className: 'ai-action', description: I18n.t('quickChatDescription') },
            { id: 'scoreBtn', icon: '📊', text: I18n.t('quickScoring'), action: 'SCORE', className: 'score-action', description: I18n.t('quickScoringDescription') }
        ];
        this.keydownHandler = event => this.handleShortcut(event);
    }

    initialize() {
        this.container.replaceChildren();
        for (const definition of this.actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.id = definition.id;
            button.className = `button ${definition.className || ''}`;
            button.title = definition.description;
            button.dataset.action = definition.action;
            button.innerHTML = `<span class="icon">${definition.icon}</span><span class="text">${definition.text}</span>${definition.shortcut ? `<span class="shortcut">${definition.shortcut}</span>` : ''}`;
            button.addEventListener('click', event => this.handleButtonClick(event));
            this.container.appendChild(button);
            this.buttons[definition.id] = button;
        }
        document.addEventListener('keydown', this.keydownHandler);
    }

    async handleButtonClick(event) {
        const button = event.currentTarget;
        const originalText = button.querySelector('.text').textContent;
        button.disabled = true;
        button.querySelector('.text').textContent = I18n.t('processing');
        try {
            await this.executeAction(button.dataset.action);
        } catch (error) {
            console.error(`Quick action ${button.dataset.action} failed:`, error);
            if (!error.uiShown) {
                this.manager.showError(error.message);
            }
        } finally {
            button.disabled = false;
            button.querySelector('.text').textContent = originalText;
        }
    }

    async executeAction(action) {
        const actions = {
            SUMMARIZE: 'SUMMARIZE_EMAIL'
        };
        if (actions[action]) {
            return this.manager.executeAIAction(actions[action]);
        }
        if (action === 'OPEN_CHAT') {
            return this.manager.openChat();
        }
        if (action === 'SUGGEST_REPLY') {
            return this.manager.openReplyComposer();
        }
        if (action === 'SCORE') {
            return this.manager.scoreCurrentEmail();
        }
        throw new Error(`Unknown action: ${action}`);
    }

    handleShortcut(event) {
        if (!event.ctrlKey || !event.altKey) {
            return;
        }
        const buttonByKey = { s: 'summarizeBtn', r: 'replyBtn' };
        const button = this.buttons[buttonByKey[event.key.toLowerCase()]];
        if (button) {
            event.preventDefault();
            button.click();
        }
    }

    setButtonsEnabled(enabled) {
        for (const button of Object.values(this.buttons)) {
            button.disabled = !enabled;
        }
    }

    cleanup() {
        document.removeEventListener('keydown', this.keydownHandler);
        this.buttons = {};
    }
};

if (typeof window !== 'undefined') {
    window.QuickActionsComponent = QuickActionsComponent;
}
