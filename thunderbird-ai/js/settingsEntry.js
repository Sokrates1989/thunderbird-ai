/**
 * Thunderbird AI Assistant - Settings Entry Point
 * 
 * This module serves as the entry point for the settings page.
 * It initializes the SettingsComponent when the settings page is loaded.
 * 
 * @module SettingsEntry
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Initialize the settings interface
 * 
 * Creates and starts the SettingsComponent when the settings page is loaded.
 * This is the main entry point for the settings functionality.
 * 
 * @example
 * // Entry point starts automatically when settings page loads
 * const settings = new SettingsComponent();
 */
document.addEventListener('DOMContentLoaded', () => {
    new SettingsComponent();
}); 