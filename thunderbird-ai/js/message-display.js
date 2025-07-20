/**
 * Thunderbird AI Assistant - Message Display Entry Point
 * 
 * This module serves as the entry point for the message display popup.
 * It initializes the MessageDisplay component when the popup is loaded.
 * 
 * @module MessageDisplayEntry
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Initialize the message display interface
 * 
 * Creates and starts the MessageDisplay component when the popup is loaded.
 * This is the main entry point for the message display functionality.
 * 
 * @example
 * // Entry point starts automatically when popup loads
 * const messageDisplay = new MessageDisplay();
 */
document.addEventListener('DOMContentLoaded', () => {
    new MessageDisplay();
}); 