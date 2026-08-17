/** Owns ordinary Thunderbird actions for the currently displayed message. */
const MailActionsComponent = class {
    constructor(manager) {
        this.manager = manager;
        this.container = manager.elements.mailActionsGrid;
        this.buttons = {};
        this.enabled = true;
        this.busy = false;
        this.terminal = false;
        this.messageRead = false;
        this.actions = [
            {
                id: 'markReadBtn',
                icon: '✓',
                textKey: 'dashboardMarkReadOne',
                descriptionKey: 'dashboardMarkReadMessage',
                action: 'MARK_READ',
                className: 'mark-read'
            },
            {
                id: 'exportPdfBtn',
                icon: '📄',
                textKey: 'dashboardExportPdfOne',
                descriptionKey: 'dashboardExportPdfMessage',
                action: 'EXPORT_PDF',
                className: 'export-pdf'
            },
            {
                id: 'archiveBtn',
                icon: '📦',
                textKey: 'dashboardArchiveOne',
                descriptionKey: 'dashboardArchiveMessage',
                action: 'ARCHIVE',
                className: 'archive'
            },
            {
                id: 'trashBtn',
                icon: '🗑️',
                textKey: 'dashboardTrashOne',
                descriptionKey: 'dashboardTrashMessage',
                action: 'TRASH',
                className: 'danger'
            }
        ];
    }

    initialize() {
        this.container.replaceChildren();
        for (const definition of this.actions) {
            const button = document.createElement('button');
            button.type = 'button';
            button.id = definition.id;
            button.className = `button mail-action ${definition.className}`;
            button.dataset.action = definition.action;
            button.append(
                this.textElement('span', 'icon', definition.icon, true),
                this.textElement('span', 'text', I18n.t(definition.textKey))
            );
            button.addEventListener('click', () => {
                this.execute(definition).catch(error => this.showFailure(error));
            });
            this.container.appendChild(button);
            this.buttons[definition.id] = button;
        }
        this.createDeleteDialog();
        this.createPdfDialog();
        this.applyButtonState();
    }

    /** Update labels and availability once the current MessageHeader is known. */
    updateMessage(message) {
        this.message = message;
        this.terminal = false;
        this.messageRead = message?.read === true;
        const subject = message?.subject || I18n.t('dashboardNoSubject');
        for (const definition of this.actions) {
            this.buttons[definition.id].title = I18n.t(definition.descriptionKey, { subject });
            this.buttons[definition.id].setAttribute(
                'aria-label',
                I18n.t(definition.descriptionKey, { subject })
            );
        }
        this.applyButtonState();
    }

    async execute(definition) {
        if (this.busy || !this.enabled || !this.message) {
            return;
        }
        if (definition.action === 'TRASH' && !await this.confirmDelete()) {
            return;
        }
        this.setBusy(true, definition.id);
        try {
            await RuntimeDiagnosticService.run('single-mail', definition.action.toLowerCase(), async () => {
                if (definition.action === 'MARK_READ') {
                    await this.markAsRead();
                } else if (definition.action === 'EXPORT_PDF') {
                    await this.exportPdf();
                } else if (definition.action === 'ARCHIVE') {
                    await this.archive();
                } else if (definition.action === 'TRASH') {
                    await this.moveToTrash();
                }
            });
        } finally {
            this.setBusy(false);
        }
    }

    async markAsRead() {
        this.manager.updateStatus(I18n.t('dashboardMarkReadInProgress'));
        const result = await MailboxActionService.markAsRead([this.manager.emailId]);
        if (result.failedIds.length) {
            throw new Error(I18n.t('dashboardMarkReadFailed'));
        }
        this.messageRead = true;
        if (this.manager.emailData) {
            this.manager.emailData.read = true;
        }
        this.manager.components.emailDetails.updateField('status', 'read');
        this.manager.updateStatus(I18n.t('dashboardMarkReadOneSuccess'), 'success');
    }

    async archive() {
        this.manager.updateStatus(I18n.t('dashboardArchiveInProgress'));
        await MailboxActionService.archive([this.manager.emailId]);
        this.terminal = true;
        this.manager.updateStatus(I18n.t('dashboardArchiveOneSuccess'), 'success');
    }

    async moveToTrash() {
        this.manager.updateStatus(I18n.t('dashboardTrashInProgress'));
        await MailboxActionService.moveToTrash([this.manager.emailId]);
        this.terminal = true;
        this.manager.updateStatus(I18n.t('dashboardTrashOneSuccess'), 'success');
    }

    async exportPdf() {
        this.manager.updateStatus(I18n.t('dashboardPdfArchiverOpening'));
        const result = await PdfArchiverIntegrationService.openReview(this.manager.emailId);
        if (result.status === 'opened') {
            this.manager.updateStatus(I18n.t('dashboardPdfArchiverOpened'), 'success');
            return;
        }
        if (result.status === 'unavailable' || result.status === 'incompatible') {
            this.pdfMessage.textContent = I18n.t(
                result.status === 'incompatible'
                    ? 'dashboardPdfArchiverIncompatible'
                    : 'dashboardPdfArchiverUnavailable'
            );
            this.pdfDialog.showModal();
            return;
        }
        throw new Error(I18n.t('dashboardPdfArchiverOpenFailed'));
    }

    createDeleteDialog() {
        this.deleteDialog = document.createElement('dialog');
        this.deleteDialog.className = 'single-mail-confirmation-dialog';
        const form = document.createElement('form');
        form.method = 'dialog';
        const heading = this.textElement('h2', '', I18n.t('dashboardConfirmationTitle'));
        const message = document.createElement('p');
        message.className = 'single-mail-confirmation-message';
        const actions = document.createElement('div');
        actions.className = 'single-mail-dialog-actions';
        const cancel = this.dialogButton('cancel', 'secondary', '✕', 'dashboardConfirmationCancel');
        const confirm = this.dialogButton('confirm', 'danger', '🗑️', 'dashboardConfirmationDelete');
        actions.append(cancel, confirm);
        form.append(heading, message, actions);
        this.deleteDialog.appendChild(form);
        document.body.appendChild(this.deleteDialog);
        this.deleteMessage = message;
    }

    createPdfDialog() {
        this.pdfDialog = document.createElement('dialog');
        this.pdfDialog.className = 'single-mail-pdf-dialog';
        const form = document.createElement('form');
        form.method = 'dialog';
        const heading = this.textElement('h2', '', I18n.t('dashboardPdfArchiverTitle'));
        this.pdfMessage = document.createElement('p');
        this.pdfMessage.className = 'single-mail-pdf-message';
        const actions = document.createElement('div');
        actions.className = 'single-mail-dialog-actions';
        const later = this.dialogButton('cancel', 'secondary', '✕', 'dashboardPdfArchiverLater');
        const install = this.dialogButton('', 'primary', '↗', 'dashboardPdfArchiverInstall');
        install.type = 'button';
        install.addEventListener('click', () => {
            PdfArchiverIntegrationService.openInstallPage()
                .then(() => this.pdfDialog.close())
                .catch(error => this.showFailure(error, 'dashboardPdfArchiverInstallFailed'));
        });
        actions.append(later, install);
        form.append(heading, this.pdfMessage, actions);
        this.pdfDialog.appendChild(form);
        document.body.appendChild(this.pdfDialog);
    }

    confirmDelete() {
        const subject = this.message?.subject || I18n.t('dashboardNoSubject');
        this.deleteMessage.textContent = I18n.t('dashboardTrashOneConfirm', { subject });
        this.deleteDialog.returnValue = '';
        this.deleteDialog.showModal();
        return new Promise(resolve => {
            this.deleteDialog.addEventListener('close', () => {
                resolve(this.deleteDialog.returnValue === 'confirm');
            }, { once: true });
        });
    }

    dialogButton(value, className, icon, textKey) {
        const button = document.createElement('button');
        button.type = 'submit';
        button.value = value;
        button.className = `single-mail-dialog-button ${className}`;
        button.append(
            this.textElement('span', 'dialog-button-icon', icon, true),
            this.textElement('span', '', I18n.t(textKey))
        );
        return button;
    }

    textElement(tagName, className, text, decorative = false) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = text;
        if (decorative) {
            element.setAttribute('aria-hidden', 'true');
        }
        return element;
    }

    setBusy(busy, activeButtonId = null) {
        this.busy = busy;
        for (const [buttonId, button] of Object.entries(this.buttons)) {
            button.classList.toggle('active-operation', busy && buttonId === activeButtonId);
        }
        this.applyButtonState();
    }

    setButtonsEnabled(enabled) {
        this.enabled = enabled;
        this.applyButtonState();
    }

    applyButtonState() {
        for (const [buttonId, button] of Object.entries(this.buttons)) {
            button.disabled = !this.enabled || this.busy || this.terminal
                || (buttonId === 'markReadBtn' && this.messageRead);
        }
    }

    showFailure(error, messageKey = null) {
        console.error('Single-message mailbox action failed:', error);
        const message = messageKey ? I18n.t(messageKey) : error?.message || I18n.t('unknownError');
        this.manager.updateStatus(message, 'error');
        this.manager.showError(message);
    }

    cleanup() {
        this.deleteDialog?.remove();
        this.pdfDialog?.remove();
        this.buttons = {};
    }
};

globalThis.MailActionsComponent = MailActionsComponent;
