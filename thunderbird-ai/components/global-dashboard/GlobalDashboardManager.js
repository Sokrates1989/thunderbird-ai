/**
 * Owns the AI-free global toolbar dashboard, its local display preferences,
 * and explicit mailbox triage actions.
 */
const GlobalDashboardManager = class {
    constructor() {
        this.elements = {
            accounts: document.getElementById('dashboardAccounts'),
            status: document.getElementById('dashboardStatus'),
            refresh: document.getElementById('dashboardRefresh'),
            settings: document.getElementById('dashboardSettings'),
            showPreview: document.getElementById('dashboardShowPreview'),
            previewLines: document.getElementById('dashboardPreviewLines'),
            selectAll: document.getElementById('dashboardSelectAll'),
            selectedCount: document.getElementById('dashboardSelectedCount'),
            trashSelected: document.getElementById('dashboardTrashSelected')
        };
        this.accounts = [];
        this.selectedMessageIds = new Set();
        this.previewEnabled = false;
        this.previewLineCount = 3;
        this.busy = false;
        this.dateFormatter = new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short',
            timeStyle: 'short'
        });
    }

    /** Bind dashboard controls, restore local preferences, and load mail headers. */
    async initialize() {
        this.elements.refresh.addEventListener('click', () => {
            this.refresh().catch(error => this.showUnexpectedError(error));
        });
        this.elements.settings.addEventListener('click', () => {
            browser.runtime.openOptionsPage().catch(error => this.showUnexpectedError(error));
        });
        this.elements.showPreview.addEventListener('change', () => {
            this.handlePreviewToggle().catch(error => this.showUnexpectedError(error));
        });
        this.elements.previewLines.addEventListener('change', () => {
            this.handlePreviewLineChange().catch(error => this.showUnexpectedError(error));
        });
        this.elements.selectAll.addEventListener('change', () => this.toggleAllVisible());
        this.elements.trashSelected.addEventListener('click', () => {
            this.trashSelected().catch(error => this.showUnexpectedError(error));
        });

        await this.loadPreferences();
        this.applyPreferenceControls();
        await this.refresh();
    }

    async loadPreferences() {
        const stored = await browser.storage.local.get([
            CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW,
            CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES
        ]);
        this.previewEnabled = stored[CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW] === true;
        this.previewLineCount = this.normalizePreviewLines(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES]
        );
    }

    async savePreferences() {
        try {
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW]: this.previewEnabled,
                [CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES]: this.previewLineCount
            });
        } catch (error) {
            console.error('Could not save dashboard display preferences:', error);
            this.setStatus(I18n.t('dashboardPreferencesSaveFailed'), 'error');
        }
    }

    applyPreferenceControls() {
        this.elements.showPreview.checked = this.previewEnabled;
        this.elements.previewLines.value = String(this.previewLineCount);
        this.elements.previewLines.disabled = !this.previewEnabled;
    }

    async handlePreviewToggle() {
        this.previewEnabled = this.elements.showPreview.checked;
        this.applyPreferenceControls();
        await this.savePreferences();
        if (!this.previewEnabled) {
            this.render(this.accounts);
            return;
        }

        this.setBusy(true, I18n.t('dashboardPreviewsLoading'));
        try {
            await GlobalMailService.loadPreviews(this.accounts);
            this.render(this.accounts);
            this.setStatus(I18n.t('dashboardPreviewsLoaded'));
        } finally {
            this.setBusy(false);
        }
    }

    async handlePreviewLineChange() {
        this.previewLineCount = this.normalizePreviewLines(this.elements.previewLines.value);
        this.elements.previewLines.value = String(this.previewLineCount);
        await this.savePreferences();
        this.render(this.accounts);
    }

    normalizePreviewLines(value) {
        const lines = Number.parseInt(value, 10);
        return Number.isFinite(lines) ? Math.min(20, Math.max(1, lines)) : 3;
    }

    async refresh() {
        this.setBusy(true, I18n.t('dashboardLoading'));
        try {
            const accounts = await GlobalMailService.listUnreadByAccount(10);
            if (this.previewEnabled) {
                this.setStatus(I18n.t('dashboardPreviewsLoading'));
                await GlobalMailService.loadPreviews(accounts);
            }
            this.accounts = accounts;
            this.selectedMessageIds.clear();
            this.render(accounts);
            const messageCount = this.allMessages().length;
            this.setStatus(I18n.t('dashboardLoaded', {
                accounts: accounts.length,
                messages: messageCount
            }));
        } catch (error) {
            console.error('Could not load the global mail dashboard:', error);
            this.accounts = [];
            this.selectedMessageIds.clear();
            this.elements.accounts.replaceChildren();
            this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        } finally {
            this.setBusy(false);
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
            this.updateSelectionControls();
            return;
        }
        for (const account of accounts) {
            this.elements.accounts.appendChild(this.renderAccount(account));
        }
        this.updateSelectionControls();
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
        const subject = message.subject || I18n.t('dashboardNoSubject');
        const item = document.createElement('li');
        item.className = 'dashboard-message';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'dashboard-message-select';
        checkbox.checked = this.selectedMessageIds.has(message.id);
        checkbox.setAttribute('aria-label', I18n.t('dashboardSelectMessage', { subject }));
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                this.selectedMessageIds.add(message.id);
            } else {
                this.selectedMessageIds.delete(message.id);
            }
            this.updateSelectionControls();
        });

        const content = document.createElement('div');
        content.className = 'dashboard-message-content';
        content.appendChild(this.textElement('div', 'dashboard-message-subject', subject));
        content.appendChild(this.textElement(
            'div',
            'dashboard-message-meta',
            I18n.t('dashboardMessageMeta', {
                author: message.author || I18n.t('dashboardUnknownSender'),
                date: this.formatDate(message.date)
            })
        ));
        if (this.previewEnabled) {
            content.appendChild(this.renderPreview(message));
        }

        const trash = document.createElement('button');
        trash.type = 'button';
        trash.className = 'dashboard-message-trash';
        trash.textContent = I18n.t('dashboardTrashOne');
        trash.setAttribute('aria-label', I18n.t('dashboardTrashMessage', { subject }));
        trash.addEventListener('click', () => {
            this.trashOne(message).catch(error => this.showUnexpectedError(error));
        });

        item.append(checkbox, content, trash);
        return item;
    }

    renderPreview(message) {
        const preview = this.textElement(
            'div',
            'dashboard-message-preview',
            message.previewFailed
                ? I18n.t('dashboardPreviewUnavailable')
                : message.preview || I18n.t('dashboardPreviewEmpty')
        );
        preview.style.setProperty('--dashboard-preview-lines', String(this.previewLineCount));
        if (message.previewFailed) {
            preview.dataset.type = 'error';
        }
        return preview;
    }

    toggleAllVisible() {
        const messageIds = this.allMessages().map(message => message.id);
        if (this.elements.selectAll.checked) {
            for (const messageId of messageIds) {
                this.selectedMessageIds.add(messageId);
            }
        } else {
            this.selectedMessageIds.clear();
        }
        this.render(this.accounts);
    }

    async trashOne(message) {
        const subject = message.subject || I18n.t('dashboardNoSubject');
        if (!window.confirm(I18n.t('dashboardTrashOneConfirm', { subject }))) {
            return;
        }
        await this.performTrash([message.id], I18n.t('dashboardTrashOneSuccess'));
    }

    async trashSelected() {
        const messageIds = [...this.selectedMessageIds];
        if (!messageIds.length
            || !window.confirm(I18n.t('dashboardTrashSelectedConfirm', { count: messageIds.length }))) {
            return;
        }
        await this.performTrash(messageIds, I18n.t('dashboardTrashSelectedSuccess', {
            count: messageIds.length
        }));
    }

    async performTrash(messageIds, successMessage) {
        this.setBusy(true, I18n.t('dashboardTrashInProgress'));
        try {
            await GlobalMailService.moveToTrash(messageIds);
            this.selectedMessageIds.clear();
            await this.refresh();
            this.setStatus(successMessage, 'success');
        } catch (error) {
            console.error('Could not move dashboard messages to trash:', error);
            this.setStatus(I18n.t('dashboardTrashFailed'), 'error');
        } finally {
            this.setBusy(false);
        }
    }

    allMessages() {
        return this.accounts.flatMap(account => account.messages || []);
    }

    updateSelectionControls() {
        const visibleIds = new Set(this.allMessages().map(message => message.id));
        for (const messageId of this.selectedMessageIds) {
            if (!visibleIds.has(messageId)) {
                this.selectedMessageIds.delete(messageId);
            }
        }
        const total = visibleIds.size;
        const selected = this.selectedMessageIds.size;
        this.elements.selectAll.checked = total > 0 && selected === total;
        this.elements.selectAll.indeterminate = selected > 0 && selected < total;
        this.elements.selectAll.disabled = this.busy || total === 0;
        this.elements.trashSelected.disabled = this.busy || selected === 0;
        this.elements.selectedCount.textContent = I18n.t('dashboardSelectedCount', { count: selected });
        for (const element of this.elements.accounts.querySelectorAll(
            '.dashboard-message-select, .dashboard-message-trash'
        )) {
            element.disabled = this.busy;
        }
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

    setBusy(busy, message = null) {
        this.busy = busy;
        this.elements.refresh.disabled = busy;
        this.elements.showPreview.disabled = busy;
        this.elements.previewLines.disabled = busy || !this.previewEnabled;
        if (message) {
            this.setStatus(message);
        }
        this.updateSelectionControls();
    }

    setStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.dataset.type = type;
    }

    showUnexpectedError(error) {
        console.error('Global dashboard action failed:', error);
        this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        this.setBusy(false);
    }
};

if (typeof window !== 'undefined') {
    window.GlobalDashboardManager = GlobalDashboardManager;
}
