/**
 * Owns the global toolbar dashboard, its persisted view preferences, and
 * explicit local or AI-assisted mailbox triage actions.
 */
const GlobalDashboardManager = class {
    constructor() {
        this.elements = {
            accounts: document.getElementById('dashboardAccounts'),
            status: document.getElementById('dashboardStatus'),
            refresh: document.getElementById('dashboardRefresh'),
            settings: document.getElementById('dashboardSettings'),
            expandView: document.getElementById('dashboardExpandView'),
            filterStatus: document.getElementById('dashboardFilterStatus'),
            activeFilters: document.getElementById('dashboardActiveFilters'),
            activeFilterSummary: document.getElementById('dashboardActiveFilterSummary'),
            resetFilters: document.getElementById('dashboardResetFilters'),
            displayOptions: document.getElementById('dashboardDisplayOptions'),
            showPreview: document.getElementById('dashboardShowPreview'),
            previewLines: document.getElementById('dashboardPreviewLines'),
            viewMode: document.getElementById('dashboardViewMode'),
            sortOrder: document.getElementById('dashboardSortOrder'),
            messageLimit: document.getElementById('dashboardMessageLimit'),
            messageLimitLabel: document.getElementById('dashboardMessageLimitLabel'),
            limitHint: document.getElementById('dashboardLimitHint'),
            dateFrom: document.getElementById('dashboardDateFrom'),
            dateTo: document.getElementById('dashboardDateTo'),
            aiStatusFilter: document.getElementById('dashboardAIStatusFilter'),
            importanceMinimum: document.getElementById('dashboardImportanceMinimum'),
            spamMinimum: document.getElementById('dashboardSpamMinimum'),
            riskMinimum: document.getElementById('dashboardRiskMinimum'),
            senderFilterDetails: document.getElementById('dashboardSenderFilter'),
            senderSummary: document.getElementById('dashboardSenderSummary'),
            senderOptions: document.getElementById('dashboardSenderOptions'),
            loadingIndicator: document.getElementById('dashboardLoadingIndicator'),
            loadingText: document.getElementById('dashboardLoadingText')
        };
        this.sourceAccounts = [];
        this.accounts = [];
        this.availableSenders = [];
        this.selectedSenderKeys = null;
        this.selectedMessageIds = new Set();
        this.displayOptionsExpanded = true;
        this.previewEnabled = false;
        this.previewLineCount = 3;
        this.contextMenuStyle = 'headings';
        this.sortOrder = GlobalMailViewService.DEFAULT_SORT_ORDER;
        this.viewMode = GlobalMailViewService.DEFAULT_VIEW_MODE;
        this.messageLimit = GlobalMailViewService.DEFAULT_LIMIT;
        this.dateFrom = '';
        this.dateTo = '';
        this.aiStatusFilter = 'all';
        this.importanceMinimum = 0;
        this.spamMinimum = 0;
        this.riskMinimum = 0;
        this.aiResults = {};
        this.busy = false;
        this.refreshPromise = null;
        this.recentInstallEvent = false;
        this.dateFormatter = new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short',
            timeStyle: 'short'
        });
        this.summaryComponent = new DashboardSummaryComponent({
            elements: this.elements,
            getState: () => this,
            setStatus: (message, type) => this.setStatus(message, type)
        });
        this.analysisController = new DashboardAnalysisController({
            getAccounts: () => this.sourceAccounts,
            getResults: () => this.aiResults,
            setResults: results => { this.aiResults = results; },
            getSelectedMessageIds: () => this.selectedMessageIds,
            rebuild: () => this.rebuildCurrentView(),
            setBusy: (busy, message) => this.setBusy(busy, message),
            setStatus: (message, type) => this.setStatus(message, type),
            confirm: message => window.confirm(message)
        });
        this.senderFilterComponent = new DashboardSenderFilterComponent({
            details: this.elements.senderFilterDetails,
            summary: this.elements.senderSummary,
            options: this.elements.senderOptions,
            onSelectionChanged: selection => this.handleSenderSelectionChange(selection),
            onError: error => this.showUnexpectedError(error)
        });
        this.bulkActionsComponent = new DashboardBulkActionsComponent({
            hosts: document.querySelectorAll('[data-dashboard-bulk-actions-host]'),
            onToggleAll: selected => this.toggleAllVisible(selected),
            onAnalyze: () => {
                this.analysisController.analyzeSelection()
                    .catch(error => this.showUnexpectedError(error));
            },
            onRescore: () => {
                this.analysisController.rescoreSelection()
                    .catch(error => this.showUnexpectedError(error));
            },
            onMarkRead: () => {
                this.markSelectedAsRead().catch(error => this.showUnexpectedError(error));
            },
            onArchive: () => {
                this.archiveSelected().catch(error => this.showUnexpectedError(error));
            },
            onTrash: () => {
                this.trashSelected().catch(error => this.showUnexpectedError(error));
            }
        });
        this.messageContextMenuComponent = new DashboardMessageContextMenuComponent({
            onStyleChanged: style => this.handleContextMenuStyleChange(style),
            onError: error => this.showUnexpectedError(error)
        });
        this.previewController = new DashboardPreviewController({
            getBaselineLines: () => this.previewLineCount,
            isGlobalEnabled: () => this.previewEnabled,
            loadPreview: message => GlobalMailService.loadPreview(message),
            render: () => this.render(this.accounts),
            setBusy: (busy, message) => this.setBusy(busy, message),
            setStatus: (message, type) => this.setStatus(message, type)
        });
        this.messageComponent = new DashboardMessageComponent({
            formatDate: value => this.formatDate(value),
            onSelectionChanged: (messageId, selected) => this.handleMessageSelection(messageId, selected),
            onSummarize: message => {
                this.openMessageWorkspace(message, 'summarize')
                    .catch(error => this.showWorkspaceError(error));
            },
            onReply: message => {
                this.openMessageWorkspace(message, 'reply')
                    .catch(error => this.showWorkspaceError(error));
            },
            onChat: message => {
                this.openMessageWorkspace(message, 'chat')
                    .catch(error => this.showWorkspaceError(error));
            },
            onAnalyze: message => {
                this.analysisController.analyzeMessage(message)
                    .catch(error => this.showUnexpectedError(error));
            },
            onReanalyze: message => {
                this.analysisController.rescoreMessage(message)
                    .catch(error => this.showUnexpectedError(error));
            },
            onCorrectScores: message => this.feedbackComponent.open(message),
            onShowPreview: message => {
                this.previewController.show(message)
                    .catch(error => this.showUnexpectedError(error));
            },
            onExpandPreview: message => this.previewController.expand(message),
            onResetPreview: message => this.previewController.reset(message),
            onHidePreview: message => this.previewController.hide(message),
            onOpenInTab: message => {
                this.openMessageInTab(message)
                    .catch(error => this.showMessageOpenError(error));
            },
            onMarkRead: message => {
                this.markOneAsRead(message).catch(error => this.showUnexpectedError(error));
            },
            onExportPdf: message => {
                this.pdfArchiverComponent.openFor(message)
                    .catch(error => this.showPdfArchiverError(error));
            },
            onArchive: message => {
                this.archiveOne(message).catch(error => this.showUnexpectedError(error));
            },
            onTrash: message => {
                this.trashOne(message).catch(error => this.showUnexpectedError(error));
            },
            onContextMenu: (event, actionGroups) => {
                const currentGroups = actionGroups.map(group => ({
                    ...group,
                    actions: group.actions.map(action => ({
                        ...action,
                        disabled: this.busy
                    }))
                }));
                this.messageContextMenuComponent.open(
                    event,
                    currentGroups,
                    this.contextMenuStyle
                );
            }
        });
        this.feedbackComponent = new DashboardFeedbackComponent({
            onSave: (message, reasons) => this.saveScoreFeedback(message, reasons)
        });
        this.pdfArchiverComponent = new PdfArchiverIntegrationComponent({
            setStatus: (message, type) => this.setStatus(message, type)
        });
        this.deleteComponent = new DashboardDeleteComponent({
            formatDate: value => this.formatDate(value),
            remainingMessageIds: messageIds => this.visibleMessageIds(messageIds),
            setStatus: (message, type) => this.setStatus(message, type)
        });
        this.launchPromptComponent = new DashboardLaunchPromptComponent({
            setStatus: (message, type) => this.setStatus(message, type)
        });
    }

    /** Bind dashboard controls, restore local preferences, and load mail headers. */
    async initialize() {
        this.bulkActionsComponent.initialize();
        this.elements.refresh.addEventListener('click', () => {
            this.refresh().catch(error => this.showUnexpectedError(error));
        });
        this.elements.settings.addEventListener('click', () => {
            browser.runtime.openOptionsPage().catch(error => this.showUnexpectedError(error));
        });
        this.elements.resetFilters.addEventListener('click', () => {
            this.resetFilters().catch(error => this.showUnexpectedError(error));
        });
        this.elements.expandView.addEventListener('click', () => {
            this.openExpandedView().catch(error => this.showUnexpectedError(error));
        });
        this.elements.displayOptions.addEventListener('toggle', () => {
            this.handleDisplayOptionsToggle().catch(error => this.showUnexpectedError(error));
        });
        this.elements.showPreview.addEventListener('change', () => {
            this.handlePreviewToggle().catch(error => this.showUnexpectedError(error));
        });
        this.elements.previewLines.addEventListener('change', () => {
            this.handlePreviewLineChange().catch(error => this.showUnexpectedError(error));
        });
        for (const element of [
            this.elements.viewMode,
            this.elements.sortOrder,
            this.elements.messageLimit,
            this.elements.dateFrom,
            this.elements.dateTo,
            this.elements.aiStatusFilter,
            this.elements.importanceMinimum,
            this.elements.spamMinimum,
            this.elements.riskMinimum
        ]) {
            element.addEventListener('change', () => {
                this.handleViewControlChange(element)
                    .catch(error => this.showUnexpectedError(error));
            });
        }
        await this.loadPreferences();
        this.recentInstallEvent = await DashboardLaunchService.hasRecentInstallEvent()
            .catch(error => {
                console.warn('Could not inspect the dashboard install marker:', error);
                return false;
            });
        this.applyPreferenceControls();
        await this.refresh();
        await this.deleteComponent.initialize();
        this.pdfArchiverComponent.initialize();
        await this.launchPromptComponent.initialize();
    }

    /** Restore persisted view state while normalizing every untrusted storage value. */
    async loadPreferences() {
        Object.assign(this, await DashboardViewPreferences.load());
    }

    /** Persist the complete dashboard view without exposing mailbox data. */
    async savePreferences() {
        try {
            await DashboardViewPreferences.save(this);
        } catch (error) {
            console.error('Could not save dashboard display preferences:', error);
            this.setStatus(I18n.t('dashboardPreferencesSaveFailed'), 'error');
        }
    }

    /** Preserve checkbox state independently from slower view preference changes. */
    async persistSelection() {
        try {
            await DashboardViewPreferences.saveSelection(this.selectedMessageIds);
        } catch (error) {
            console.warn('Could not save dashboard message selection:', error);
        }
    }

    /** Open the same dashboard in a durable Thunderbird tab. */
    async openExpandedView() {
        await this.persistSelection();
        await DashboardLaunchService.openExpanded('manual');
    }

    /** Synchronize static form controls with the normalized in-memory view state. */
    applyPreferenceControls() {
        this.elements.displayOptions.open = this.displayOptionsExpanded;
        this.elements.showPreview.checked = this.previewEnabled;
        this.elements.previewLines.value = String(this.previewLineCount);
        this.elements.viewMode.value = this.viewMode;
        this.elements.sortOrder.value = this.sortOrder;
        const combined = GlobalMailViewService.combinesAccounts(this.viewMode, this.sortOrder);
        this.elements.messageLimit.value = String(
            combined ? GlobalMailViewService.COMBINED_LIMIT : this.messageLimit
        );
        this.elements.messageLimit.disabled = this.busy || combined;
        this.elements.messageLimitLabel.textContent = I18n.t(
            combined ? 'dashboardMessageLimitCombined' : 'dashboardMessageLimit'
        );
        this.elements.limitHint.textContent = I18n.t(
            combined ? 'dashboardCombinedLimitHint' : 'dashboardLimitHint'
        );
        this.elements.dateFrom.value = this.dateFrom;
        this.elements.dateTo.value = this.dateTo;
        this.elements.aiStatusFilter.value = this.aiStatusFilter;
        this.elements.importanceMinimum.value = String(this.importanceMinimum);
        this.elements.spamMinimum.value = String(this.spamMinimum);
        this.elements.riskMinimum.value = String(this.riskMinimum);
        this.elements.previewLines.disabled = !this.previewEnabled;
        this.summaryComponent.updateFilterStatus(this.busy);
    }

    /** Persist an explicit operator change without rebuilding the mailbox list. */
    async handleDisplayOptionsToggle() {
        const expanded = this.elements.displayOptions.open;
        if (expanded === this.displayOptionsExpanded) {
            return;
        }
        this.displayOptionsExpanded = expanded;
        await this.savePreferences();
    }

    /** Persist preview visibility and load bodies only for the current visible slice. */
    async handlePreviewToggle() {
        this.previewEnabled = this.elements.showPreview.checked;
        this.previewController.setGlobalEnabled(this.previewEnabled);
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
        this.previewLineCount = DashboardViewPreferences.normalizePreviewLines(
            this.elements.previewLines.value
        );
        this.elements.previewLines.value = String(this.previewLineCount);
        await this.savePreferences();
        this.render(this.accounts);
    }

    /** Persist the operator-selected direct or submenu right-click layout. */
    async handleContextMenuStyleChange(style) {
        this.contextMenuStyle = DashboardViewPreferences.normalizeContextMenuStyle(style);
        await this.savePreferences();
    }

    /** Validate the query controls, persist them, and rebuild the visible slice. */
    async handleViewControlChange(changedElement = null) {
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

        this.viewMode = GlobalMailViewService.normalizeViewMode(this.elements.viewMode.value);
        this.sortOrder = GlobalMailViewService.normalizeSortOrder(this.elements.sortOrder.value);
        if (changedElement === this.elements.messageLimit) {
            this.messageLimit = GlobalMailViewService.normalizeLimit(this.elements.messageLimit.value);
        }
        this.dateFrom = fromDate;
        this.dateTo = toDate;
        this.aiStatusFilter = GlobalMailViewService.normalizeAIStatusFilter(
            this.elements.aiStatusFilter.value
        );
        this.importanceMinimum = GlobalMailViewService.normalizePercentage(
            this.elements.importanceMinimum.value
        );
        this.spamMinimum = GlobalMailViewService.normalizePercentage(
            this.elements.spamMinimum.value
        );
        this.riskMinimum = GlobalMailViewService.normalizePercentage(
            this.elements.riskMinimum.value
        );
        this.applyPreferenceControls();
        await this.savePreferences();
        await this.applyCurrentView();
    }

    /** Clear a prior invalid-range message before applying or resetting dates. */
    clearDateValidity() {
        this.elements.dateFrom.setCustomValidity('');
        this.elements.dateTo.setCustomValidity('');
    }

    /** Clear every narrowing filter while preserving durable display preferences. */
    async resetFilters() {
        this.dateFrom = '';
        this.dateTo = '';
        this.selectedSenderKeys = null;
        this.aiStatusFilter = 'all';
        this.importanceMinimum = 0;
        this.spamMinimum = 0;
        this.riskMinimum = 0;
        this.clearDateValidity();
        this.senderFilterComponent.clearSearch();
        this.elements.senderFilterDetails.open = false;
        this.applyPreferenceControls();
        this.renderSenderOptions();
        await this.savePreferences();
        await this.applyCurrentView();
    }

    /** Reload every unread header page, then apply the persisted local view. */
    async refresh() {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }
        this.refreshPromise = RuntimeDiagnosticService.run(
            'dashboard',
            'refresh-mailbox',
            () => this.performRefresh()
        );
        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
    }

    /** Execute one mailbox refresh while concurrent callers share its result. */
    async performRefresh() {
        this.setBusy(true, I18n.t('dashboardLoading'));
        try {
            const [sourceAccounts, aiResults] = await Promise.all([
                GlobalMailService.listUnreadByAccount({
                    onRetry: (_error, attempt) => {
                        this.setBusy(true, I18n.t('dashboardStartupRetrying', {
                            attempt: attempt + 1,
                            max: GlobalMailService.STARTUP_MAX_ATTEMPTS
                        }));
                    }
                }),
                RetryService.withTimeout(
                    () => DashboardAIService.loadResults(),
                    {
                        timeoutMs: GlobalMailService.API_TIMEOUT_MS,
                        code: 'DASHBOARD_STORAGE_TIMEOUT',
                        stage: 'dashboard-ai-results'
                    }
                )
            ]);
            this.aiResults = aiResults;
            this.sourceAccounts = DashboardAIService.attachResults(sourceAccounts, aiResults);
            this.availableSenders = GlobalMailViewService.availableSenders(this.sourceAccounts);
            this.renderSenderOptions();
            await this.rebuildCurrentView();
            await this.persistSelection();
        } catch (error) {
            console.error('Could not load the global mail dashboard:', error);
            this.sourceAccounts = [];
            this.accounts = [];
            this.availableSenders = [];
            this.selectedMessageIds.clear();
            await this.persistSelection();
            this.elements.accounts.replaceChildren();
            this.renderSenderOptions();
            this.setStatus(I18n.t(
                this.recentInstallEvent
                    ? 'dashboardLoadFailedAfterInstall'
                    : 'dashboardLoadFailed'
            ), 'error');
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
            viewMode: this.viewMode,
            sortOrder: this.sortOrder,
            limit: this.messageLimit,
            selectedSenders: this.selectedSenderKeys,
            fromDate: this.dateFrom,
            toDate: this.dateTo,
            aiStatusFilter: this.aiStatusFilter,
            importanceMinimum: this.importanceMinimum,
            spamMinimum: this.spamMinimum,
            riskMinimum: this.riskMinimum,
            language: I18n.getLanguage()
        });
        if (this.previewEnabled) {
            this.setStatus(I18n.t('dashboardPreviewsLoading'));
            await GlobalMailService.loadPreviews(this.accounts);
        } else {
            const expandedMessages = this.previewController.expandedMessages(this.allMessages());
            if (expandedMessages.length) {
                await GlobalMailService.loadPreviews([{ messages: expandedMessages }]);
            }
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
        if (matchingCount === 0 && this.recentInstallEvent) {
            this.setStatus(I18n.t('dashboardNoUnreadAfterInstall'), 'warning');
            return;
        }
        this.summaryComponent.showLoadedStatus({
            accounts: this.sourceAccounts.length,
            messages: messageCount,
            matches: matchingCount
        });
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
        if (account.failedAccountCount) {
            section.appendChild(this.textElement(
                'p',
                'dashboard-account-error',
                I18n.t('dashboardSomeAccountsFailed', { count: account.failedAccountCount })
            ));
        }
        return section;
    }

    /** Delegate one message row while retaining dashboard state ownership. */
    renderMessage(message) {
        return this.messageComponent.render(message, {
            selected: this.selectedMessageIds.has(message.id),
            busy: this.busy,
            ...this.previewController.optionsFor(message),
            showAccount: this.accounts.length === 1 && this.accounts[0].combined === true
        });
    }

    /** Apply one row checkbox change to the shared visible selection. */
    handleMessageSelection(messageId, selected) {
        if (selected) {
            this.selectedMessageIds.add(messageId);
        } else {
            this.selectedMessageIds.delete(messageId);
        }
        this.updateSelectionControls();
        this.persistSelection();
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
        this.summaryComponent.updateFilterStatus(this.busy);
        await this.savePreferences();
        await this.applyCurrentView();
    }

    /** Select or clear exactly the messages in the current filtered slice. */
    toggleAllVisible(selected) {
        const messageIds = this.allMessages().map(message => message.id);
        if (selected) {
            for (const messageId of messageIds) {
                this.selectedMessageIds.add(messageId);
            }
        } else {
            this.selectedMessageIds.clear();
        }
        this.render(this.accounts);
        this.persistSelection();
    }

    /** Open the existing single-message summary or reply workspace. */
    async openMessageWorkspace(message, mode) {
        await DashboardAIService.openWorkspace(message.id, mode);
    }

    /** Open the directly targeted Thunderbird message in its own active tab. */
    async openMessageInTab(message) {
        await RuntimeDiagnosticService.run(
            'dashboard',
            'open-message-tab',
            () => GlobalMailService.openInTab(message.id)
        );
    }

    /** Archive an operator correction and immediately reapply score sort/filter controls. */
    async saveScoreFeedback(message, reasons) {
        const account = this.sourceAccounts.find(candidate => (
            (candidate.messages || []).some(item => item.id === message.id)
        ));
        const correction = await DashboardAIService.submitFeedback(message, reasons);
        this.aiResults = await DashboardAIService.saveCorrection(
            this.aiResults,
            account,
            message,
            correction
        );
        DashboardAIService.attachResults(this.sourceAccounts, this.aiResults);
        await this.rebuildCurrentView();
        this.setStatus(I18n.t('dashboardFeedbackSaved'), 'success');
    }

    /** Mark one directly targeted message as read without an unnecessary confirmation. */
    async markOneAsRead(message) {
        await this.performMarkAsRead([message.id], 'dashboardMarkReadOneSuccess');
    }

    /** Mark all selected visible messages as read in one fault-isolated operation. */
    async markSelectedAsRead() {
        const messageIds = [...this.selectedMessageIds];
        if (!messageIds.length) {
            return;
        }
        await this.performMarkAsRead(messageIds, 'dashboardMarkReadSelectedSuccess');
    }

    /** Apply read state, refresh the unread view, and report complete or partial success. */
    async performMarkAsRead(messageIds, successKey) {
        this.setBusy(true, I18n.t('dashboardMarkReadInProgress'));
        try {
            const result = await RuntimeDiagnosticService.run(
                'dashboard',
                'mark-read',
                () => GlobalMailService.markAsRead(messageIds)
            );
            this.selectedMessageIds.clear();
            await this.persistSelection();
            await this.refresh();
            if (result.failedIds.length && result.updatedIds.length) {
                this.setStatus(I18n.t('dashboardMarkReadPartial', {
                    updated: result.updatedIds.length,
                    failed: result.failedIds.length
                }), 'warning');
            } else if (result.failedIds.length) {
                this.setStatus(I18n.t('dashboardMarkReadFailed'), 'error');
            } else {
                this.setStatus(I18n.t(successKey, { count: result.updatedIds.length }), 'success');
            }
        } catch (error) {
            console.error('Could not mark dashboard messages as read:', error);
            this.setStatus(I18n.t('dashboardMarkReadFailed'), 'error');
        } finally {
            this.setBusy(false);
        }
    }

    /** Archive one directly targeted message without an unnecessary confirmation. */
    async archiveOne(message) {
        await this.performArchive([message.id], 'dashboardArchiveOneSuccess');
    }

    /** Archive all selected visible messages using each account's Thunderbird settings. */
    async archiveSelected() {
        const messageIds = [...this.selectedMessageIds];
        if (!messageIds.length) {
            return;
        }
        await this.performArchive(messageIds, 'dashboardArchiveSelectedSuccess');
    }

    /** Apply native archiving, refresh the unread view, and report the moved count. */
    async performArchive(messageIds, successKey) {
        this.setBusy(true, I18n.t('dashboardArchiveInProgress'));
        try {
            await RuntimeDiagnosticService.run(
                'dashboard',
                'archive',
                () => GlobalMailService.archiveMessages(messageIds)
            );
            this.selectedMessageIds.clear();
            await this.persistSelection();
            await this.refresh();
            this.setStatus('', 'info');
            this.deleteComponent.showArchiveSuccess(I18n.t(successKey, {
                count: messageIds.length
            }));
        } catch (error) {
            console.error('Could not archive dashboard messages:', error);
            this.setStatus(I18n.t('dashboardArchiveFailed'), 'error');
        } finally {
            this.setBusy(false);
        }
    }

    /** Report a direct-workspace failure without mislabeling it as a mailbox load failure. */
    showWorkspaceError(error) {
        console.error('Could not open the single-message AI workspace:', error);
        this.setStatus(I18n.t('dashboardWorkspaceOpenFailed'), 'error');
    }

    /** Translate Thunderbird message-tab failures at the dashboard boundary. */
    showMessageOpenError(error) {
        console.error('Could not open the dashboard message in a Thunderbird tab:', error);
        this.setStatus(I18n.t('dashboardOpenInTabFailed'), 'error');
    }

    /** Report unexpected companion failures without treating them as mailbox load errors. */
    showPdfArchiverError(error) {
        console.error('Could not hand the message to PDF Archiver for Thunderbird:', error);
        this.setStatus(I18n.t('dashboardPdfArchiverOpenFailed'), 'error');
    }

    /** Confirm and delete only the directly targeted message. */
    async trashOne(message) {
        const subject = message.subject || I18n.t('dashboardNoSubject');
        if (!await this.deleteComponent.confirm(I18n.t('dashboardTrashOneConfirm', { subject }))) {
            return;
        }
        await this.performTrash([message.id], I18n.t('dashboardTrashOneSuccess'));
    }

    /** Confirm and delete the currently selected visible messages as one action. */
    async trashSelected() {
        const messageIds = [...this.selectedMessageIds];
        if (!messageIds.length
            || !await this.deleteComponent.confirm(I18n.t('dashboardTrashSelectedConfirm', {
                count: messageIds.length
            }))) {
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
            let diagnostics = await RuntimeDiagnosticService.run(
                'dashboard',
                'delete',
                () => GlobalMailService.moveToTrash(messageIds)
            );
            const remainingMessageIds = await this.refreshUntilTrashApplied(messageIds);
            if (remainingMessageIds.length) {
                diagnostics = {
                    ...diagnostics,
                    code: GlobalMailService.DELETE_DIAGNOSTIC_CODE,
                    state: 'unconfirmed',
                    timestamp: new Date().toISOString(),
                    messageIds: remainingMessageIds,
                    resultAcknowledged: false
                };
                await this.deleteComponent.persist(diagnostics);
                console.error('Thunderbird acknowledged a dashboard delete request without removing every message.', {
                    diagnosticCode: GlobalMailService.DELETE_DIAGNOSTIC_CODE,
                    requestedMessageCount: messageIds.length,
                    remainingMessageCount: remainingMessageIds.length,
                    remainingMessageIds,
                    ...diagnostics
                });
                const message = I18n.t('dashboardTrashUnconfirmed', {
                    count: remainingMessageIds.length,
                    code: GlobalMailService.DELETE_DIAGNOSTIC_CODE
                });
                this.deleteComponent.showResult(message, 'error', diagnostics);
                return;
            }
            diagnostics = {
                ...diagnostics,
                code: 'DELETE_VERIFIED',
                state: 'verified',
                timestamp: new Date().toISOString(),
                messageIds: [],
                resultAcknowledged: false
            };
            await this.deleteComponent.persist(diagnostics);
            this.selectedMessageIds.clear();
            await this.persistSelection();
            this.deleteComponent.showResult(successMessage, 'success', diagnostics);
        } catch (error) {
            console.error('Could not move dashboard messages to trash:', error);
            const diagnostics = {
                code: 'DELETE_REQUEST_FAILED',
                state: 'failed',
                timestamp: new Date().toISOString(),
                messageCount: messageIds.length,
                messageIds,
                technicalError: error?.message || String(error),
                ...(error?.diagnostics || {}),
                resultAcknowledged: false
            };
            const message = error?.message || I18n.t('dashboardTrashFailed');
            try {
                await this.deleteComponent.persist(diagnostics);
            } catch (persistenceError) {
                console.warn('Could not persist the dashboard delete failure:', persistenceError);
            }
            this.setStatus('');
            this.deleteComponent.showResult(message, 'error', diagnostics);
        } finally {
            this.setBusy(false);
        }
    }

    /** Retry the unread snapshot briefly because remote mail stores may settle asynchronously. */
    async refreshUntilTrashApplied(messageIds, attempts = 3) {
        let remainingMessageIds = [...messageIds];
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (attempt > 0) {
                await this.waitForTrashVerification();
            }
            await this.refresh();
            remainingMessageIds = this.visibleMessageIds(messageIds);
            if (!remainingMessageIds.length) {
                break;
            }
        }
        return remainingMessageIds;
    }

    /** Give Thunderbird and an IMAP server a short interval to publish the completed move. */
    async waitForTrashVerification(delayMs = 250) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    /** Return requested message IDs that remain in the refreshed unread dashboard. */
    visibleMessageIds(messageIds) {
        const requestedIds = new Set(messageIds.map(messageId => String(messageId)));
        const accounts = this.sourceAccounts?.length ? this.sourceAccounts : this.accounts;
        return accounts.flatMap(account => account.messages || [])
            .filter(message => requestedIds.has(String(message.id)))
            .map(message => message.id);
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
        this.bulkActionsComponent.update({ busy: this.busy, total, selected });
        for (const element of this.elements.accounts.querySelectorAll(
            '.dashboard-message-select, .dashboard-message-action, .dashboard-preview-control'
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
        if (busy) {
            this.messageContextMenuComponent.close();
        }
        this.elements.refresh.disabled = busy;
        this.elements.showPreview.disabled = busy;
        this.elements.previewLines.disabled = busy || !this.previewEnabled;
        this.elements.viewMode.disabled = busy;
        this.elements.sortOrder.disabled = busy;
        this.elements.messageLimit.disabled = busy
            || GlobalMailViewService.combinesAccounts(this.viewMode, this.sortOrder);
        this.elements.dateFrom.disabled = busy;
        this.elements.dateTo.disabled = busy;
        this.elements.aiStatusFilter.disabled = busy;
        this.elements.importanceMinimum.disabled = busy;
        this.elements.spamMinimum.disabled = busy;
        this.elements.riskMinimum.disabled = busy;
        this.summaryComponent.updateFilterStatus(busy);
        this.senderFilterComponent.setBusy(busy);
        this.elements.loadingIndicator.hidden = !busy;
        if (message) {
            this.setStatus(message);
            this.elements.loadingText.textContent = message;
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
        void RuntimeDiagnosticService.record('dashboard', 'ui-action', 'failed', {
            code: error?.code || error?.name
        });
        this.setStatus(I18n.t('dashboardLoadFailed'), 'error');
        this.setBusy(false);
    }
};

if (typeof window !== 'undefined') {
    window.GlobalDashboardManager = GlobalDashboardManager;
}
