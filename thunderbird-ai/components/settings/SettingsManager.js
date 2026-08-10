/**
 * Thunderbird AI Assistant - Settings Manager
 * 
 * This module provides the main settings management functionality.
 * It coordinates all UI components and handles communication with the background script.
 * 
 * @module SettingsManager
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Settings Manager
 * 
 * Main coordinator for the settings page. Manages all UI components,
 * handles communication with the background script, and provides
 * centralized settings management.
 * 
 * @class SettingsManager
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const SettingsManager = class {
    /**
     * Initialize the Settings Manager
     * 
     * Sets up the manager, creates all components, and initializes the settings page.
     * 
     * @constructor
     * @example
     * const settingsManager = new SettingsManager();
     */
    constructor() {
        this.components = {};
        this.currentSettings = {};
        this.statusElement = document.getElementById('status');
        this.statusTimer = null;
        
        this.initialize();
    }

    /**
     * Initialize the settings manager
     * 
     * Creates all UI components and sets up the settings page.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        this.createComponents();
        this.loadInitialSettings();
    }

    /**
     * Create all UI components
     * 
     * Initializes all the modular UI components.
     * 
     * @example
     * this.createComponents();
     */
    createComponents() {
        // Create all components
        this.components.apiConfig = new ApiConfigComponent(this);
        this.components.automation = new AutomationComponent(this);
        this.components.apiTest = new ApiTestComponent(this);
        this.components.statistics = new StatisticsComponent(this);
        this.components.savedResults = new SavedResultsComponent(this);
        this.components.actions = new ActionsComponent(this);
    }

    /**
     * Load initial settings
     * 
     * Loads the current settings from storage and populates all components.
     * 
     * @async
     * @example
     * await this.loadInitialSettings();
     */
    async loadInitialSettings() {
        try {
            const settings = await this.sendToBackground(CONFIG.ACTIONS.GET_SETTINGS);
            
            if (settings) {
                this.currentSettings = settings;
                this.updateAllComponents(settings);
            }
        } catch (error) {
            console.error('Error loading initial settings:', error);
            this.showStatus(I18n.t('settingsLoadFailed'), 'error');
        }
    }

    /**
     * Send message to background script
     * 
     * Sends a message to the background script and waits for a response.
     * Used for all communication with the background script.
     * 
     * @async
     * @param {string} action - Action to perform
     * @param {Object} data - Data to send with the message (default: {})
     * @returns {Promise<Object>} Response from background script
     * 
     * @example
     * const result = await this.sendToBackground('getSettings');
     * const result = await this.sendToBackground('saveSettings', { apiKey: 'sk-...' });
     */
    async sendToBackground(action, data = {}) {
        return new Promise((resolve, reject) => {
            browser.runtime.sendMessage({ action, ...data })
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Get current settings
     * 
     * Retrieves the current settings from storage.
     * 
     * @async
     * @returns {Promise<Object>} Current settings
     * @example
     * const settings = await this.getSettings();
     */
    async getSettings() {
        try {
            const settings = await this.sendToBackground(CONFIG.ACTIONS.GET_SETTINGS);
            this.currentSettings = settings;
            return settings;
        } catch (error) {
            console.error('Error getting settings:', error);
            throw error;
        }
    }

    /**
     * Collect all settings from components
     * 
     * Gathers all current values from all UI components.
     * 
     * @returns {Object} Combined settings from all components
     * @example
     * const settings = this.collectAllSettings();
     */
    collectAllSettings() {
        const apiConfigValues = this.components.apiConfig.getCurrentValues();
        const automationValues = this.components.automation.getCurrentValues();
        
        return {
            ...apiConfigValues,
            ...automationValues
        };
    }

    /**
     * Update all components
     * 
     * Updates all UI components with new settings values.
     * 
     * @param {Object} settings - New settings to display
     * @example
     * this.updateAllComponents({ openaiApiKey: 'sk-...', model: 'auto' });
     */
    updateAllComponents(settings) {
        Object.values(this.components).forEach(component => {
            if (component.updateDisplay) {
                component.updateDisplay(settings);
            }
        });
    }

    /**
     * Reset all components
     * 
     * Resets all UI components to their default values.
     * 
     * @example
     * this.resetAllComponents();
     */
    resetAllComponents() {
        const defaultSettings = {
            openaiApiKey: '',
            model: CONFIG.OPENAI.DEFAULT_MODEL,
            autoProcess: false
        };
        
        this.updateAllComponents(defaultSettings);
    }

    /**
     * Notify setting changed
     * 
     * Called by components when a setting value changes.
     * Updates the internal settings state.
     * 
     * @param {string} key - Setting key that changed
     * @param {*} value - New value for the setting
     * @example
     * this.notifySettingChanged('openaiApiKey', 'sk-...');
     */
    notifySettingChanged(key, value) {
        this.currentSettings[key] = value;
    }

    /**
     * Show status message
     * 
     * Displays a status message to the user with appropriate styling.
     * Messages automatically disappear after 5 seconds.
     * 
     * @param {string} message - Status message to display
     * @param {string} type - Status type ('success', 'error', 'info') (default: 'info')
     * @example
     * this.showStatus('Settings saved successfully!', 'success');
     * this.showStatus('An error occurred', 'error');
     */
    showStatus(message, type = 'info') {
        clearTimeout(this.statusTimer);
        this.statusElement.textContent = message;
        this.statusElement.className = `status ${type}`;
        this.statusElement.style.display = 'block';
        
        this.statusTimer = setTimeout(() => {
            this.statusElement.style.display = 'none';
        }, 5000);
    }

    /**
     * Cleanup manager
     * 
     * Performs cleanup when the settings manager is destroyed.
     * Cleans up all components and timers.
     * 
     * @example
     * this.cleanup();
     */
    cleanup() {
        clearTimeout(this.statusTimer);
        // Cleanup all components
        Object.values(this.components).forEach(component => {
            if (component.cleanup) {
                component.cleanup();
            }
        });
    }
};

/**
 * Make SettingsManager available globally for non-module environments
 * 
 * This allows the SettingsManager to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.SettingsManager = SettingsManager;
}
