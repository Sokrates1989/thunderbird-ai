/** Own destructive confirmation and the persisted, copyable delete diagnostic UI. */
const DashboardDeleteComponent = class {
    constructor({ formatDate, remainingMessageIds, setStatus }) {
        this.formatDate = formatDate;
        this.remainingMessageIds = remainingMessageIds;
        this.setStatus = setStatus;
        this.lastDiagnostic = null;
        this.elements = {
            diagnostics: document.getElementById('dashboardDiagnostics'),
            details: document.getElementById('dashboardDiagnosticDetails'),
            copy: document.getElementById('dashboardCopyDiagnostics'),
            confirmationDialog: document.getElementById('dashboardConfirmationDialog'),
            confirmationMessage: document.getElementById('dashboardConfirmationMessage')
        };
    }

    async initialize() {
        this.elements.copy.addEventListener('click', () => {
            this.copyDiagnostic().catch(error => {
                console.error('Could not copy dashboard delete diagnostic:', error);
                this.setStatus(I18n.t('dashboardDiagnosticCopyFailed'), 'error');
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
        this.render(diagnostics);
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
        if (diagnostics?.state === 'failed' || diagnostics?.state === 'timed-out') {
            this.setStatus(I18n.t(
                diagnostics.state === 'timed-out'
                    ? 'dashboardTrashTimedOut'
                    : 'dashboardTrashFailed'
            ), 'error');
        } else if (diagnostics?.state === 'unconfirmed') {
            this.setStatus(I18n.t('dashboardTrashUnconfirmed', {
                count: diagnostics.messageIds?.length || diagnostics.messageCount || 0,
                code: diagnostics.code
            }), 'error');
        } else if (diagnostics?.state === 'verified') {
            this.setStatus(I18n.t('dashboardTrashRestoredSuccess', {
                count: diagnostics.messageCount || 0
            }), 'success');
        } else if (diagnostics?.state === 'started') {
            this.setStatus(I18n.t('dashboardTrashInProgress'), 'warning');
        }
    }

    async persist(diagnostics) {
        await GlobalMailService.saveDeleteDiagnostic(diagnostics);
        this.render(diagnostics);
    }

    render(diagnostics) {
        this.lastDiagnostic = diagnostics || null;
        this.elements.diagnostics.hidden = !diagnostics;
        this.elements.diagnostics.open = Boolean(diagnostics
            && ['failed', 'timed-out', 'unconfirmed'].includes(diagnostics.state));
        this.elements.details.textContent = diagnostics ? this.format(diagnostics) : '';
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

    async copyDiagnostic() {
        if (!this.lastDiagnostic) {
            return;
        }
        await navigator.clipboard.writeText(this.format(this.lastDiagnostic));
        this.setStatus(I18n.t('dashboardDiagnosticsCopied'), 'success');
    }
};

globalThis.DashboardDeleteComponent = DashboardDeleteComponent;
