/**
 * Thunderbird AI Assistant - Settings Entry Point
 * 
 * This module serves as the entry point for the settings page.
 * It initializes the SettingsManager when the settings page is loaded.
 * 
 * @module SettingsEntry
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Initialize the settings interface
 * 
 * Creates and starts the SettingsManager when the settings page is loaded.
 * This is the main entry point for the settings functionality.
 * 
 * @example
 * // Entry point starts automatically when settings page loads
 * const settingsManager = new SettingsManager();
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Thunderbird AI Settings...');
    
    try {
        // Create the main settings manager
        const settingsManager = new SettingsManager();
        console.log('Settings manager initialized successfully');
        
        // Make it available globally for debugging
        window.settingsManager = settingsManager;
        
    } catch (error) {
        console.error('Failed to initialize settings manager:', error);
    }
}); 