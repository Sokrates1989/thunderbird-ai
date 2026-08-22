/**
 * AI Mail Assistant for Thunderbird - Settings Manager
 * 
 * This module provides the main settings management functionality.
 * It coordinates all UI components and handles communication with the background script.
 * 
 * @module SettingsManager
 * @author AI Mail Assistant for Thunderbird Team
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
 * @author AI Mail Assistant for Thunderbird Team
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
        this.settingsLoaded = false;
        this.statusElement = document.getElementById('status');
        this.statusTimer = null;

        this.initialization = this.initialize();
    }

    /**
     * Initialize the settings manager
     * 
     * Creates all UI components and sets up the settings page.
     * 
     * @example
     * this.initialize();
     */
    async initialize() {
        this.createComponents();
        this.components.actions.setPersistenceAvailable(false);
        await this.loadInitialSettings();
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
        this.components.language = new LanguageComponent(this);
        this.components.dashboardLaunch = new DashboardLaunchSettingsComponent(this);
        this.components.supportDiagnostics = new SupportDiagnosticsComponent(this);
        this.components.apiConfig = new ApiConfigComponent(this);
        this.components.apiTest = new ApiTestComponent(this);
        this.components.statistics = new StatisticsComponent(this);
        this.components.archiveSettings = new ArchiveSettingsGuideComponent(this);
        this.components.savedResults = new SavedResultsComponent(this);
        this.components.scoreArchive = new ScoringArchiveComponent(this);
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
            const settings = await this.sendReadRequest(CONFIG.ACTIONS.GET_SETTINGS);
            if (!settings || settings.success === false) {
                throw new Error(settings?.error || 'SETTINGS_RESPONSE_INVALID');
            }
            this.currentSettings = settings;
            this.updateAllComponents(settings);
            this.settingsLoaded = true;
            this.components.actions.setPersistenceAvailable(true);
            this.components.statistics.start();
            void this.components.scoreArchive.loadArchive();
        } catch (error) {
            console.error('Error loading initial settings:', error);
            await this.loadReadOnlyFallback(error);
        }
    }

    /** Show the actual local values without allowing a broken background to overwrite them. */
    async loadReadOnlyFallback(backgroundError) {
        try {
            const settings = await globalThis.StorageManager.getSettings({ migrate: false });
            this.currentSettings = settings;
            this.updateAllComponents(settings);
            this.components.statistics.updateDisplay(settings);
            this.components.scoreArchive.showUnavailable();
            this.setFormReadOnly(true);
            this.showStatus(I18n.t('settingsBackgroundUnavailableReadOnly'), 'error', 0);
        } catch (storageError) {
            console.error('Could not read local settings fallback:', storageError);
            this.showStatus(I18n.t('settingsLoadFailedProtected'), 'error', 0);
        }
        void this.components.supportDiagnostics.refresh();
        console.error('Background settings request failed; write controls remain disabled.', {
            backgroundError
        });
    }

    /** Prevent transient form defaults from being mistaken for writable authoritative values. */
    setFormReadOnly(readOnly) {
        const selectors = [
            '#language-section select',
            '#dashboard-launch-section select',
            '#api-config-section input',
            '#api-config-section select',
            '#api-test-section button'
        ];
        for (const element of document.querySelectorAll(selectors.join(','))) {
            element.disabled = Boolean(readOnly);
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
     * @param {Object} options - Delivery options such as an explicit read timeout
     * @returns {Promise<Object>} Response from background script
     * 
     * @example
     * const result = await this.sendToBackground('getSettings');
     * const result = await this.sendToBackground('saveSettings', providerSettings);
     */
    async sendToBackground(action, data = {}, options = {}) {
        return RetryService.sendRuntimeMessage({ action, ...data }, options);
    }

    /** Bound idempotent reads so a stalled background activates the protected local fallback. */
    async sendReadRequest(action, data = {}) {
        return this.sendToBackground(action, data, {
            timeoutMs: CONFIG.UI.SETTINGS_READ_TIMEOUT_MS,
            stage: `settings-read-${action}`
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
            const settings = await this.sendReadRequest(CONFIG.ACTIONS.GET_SETTINGS);
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
        const languageValues = this.components.language.getCurrentValues();
        const dashboardLaunchValues = this.components.dashboardLaunch.getCurrentValues();
        
        return {
            ...apiConfigValues,
            ...languageValues,
            ...dashboardLaunchValues
        };
    }

    /**
     * Update all components
     * 
     * Updates all UI components with new settings values.
     * 
     * @param {Object} settings - New settings to display
     * @example
     * this.updateAllComponents({ aiProvider: 'openai', aiProviderConfigurations });
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
            aiProvider: CONFIG.AI.DEFAULT_PROVIDER,
            aiProviderConfigurations: globalThis.StorageManager.normalizeProviderConfigurations({}),
            uiLanguage: I18n.getLanguage(),
            dashboardOpenMode: globalThis.LaunchModeService.MODES.OVERLAY,
            singleMailOpenMode: globalThis.LaunchModeService.MODES.OVERLAY
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
     * this.notifySettingChanged('aiProvider', 'anthropic');
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
    showStatus(message, type = 'info', durationMs = 5000) {
        clearTimeout(this.statusTimer);
        this.statusElement.textContent = message;
        this.statusElement.className = `status ${type}`;
        this.statusElement.style.display = 'block';
        
        if (durationMs > 0) {
            this.statusTimer = setTimeout(() => {
                this.statusElement.style.display = 'none';
            }, durationMs);
        }
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
