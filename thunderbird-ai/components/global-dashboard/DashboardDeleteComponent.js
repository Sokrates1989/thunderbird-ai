/** Own destructive confirmation and the shared mailbox-operation result dialog. */
const DashboardDeleteComponent = class {
    constructor({ formatDate, remainingMessageIds, setStatus }) {
        this.formatDate = formatDate;
        this.remainingMessageIds = remainingMessageIds;
        this.setStatus = setStatus;
        this.lastDiagnostic = null;
        this.activeResultDiagnostic = null;
        this.elements = {
            confirmationDialog: document.getElementById('dashboardConfirmationDialog'),
            confirmationMessage: document.getElementById('dashboardConfirmationMessage'),
            resultDialog: document.getElementById('dashboardResultDialog'),
            resultSymbol: document.getElementById('dashboardResultSymbol'),
            resultTitle: document.getElementById('dashboardResultTitle'),
            resultMessage: document.getElementById('dashboardResultMessage'),
            resultDiagnostic: document.getElementById('dashboardResultDiagnosticSection'),
            resultDetails: document.getElementById('dashboardResultDiagnostic')
        };
    }

    async initialize() {
        this.elements.resultDialog.addEventListener('close', () => {
            this.acknowledgeResult().catch(error => {
                console.warn('Could not acknowledge the dashboard delete result:', error);
            });
        });
        try {
            await this.restoreDiagnostic();
        } catch (error) {
            console.warn('Could not restore the dashboard delete diagnostic:', error);
        }
    }

    /** Confirm without moving focus away from the toolbar popup. */
    async confirm(message) {
        const dialog = this.elements.confirmationDialog;
        this.elements.confirmationMessage.textContent = message;
        dialog.returnValue = 'cancel';
        dialog.showModal();
        return new Promise(resolve => {
            dialog.addEventListener('close', () => {
                resolve(dialog.returnValue === 'confirm');
            }, { once: true });
        });
    }

    async restoreDiagnostic() {
        let diagnostics = await GlobalMailService.loadDeleteDiagnostic();
        if (['started', 'completed', 'failed', 'timed-out'].includes(diagnostics?.state)
            && diagnostics.messageIds?.length) {
            diagnostics = await this.reconcileDiagnostic(diagnostics);
        }
        this.lastDiagnostic = diagnostics || null;
        this.restoreStatus(diagnostics);
    }

    async reconcileDiagnostic(diagnostics) {
        const remainingMessageIds = this.remainingMessageIds(diagnostics.messageIds);
        if (!remainingMessageIds.length || diagnostics.state === 'completed') {
            diagnostics = {
                ...diagnostics,
                code: remainingMessageIds.length
                    ? GlobalMailService.DELETE_DIAGNOSTIC_CODE
                    : 'DELETE_VERIFIED',
                state: remainingMessageIds.length ? 'unconfirmed' : 'verified',
                timestamp: new Date().toISOString(),
                messageIds: remainingMessageIds
            };
        }
        await GlobalMailService.saveDeleteDiagnostic(diagnostics);
        return diagnostics;
    }

    restoreStatus(diagnostics) {
        let message = '';
        let type = 'error';
        if (diagnostics?.state === 'failed' || diagnostics?.state === 'timed-out') {
            message = I18n.t(
                diagnostics.state === 'timed-out'
                    ? 'dashboardTrashTimedOut'
                    : 'dashboardTrashFailed'
            );
        } else if (diagnostics?.state === 'unconfirmed') {
            message = I18n.t('dashboardTrashUnconfirmed', {
                count: diagnostics.messageIds?.length || diagnostics.messageCount || 0,
                code: diagnostics.code
            });
        } else if (diagnostics?.state === 'verified') {
            message = I18n.t('dashboardTrashRestoredSuccess', {
                count: diagnostics.messageCount || 0
            });
            type = 'success';
        } else if (diagnostics?.state === 'started') {
            this.setStatus(I18n.t('dashboardTrashInProgress'), 'warning');
            return;
        }
        if (message) {
            if (diagnostics.resultAcknowledged !== true) {
                this.showResult(message, type, diagnostics);
            }
        }
    }

    /** Present an archive success without leaking a prior delete diagnostic. */
    showArchiveSuccess(message) {
        this.showResult(message, 'success', null, {
            titleKey: 'dashboardArchiveResultSuccessTitle',
            symbol: '📦',
            showDiagnostic: false
        });
    }

    /** Present an operation outcome and its optional technical diagnostic in one modal. */
    showResult(message, type, diagnostics, options = {}) {
        const resultType = type === 'success' ? 'success' : 'error';
        const showDiagnostic = options.showDiagnostic !== false;
        this.activeResultDiagnostic = diagnostics || (showDiagnostic ? this.lastDiagnostic : null);
        this.elements.resultDialog.dataset.type = resultType;
        this.elements.resultSymbol.textContent = options.symbol
            || (resultType === 'success' ? '✓' : '!');
        this.elements.resultTitle.textContent = I18n.t(options.titleKey || (
            resultType === 'success'
                ? 'dashboardResultSuccessTitle'
                : 'dashboardResultErrorTitle'
        ));
        this.elements.resultMessage.textContent = message;
        this.elements.resultDiagnostic.hidden = !showDiagnostic;
        this.elements.resultDetails.textContent = showDiagnostic && this.activeResultDiagnostic
            ? this.format(this.activeResultDiagnostic)
            : '';
        if (!this.elements.resultDialog.open) {
            this.elements.resultDialog.showModal();
        }
    }

    /** Do not show the same persisted outcome again after the operator closes it. */
    async acknowledgeResult() {
        const diagnostics = this.activeResultDiagnostic;
        this.activeResultDiagnostic = null;
        if (!diagnostics || diagnostics.resultAcknowledged === true) {
            return;
        }
        await this.persist({ ...diagnostics, resultAcknowledged: true });
    }

    async persist(diagnostics) {
        await GlobalMailService.saveDeleteDiagnostic(diagnostics);
        this.lastDiagnostic = diagnostics || null;
    }

    format(diagnostics) {
        const stateKey = {
            started: 'dashboardDiagnosticStateStarted',
            completed: 'dashboardDiagnosticStateCompleted',
            verified: 'dashboardDiagnosticStateVerified',
            unconfirmed: 'dashboardDiagnosticStateUnconfirmed',
            failed: 'dashboardDiagnosticStateFailed',
            'timed-out': 'dashboardDiagnosticStateTimedOut'
        }[diagnostics.state] || 'dashboardDiagnosticStateUnknown';
        const timestamp = diagnostics.timestamp
            ? this.formatDate(diagnostics.timestamp)
            : I18n.t('dashboardDiagnosticUnknown');
        return I18n.t('dashboardDiagnosticDetails', {
            timestamp,
            state: I18n.t(stateKey),
            code: diagnostics.code || I18n.t('dashboardDiagnosticUnknown'),
            version: diagnostics.browserVersion || I18n.t('dashboardDiagnosticUnknown'),
            mode: diagnostics.requestMode || I18n.t('dashboardDiagnosticUnknown'),
            count: diagnostics.messageCount || 0,
            error: diagnostics.technicalError || I18n.t('dashboardDiagnosticNone')
        });
    }
};

globalThis.DashboardDeleteComponent = DashboardDeleteComponent;
