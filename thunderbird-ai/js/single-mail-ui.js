/**
 * AI Mail Assistant for Thunderbird - Single Mail UI Entry Point
 * 
 * This module serves as the entry point for the single mail UI popup.
 * It initializes the SingleMailManager when the popup is loaded.
 * 
 * @module SingleMailUIEntry
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */

/**
 * Initialize the single mail UI interface
 * 
 * Creates and starts the SingleMailManager when the popup is loaded.
 * This is the main entry point for the single mail UI functionality.
 * 
 * @example
 * // Entry point starts automatically when popup loads
 * const singleMailManager = new SingleMailManager();
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing Thunderbird AI Single Mail UI...');
    RuntimeDiagnosticService.installGlobalHandlers('single-mail');
    
    try {
        await RuntimeDiagnosticService.run('single-mail', 'initialize', async () => {
            const parameters = new URLSearchParams(window.location.search);
            document.body.classList.toggle(
                'single-mail-expanded-view',
                parameters.get('view') === 'expanded'
            );
            await I18n.initialize();
            I18n.localizeDocument();
            // Get email data from URL parameters or current context
            const urlParams = parameters;
            const emailId = urlParams.get('emailId');
            const emailData = urlParams.get('emailData') ? JSON.parse(decodeURIComponent(urlParams.get('emailData'))) : null;

            // Create the main single mail manager
            const singleMailManager = new SingleMailManager({
                emailId: emailId,
                emailData: emailData
            });

            await singleMailManager.initialize();
            const scrollToTopComponent = new ScrollToTopComponent({
                button: document.getElementById('scrollToTopButton'),
                scrollTargets: [window]
            });
            scrollToTopComponent.initialize();
            console.log('Single mail manager initialized successfully');
            window.singleMailManager = singleMailManager;
            window.singleMailScrollToTopComponent = scrollToTopComponent;
        });
    } catch (error) {
        console.error('Failed to initialize single mail manager:', error);
    }
});
