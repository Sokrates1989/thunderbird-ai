/**
 * Owns the optional, versioned hand-off to Thunderbird PDF Archiver.
 * The AI Assistant never receives PDF data and never duplicates archive logic.
 */
const PdfArchiverIntegrationService = {
    EXTENSION_ID: 'thunderbird-pdf@felicitas-wisdom.com',
    INSTALL_URL: 'https://github.com/Sokrates1989/thunderbird-pdf-extractor-plugin#install-on-windows',
    PROTOCOL_VERSION: 1,

    /** Ask the companion add-on to open its existing review UI for one message. */
    async openReview(messageId) {
        if (!Number.isSafeInteger(messageId) || messageId <= 0) {
            return { status: 'failed' };
        }
        let response;
        try {
            response = await browser.runtime.sendMessage(this.EXTENSION_ID, {
                messageId,
                protocolVersion: this.PROTOCOL_VERSION,
                type: 'thunderbird-pdf-archiver:open-review'
            });
        } catch {
            return { status: 'unavailable' };
        }
        if (response?.success === true && response.protocolVersion === this.PROTOCOL_VERSION) {
            return { status: 'opened' };
        }
        if (response?.code === 'unsupported_protocol') {
            return { status: 'incompatible' };
        }
        return { status: 'failed' };
    },

    /** Open the companion repository where installers and setup guidance are published. */
    async openInstallPage() {
        return browser.tabs.create({ url: this.INSTALL_URL });
    }
};

globalThis.PdfArchiverIntegrationService = PdfArchiverIntegrationService;
