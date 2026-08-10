/**
 * Owns the non-AI global toolbar dashboard and renders account-grouped headers.
 * Message data is inserted with textContent to keep untrusted email metadata out
 * of the HTML parsing boundary.
 */
const GlobalDashboardManager = class {
    constructor() {
        this.elements = {
            accounts: document.getElementById('dashboardAccounts'),
            status: document.getElementById('dashboardStatus'),
            refresh: document.getElementById('dashboardRefresh'),
            settings: document.getElementById('dashboardSettings')
        };
        this.dateFormatter = new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    /** Bind the global actions and load the first read-only account snapshot. */
    async initialize() {
        this.elements.refresh.addEventListener('click', () => {
            this.refresh().catch(error => this.showUnexpectedError(error));
        });
        this.elements.settings.addEventListener('click', () => {
            browser.runtime.openOptionsPage().catch(error => this.showUnexpectedError(error));
        });
        await this.refresh();
    }

    async refresh() {
        this.setLoading(true);
        try {
            const accounts = await GlobalMailService.listUnreadByAccount(10);
            this.render(accounts);
            const messageCount = accounts.reduce((total, account) => total + account.messages.length, 0);
            this.setStatus(I18n.t('dashboardLoaded', {
                accounts: accounts.length,
                messages: messageCount
            }));
        } catch (error) {
            console.error('Could not load the global mail dashboard:', error);
            this.elements.accounts.replaceChildren();
            this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        } finally {
            this.setLoading(false);
        }
    }

    render(accounts) {
        this.elements.accounts.replaceChildren();
        if (!accounts.length) {
            this.elements.accounts.appendChild(this.textElement(
                'p',
                'dashboard-empty',
                I18n.t('dashboardNoAccounts')
            ));
            return;
        }
        for (const account of accounts) {
            this.elements.accounts.appendChild(this.renderAccount(account));
        }
    }

    renderAccount(account) {
        const section = document.createElement('section');
        section.className = 'dashboard-account';
        const heading = this.textElement('h2', 'dashboard-account-name', account.accountName);
        const count = this.textElement('span', 'dashboard-account-count', I18n.t('dashboardShownCount', {
            count: account.messages.length
        }));
        const header = document.createElement('div');
        header.className = 'dashboard-account-header';
        header.append(heading, count);
        section.appendChild(header);

        if (account.failed) {
            section.appendChild(this.textElement('p', 'dashboard-account-error', I18n.t('dashboardAccountFailed')));
        } else if (!account.messages.length) {
            section.appendChild(this.textElement('p', 'dashboard-empty', I18n.t('dashboardNoUnread')));
        } else {
            const list = document.createElement('ol');
            list.className = 'dashboard-message-list';
            for (const message of account.messages) {
                list.appendChild(this.renderMessage(message));
            }
            section.appendChild(list);
        }
        return section;
    }

    renderMessage(message) {
        const item = document.createElement('li');
        item.className = 'dashboard-message';
        item.appendChild(this.textElement(
            'div',
            'dashboard-message-subject',
            message.subject || I18n.t('dashboardNoSubject')
        ));
        item.appendChild(this.textElement(
            'div',
            'dashboard-message-meta',
            I18n.t('dashboardMessageMeta', {
                author: message.author || I18n.t('dashboardUnknownSender'),
                date: this.formatDate(message.date)
            })
        ));
        return item;
    }

    formatDate(value) {
        const date = value instanceof Date ? value : new Date(value || 0);
        return Number.isFinite(date.getTime())
            ? this.dateFormatter.format(date)
            : I18n.t('dashboardUnknownDate');
    }

    textElement(tagName, className, text) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        return element;
    }

    setLoading(loading) {
        this.elements.refresh.disabled = loading;
        if (loading) {
            this.setStatus(I18n.t('dashboardLoading'));
        }
    }

    setStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.dataset.type = type;
    }

    showUnexpectedError(error) {
        console.error('Global dashboard action failed:', error);
        this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
    }
};

if (typeof window !== 'undefined') {
    window.GlobalDashboardManager = GlobalDashboardManager;
}
