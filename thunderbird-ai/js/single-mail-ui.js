/**
 * Thunderbird AI Assistant - Single Mail UI Entry Point
 * 
 * This module serves as the entry point for the single mail UI popup.
 * It initializes the SingleMailManager when the popup is loaded.
 * 
 * @module SingleMailUIEntry
 * @author Thunderbird AI Assistant Team
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
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Thunderbird AI Single Mail UI...');
    
    try {
        // Get email data from URL parameters or current context
        const urlParams = new URLSearchParams(window.location.search);
        const emailId = urlParams.get('emailId');
        const emailData = urlParams.get('emailData') ? JSON.parse(decodeURIComponent(urlParams.get('emailData'))) : null;
        
        // Create the main single mail manager
        const singleMailManager = new SingleMailManager({
            emailId: emailId,
            emailData: emailData
        });
        
        // Initialize the manager
        singleMailManager.initialize().then(() => {
            console.log('Single mail manager initialized successfully');
        }).catch(error => {
            console.error('Failed to initialize single mail manager:', error);
        });
        
        // Make it available globally for debugging
        window.singleMailManager = singleMailManager;
        
    } catch (error) {
        console.error('Failed to initialize single mail manager:', error);
    }
}); 