/** Settings, chat, and help navigation in the popup footer. */
const FooterActionsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.footerActions;
        this.actions = [
            { icon: '⚙️', textKey: 'footerSettings', action: 'OPEN_SETTINGS' },
            { icon: '💬', textKey: 'footerChat', action: 'OPEN_CHAT' },
            { icon: '❓', textKey: 'footerHelp', action: 'OPEN_HELP' }
        ];
    }

    initialize() {
        this.container.replaceChildren();
        for (const definition of this.actions) {
            const button = document.createElement('button');
            button.className = 'footer-btn';
            button.innerHTML = `<span class="icon">${definition.icon}</span><span class="text">${I18n.t(definition.textKey)}</span>`;
            button.addEventListener('click', () => this.executeAction(definition.action));
            this.container.appendChild(button);
        }
    }

    async executeAction(action) {
        try {
            if (action === 'OPEN_SETTINGS') {
                await browser.runtime.openOptionsPage();
                window.close();
            } else if (action === 'OPEN_CHAT') {
                this.manager.openChat();
            } else if (action === 'OPEN_HELP') {
                await browser.tabs.create({ url: browser.runtime.getURL('help.html') });
                window.close();
            }
        } catch (error) {
            this.manager.showError(I18n.t('unknownError'));
        }
    }

    cleanup() {}
};

if (typeof window !== 'undefined') {
    window.FooterActionsComponent = FooterActionsComponent;
}
