/** Creates and runs the popup's primary actions. */
const QuickActionsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.quickActionsGrid;
        this.buttons = {};
        const shortcut = key => `${I18n.t('shortcutControl')}+Alt+${key}`;
        this.actions = [
            { id: 'summarizeBtn', icon: '📄', text: I18n.t('quickSummarize'), shortcut: shortcut('S'), action: 'SUMMARIZE', className: 'primary', description: I18n.t('quickSummarizeDescription') },
            { id: 'replyBtn', icon: '✍️', text: I18n.t('quickReply'), shortcut: shortcut('R'), action: 'SUGGEST_REPLY', description: I18n.t('quickReplyDescription') },
            { id: 'categorizeBtn', icon: '📂', text: I18n.t('quickCategorize'), shortcut: shortcut('C'), action: 'CATEGORIZE', description: I18n.t('quickCategorizeDescription') },
            { id: 'importanceBtn', icon: '⚡', text: I18n.t('quickImportance'), action: 'CHECK_IMPORTANCE', description: I18n.t('quickImportanceDescription') },
            { id: 'chatBtn', icon: '💬', text: I18n.t('quickChat'), action: 'OPEN_CHAT', description: I18n.t('quickChatDescription') },
            { id: 'testBtn', icon: '🧪', text: I18n.t('quickTest'), action: 'TEST', className: 'test', description: I18n.t('quickTestDescription') }
        ];
        this.keydownHandler = event => this.handleShortcut(event);
    }

    initialize() {
        this.container.replaceChildren();
        for (const definition of this.actions) {
            const button = document.createElement('button');
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
            SUMMARIZE: 'SUMMARIZE_EMAIL',
            CATEGORIZE: 'CATEGORIZE_EMAIL',
            CHECK_IMPORTANCE: 'CHECK_IMPORTANCE'
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
        if (action === 'TEST') {
            const response = await this.manager.sendToBackground(CONFIG.ACTIONS.TEST);
            if (!response?.success) {
                throw new Error(response?.message || response?.error || I18n.t('apiTestFailed'));
            }
            this.manager.updateStatus(response.message, 'success');
            return response;
        }
        throw new Error(`Unknown action: ${action}`);
    }

    handleShortcut(event) {
        if (!event.ctrlKey || !event.altKey) {
            return;
        }
        const buttonByKey = { s: 'summarizeBtn', r: 'replyBtn', c: 'categorizeBtn' };
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
