/** Presents the optional PDF hand-off and a safe installation fallback. */
const PdfArchiverIntegrationComponent = class {
    constructor({ setStatus }) {
        this.setStatus = setStatus;
        this.elements = {
            dialog: document.getElementById('dashboardPdfArchiverDialog'),
            message: document.getElementById('dashboardPdfArchiverMessage'),
            install: document.getElementById('dashboardPdfArchiverInstall')
        };
    }

    initialize() {
        this.elements.install.addEventListener('click', () => {
            PdfArchiverIntegrationService.openInstallPage()
                .then(() => this.elements.dialog.close())
                .catch(error => {
                    console.error('Could not open PDF Archiver for Thunderbird installation page:', error);
                    this.setStatus(I18n.t('dashboardPdfArchiverInstallFailed'), 'error');
                });
        });
    }

    /** Open the companion review UI or explain how to install a compatible version. */
    async openFor(message) {
        this.setStatus(I18n.t('dashboardPdfArchiverOpening'));
        const result = await PdfArchiverIntegrationService.openReview(message.id);
        if (result.status === 'opened') {
            this.setStatus(I18n.t('dashboardPdfArchiverOpened'), 'success');
            return;
        }
        if (result.status === 'unavailable' || result.status === 'incompatible') {
            this.elements.message.textContent = I18n.t(
                result.status === 'incompatible'
                    ? 'dashboardPdfArchiverIncompatible'
                    : 'dashboardPdfArchiverUnavailable'
            );
            this.elements.dialog.showModal();
            return;
        }
        this.setStatus(I18n.t('dashboardPdfArchiverOpenFailed'), 'error');
    }
};

globalThis.PdfArchiverIntegrationComponent = PdfArchiverIntegrationComponent;
