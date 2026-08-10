/**
 * Owns the AI-free global toolbar dashboard, its persisted view preferences,
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
            sortOrder: document.getElementById('dashboardSortOrder'),
            messageLimit: document.getElementById('dashboardMessageLimit'),
            dateFrom: document.getElementById('dashboardDateFrom'),
            dateTo: document.getElementById('dashboardDateTo'),
            senderFilterDetails: document.getElementById('dashboardSenderFilter'),
            senderSummary: document.getElementById('dashboardSenderSummary'),
            senderOptions: document.getElementById('dashboardSenderOptions'),
            selectAll: document.getElementById('dashboardSelectAll'),
            selectedCount: document.getElementById('dashboardSelectedCount'),
            trashSelected: document.getElementById('dashboardTrashSelected')
        };
        this.sourceAccounts = [];
        this.accounts = [];
        this.availableSenders = [];
        this.selectedSenderKeys = null;
        this.selectedMessageIds = new Set();
        this.previewEnabled = false;
        this.previewLineCount = 3;
        this.sortOrder = GlobalMailViewService.DEFAULT_SORT_ORDER;
        this.messageLimit = GlobalMailViewService.DEFAULT_LIMIT;
        this.dateFrom = '';
        this.dateTo = '';
        this.busy = false;
        this.dateFormatter = new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short',
            timeStyle: 'short'
        });
        this.senderFilterComponent = new DashboardSenderFilterComponent({
            details: this.elements.senderFilterDetails,
            summary: this.elements.senderSummary,
            options: this.elements.senderOptions,
            onSelectionChanged: selection => this.handleSenderSelectionChange(selection),
            onError: error => this.showUnexpectedError(error)
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
        for (const element of [
            this.elements.sortOrder,
            this.elements.messageLimit,
            this.elements.dateFrom,
            this.elements.dateTo
        ]) {
            element.addEventListener('change', () => {
                this.handleViewControlChange().catch(error => this.showUnexpectedError(error));
            });
        }
        this.elements.selectAll.addEventListener('change', () => this.toggleAllVisible());
        this.elements.trashSelected.addEventListener('click', () => {
            this.trashSelected().catch(error => this.showUnexpectedError(error));
        });

        await this.loadPreferences();
        this.applyPreferenceControls();
        await this.refresh();
    }

    /** Restore persisted view state while normalizing every untrusted storage value. */
    async loadPreferences() {
        const stored = await browser.storage.local.get([
            CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW,
            CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES,
            CONFIG.STORAGE_KEYS.DASHBOARD_SORT_ORDER,
            CONFIG.STORAGE_KEYS.DASHBOARD_MESSAGE_LIMIT,
            CONFIG.STORAGE_KEYS.DASHBOARD_DATE_FROM,
            CONFIG.STORAGE_KEYS.DASHBOARD_DATE_TO,
            CONFIG.STORAGE_KEYS.DASHBOARD_SENDER_FILTER
        ]);
        this.previewEnabled = stored[CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW] === true;
        this.previewLineCount = this.normalizePreviewLines(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES]
        );
        this.sortOrder = GlobalMailViewService.normalizeSortOrder(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_SORT_ORDER]
        );
        this.messageLimit = GlobalMailViewService.normalizeLimit(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_MESSAGE_LIMIT]
        );
        this.dateFrom = GlobalMailViewService.normalizeDate(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_DATE_FROM]
        );
        this.dateTo = GlobalMailViewService.normalizeDate(
            stored[CONFIG.STORAGE_KEYS.DASHBOARD_DATE_TO]
        );
        const senderFilter = stored[CONFIG.STORAGE_KEYS.DASHBOARD_SENDER_FILTER];
        this.selectedSenderKeys = Array.isArray(senderFilter) ? new Set(senderFilter) : null;
    }

    /** Persist the complete dashboard view without exposing mailbox data. */
    async savePreferences() {
        try {
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.DASHBOARD_SHOW_PREVIEW]: this.previewEnabled,
                [CONFIG.STORAGE_KEYS.DASHBOARD_PREVIEW_LINES]: this.previewLineCount,
                [CONFIG.STORAGE_KEYS.DASHBOARD_SORT_ORDER]: this.sortOrder,
                [CONFIG.STORAGE_KEYS.DASHBOARD_MESSAGE_LIMIT]: this.messageLimit,
                [CONFIG.STORAGE_KEYS.DASHBOARD_DATE_FROM]: this.dateFrom,
                [CONFIG.STORAGE_KEYS.DASHBOARD_DATE_TO]: this.dateTo,
                [CONFIG.STORAGE_KEYS.DASHBOARD_SENDER_FILTER]: this.selectedSenderKeys === null
                    ? null
                    : [...this.selectedSenderKeys]
            });
        } catch (error) {
            console.error('Could not save dashboard display preferences:', error);
            this.setStatus(I18n.t('dashboardPreferencesSaveFailed'), 'error');
        }
    }

    /** Synchronize static form controls with the normalized in-memory view state. */
    applyPreferenceControls() {
        this.elements.showPreview.checked = this.previewEnabled;
        this.elements.previewLines.value = String(this.previewLineCount);
        this.elements.sortOrder.value = this.sortOrder;
        this.elements.messageLimit.value = String(this.messageLimit);
        this.elements.dateFrom.value = this.dateFrom;
        this.elements.dateTo.value = this.dateTo;
        this.elements.previewLines.disabled = !this.previewEnabled;
    }

    /** Persist preview visibility and load bodies only for the current visible slice. */
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

    /** Persist and apply the bounded preview viewport height. */
    async handlePreviewLineChange() {
        this.previewLineCount = this.normalizePreviewLines(this.elements.previewLines.value);
        this.elements.previewLines.value = String(this.previewLineCount);
        await this.savePreferences();
        this.render(this.accounts);
    }

    /** Validate the query controls, persist them, and rebuild the visible slice. */
    async handleViewControlChange() {
        const fromDate = GlobalMailViewService.normalizeDate(this.elements.dateFrom.value);
        const toDate = GlobalMailViewService.normalizeDate(this.elements.dateTo.value);
        this.clearDateValidity();
        if (fromDate && toDate && fromDate > toDate) {
            const message = I18n.t('dashboardDateRangeInvalid');
            this.elements.dateTo.setCustomValidity(message);
            this.elements.dateTo.reportValidity();
            this.setStatus(message, 'error');
            return;
        }

        this.sortOrder = GlobalMailViewService.normalizeSortOrder(this.elements.sortOrder.value);
        this.messageLimit = GlobalMailViewService.normalizeLimit(this.elements.messageLimit.value);
        this.dateFrom = fromDate;
        this.dateTo = toDate;
        this.applyPreferenceControls();
        await this.savePreferences();
        await this.applyCurrentView();
    }

    clearDateValidity() {
        this.elements.dateFrom.setCustomValidity('');
        this.elements.dateTo.setCustomValidity('');
    }

    normalizePreviewLines(value) {
        const lines = Number.parseInt(value, 10);
        return Number.isFinite(lines) ? Math.min(20, Math.max(1, lines)) : 3;
    }

    /** Reload every unread header page, then apply the persisted local view. */
    async refresh() {
        this.setBusy(true, I18n.t('dashboardLoading'));
        try {
            this.sourceAccounts = await GlobalMailService.listUnreadByAccount();
            this.availableSenders = GlobalMailViewService.availableSenders(this.sourceAccounts);
            this.renderSenderOptions();
            this.selectedMessageIds.clear();
            await this.rebuildCurrentView();
        } catch (error) {
            console.error('Could not load the global mail dashboard:', error);
            this.sourceAccounts = [];
            this.accounts = [];
            this.availableSenders = [];
            this.selectedMessageIds.clear();
            this.elements.accounts.replaceChildren();
            this.renderSenderOptions();
            this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        } finally {
            this.setBusy(false);
        }
    }

    /** Reapply local controls without querying Thunderbird headers again. */
    async applyCurrentView() {
        this.setBusy(true, this.previewEnabled
            ? I18n.t('dashboardPreviewsLoading')
            : I18n.t('dashboardApplyingView'));
        try {
            await this.rebuildCurrentView();
        } finally {
            this.setBusy(false);
        }
    }

    /** Filter, sort, limit, and optionally preview the current header snapshot. */
    async rebuildCurrentView() {
        this.accounts = GlobalMailViewService.apply(this.sourceAccounts, {
            sortOrder: this.sortOrder,
            limit: this.messageLimit,
            selectedSenders: this.selectedSenderKeys,
            fromDate: this.dateFrom,
            toDate: this.dateTo,
            language: I18n.getLanguage()
        });
        if (this.previewEnabled) {
            this.setStatus(I18n.t('dashboardPreviewsLoading'));
            await GlobalMailService.loadPreviews(this.accounts);
        }
        this.render(this.accounts);
        this.showLoadedStatus();
    }

    /** Report both the bounded visible count and the full matching count. */
    showLoadedStatus() {
        const messageCount = this.allMessages().length;
        const matchingCount = this.accounts.reduce(
            (total, account) => total + (account.matchingCount || 0),
            0
        );
        this.setStatus(I18n.t('dashboardLoaded', {
            accounts: this.accounts.length,
            messages: messageCount,
            matches: matchingCount
        }));
    }

    /** Render the current account-grouped view using safe DOM text boundaries. */
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

    /** Render one account and distinguish empty mailboxes from filter misses. */
    renderAccount(account) {
        const section = document.createElement('section');
        section.className = 'dashboard-account';
        const heading = this.textElement('h2', 'dashboard-account-name', account.accountName);
        const count = this.textElement('span', 'dashboard-account-count', I18n.t('dashboardShownCount', {
            shown: account.messages.length,
            matches: account.matchingCount || 0
        }));
        const header = document.createElement('div');
        header.className = 'dashboard-account-header';
        header.append(heading, count);
        section.appendChild(header);

        if (account.failed) {
            section.appendChild(this.textElement('p', 'dashboard-account-error', I18n.t('dashboardAccountFailed')));
        } else if (!account.sourceCount) {
            section.appendChild(this.textElement('p', 'dashboard-empty', I18n.t('dashboardNoUnread')));
        } else if (!account.messages.length) {
            section.appendChild(this.textElement('p', 'dashboard-empty', I18n.t('dashboardNoMatches')));
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

    /** Render one selectable message row with an explicit delete action. */
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

    /** Render a scrollable, line-bounded local body preview. */
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

    /** Delegate the checkbox dropdown while retaining preference ownership here. */
    renderSenderOptions() {
        this.senderFilterComponent.render(this.availableSenders, this.selectedSenderKeys);
        this.senderFilterComponent.setBusy(this.busy);
    }

    /** Persist a sender checkbox selection and reapply the bounded view. */
    async handleSenderSelectionChange(selection) {
        this.selectedSenderKeys = selection;
        this.renderSenderOptions();
        await this.savePreferences();
        await this.applyCurrentView();
    }

    /** Select or clear exactly the messages in the current filtered slice. */
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

    /** Confirm and delete only the directly targeted message. */
    async trashOne(message) {
        const subject = message.subject || I18n.t('dashboardNoSubject');
        if (!window.confirm(I18n.t('dashboardTrashOneConfirm', { subject }))) {
            return;
        }
        await this.performTrash([message.id], I18n.t('dashboardTrashOneSuccess'));
    }

    /** Confirm and delete the currently selected visible messages as one action. */
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

    /** Execute one confirmed Thunderbird trash operation and refresh the snapshot. */
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

    /** Keep selection state bounded to messages that are currently visible. */
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

    /** Disable every mutating or view-changing control during asynchronous work. */
    setBusy(busy, message = null) {
        this.busy = busy;
        this.elements.refresh.disabled = busy;
        this.elements.showPreview.disabled = busy;
        this.elements.previewLines.disabled = busy || !this.previewEnabled;
        this.elements.sortOrder.disabled = busy;
        this.elements.messageLimit.disabled = busy;
        this.elements.dateFrom.disabled = busy;
        this.elements.dateTo.disabled = busy;
        this.senderFilterComponent.setBusy(busy);
        if (message) {
            this.setStatus(message);
        }
        this.updateSelectionControls();
    }

    setStatus(message, type = 'info') {
        this.elements.status.textContent = message;
        this.elements.status.dataset.type = type;
    }

    /** Translate unexpected asynchronous failures at the dashboard boundary. */
    showUnexpectedError(error) {
        console.error('Global dashboard action failed:', error);
        this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        this.setBusy(false);
    }
};

if (typeof window !== 'undefined') {
    window.GlobalDashboardManager = GlobalDashboardManager;
}
