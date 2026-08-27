/** Advanced message actions and translation target selection. */
const AdvancedActionsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.advancedActionsGrid;
        this.toggleButton = document.getElementById('advancedToggle');
        this.contentArea = document.getElementById('advancedContent');
        this.buttons = {};
        this.isExpanded = false;
        this.actions = [
            { id: 'translateBtn', icon: '🌐', textKey: 'translate', action: 'TRANSLATE' },
            { id: 'extractInfoBtn', icon: '🔍', textKey: 'extractInfo', action: 'EXTRACT_INFO' },
            { id: 'checkSpamBtn', icon: '🛡️', textKey: 'checkSpam', action: 'CHECK_SPAM' },
            { id: 'findSimilarBtn', icon: '🔗', textKey: 'findSimilar', action: 'FIND_SIMILAR' }
        ];
    }

    initialize() {
        this.toggleButton?.setAttribute('aria-expanded', 'false');
        this.container.replaceChildren();
        const languageControl = document.createElement('label');
        languageControl.className = 'translation-language';
        languageControl.textContent = `${I18n.t('translateTarget')}: `;
        this.languageSelect = document.createElement('select');
        for (const [value, key] of [
            ['de', 'translateGerman'],
            ['en', 'translateEnglish'],
            ['fr', 'translateFrench'],
            ['es', 'translateSpanish']
        ]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = I18n.t(key);
            this.languageSelect.appendChild(option);
        }
        languageControl.appendChild(this.languageSelect);
        this.container.appendChild(languageControl);

        for (const definition of this.actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.id = definition.id;
            button.className = 'button';
            button.dataset.action = definition.action;
            SafeDom.setIconLabel(button, definition.icon, I18n.t(definition.textKey));
            button.addEventListener('click', event => this.handleButtonClick(event));
            this.container.appendChild(button);
            this.buttons[definition.id] = button;
        }
        this.toggleButton?.addEventListener('click', () => this.toggleAdvanced());
    }

    toggleAdvanced() {
        this.isExpanded = !this.isExpanded;
        this.contentArea.style.display = this.isExpanded ? 'block' : 'none';
        this.toggleButton.setAttribute('aria-expanded', String(this.isExpanded));
        this.toggleButton.querySelector('span:last-child').textContent = this.isExpanded ? '▲' : '▼';
    }

    async handleButtonClick(event) {
        const button = event.currentTarget;
        const originalText = button.querySelector('.text').textContent;
        button.disabled = true;
        button.querySelector('.text').textContent = I18n.t('processing');
        try {
            await this.executeAction(button.dataset.action);
        } catch (error) {
            console.error(`Advanced action ${button.dataset.action} failed:`, error);
            if (!error.uiShown) {
                this.manager.showError(error.message);
            }
        } finally {
            button.disabled = false;
            button.querySelector('.text').textContent = originalText;
        }
    }

    executeAction(action) {
        const actions = {
            TRANSLATE: ['TRANSLATE_EMAIL', { targetLanguage: this.languageSelect.value }],
            EXTRACT_INFO: ['EXTRACT_INFO', {}],
            CHECK_SPAM: ['CHECK_SPAM', {}],
            FIND_SIMILAR: ['FIND_SIMILAR', {}]
        };
        if (!actions[action]) {
            throw new Error(`Unknown action: ${action}`);
        }
        return this.manager.executeAIAction(...actions[action]);
    }

    setButtonsEnabled(enabled) {
        for (const button of Object.values(this.buttons)) {
            button.disabled = !enabled;
        }
        if (this.languageSelect) {
            this.languageSelect.disabled = !enabled;
        }
    }

    cleanup() {
        this.buttons = {};
    }
};

if (typeof window !== 'undefined') {
    window.AdvancedActionsComponent = AdvancedActionsComponent;
}
