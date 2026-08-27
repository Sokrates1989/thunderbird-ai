/**
 * AI Mail Assistant for Thunderbird - Actions Component
 * 
 * This module provides the action buttons functionality for the settings page.
 * It handles save, reset, and close actions.
 * 
 * @module ActionsComponent
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */

/**
 * Actions Component
 * 
 * Manages the action buttons section including save, reset, and close functionality.
 * Provides user feedback and confirmation dialogs.
 * 
 * @class ActionsComponent
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */
const ActionsComponent = class {
    /**
     * Initialize the Actions Component
     * 
     * Sets up the component, creates the UI, and attaches event listeners.
     * 
     * @constructor
     * @param {Object} settingsManager - Reference to the settings manager
     * @example
     * const actions = new ActionsComponent(settingsManager);
     */
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('actions-section');
        this.elements = {};
        
        this.initialize();
    }

    /**
     * Initialize the component
     * 
     * Creates the UI structure and sets up event listeners.
     * 
     * @example
     * this.initialize();
     */
    initialize() {
        this.createUI();
        this.attachEventListeners();
        this.persistenceAvailable = false;
        this.setPersistenceAvailable(false);
    }

    /**
     * Create the UI structure
     * 
     * Builds the HTML structure for the action buttons section.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        this.elements.saveBtn = SafeDom.create('button', {
            id: 'saveBtn',
            className: 'btn primary',
            text: `💾 ${I18n.t('saveSettings')}`
        });
        this.elements.resetBtn = SafeDom.create('button', {
            id: 'resetBtn',
            className: 'btn secondary',
            text: `🔄 ${I18n.t('resetSettings')}`
        });
        this.elements.closeBtn = SafeDom.create('button', {
            id: 'closeBtn',
            className: 'btn',
            text: `❌ ${I18n.t('close')}`
        });
        this.container.replaceChildren(
            this.elements.saveBtn,
            this.elements.resetBtn,
            this.elements.closeBtn
        );
    }

    /**
     * Attach event listeners
     * 
     * Sets up event handlers for user interactions.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        // Save settings button click
        this.elements.saveBtn.addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings button click
        this.elements.resetBtn.addEventListener('click', () => {
            this.resetSettings();
        });

        // Close button click
        this.elements.closeBtn.addEventListener('click', () => {
            this.closeSettings();
        });
    }

    /**
     * Save settings
     * 
     * Collects all settings from components and saves them to storage.
     * Shows success or error feedback to the user.
     * 
     * @async
     * @example
     * await this.saveSettings();
     */
    async saveSettings() {
        if (!this.persistenceAvailable) {
            this.settingsManager.showStatus(
                I18n.t('settingsWriteBlockedBackgroundUnavailable'),
                'error',
                0
            );
            return;
        }
        try {
            // Collect settings from all components
            const settings = this.settingsManager.collectAllSettings();
            const permissionGranted = await this.settingsManager.components.apiConfig
                .ensureEndpointPermission();
            if (!permissionGranted) {
                this.settingsManager.showStatus(I18n.t('providerPermissionDenied'), 'error');
                return;
            }

            // Show loading state
            this.elements.saveBtn.disabled = true;
            this.elements.saveBtn.textContent = `⏳ ${I18n.t('saving')}`;

            // Save settings
            const result = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.SAVE_SETTINGS, settings);
            
            if (result.success) {
                const languageChanged = settings.uiLanguage !== I18n.getLanguage();
                await I18n.setLanguage(settings.uiLanguage);
                if (languageChanged) {
                    window.location.reload();
                    return;
                }
                this.settingsManager.showStatus(I18n.t('settingsSaved'), 'success');
            } else {
                this.settingsManager.showStatus(I18n.t('settingsSaveFailed'), 'error');
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.settingsManager.showStatus(
                error?.userFacing === true ? error.message : I18n.t('settingsSaveFailed'),
                'error'
            );
        } finally {
            // Reset button state
            this.elements.saveBtn.disabled = !this.persistenceAvailable;
            this.elements.saveBtn.textContent = `💾 ${I18n.t('saveSettings')}`;
        }
    }

    /**
     * Reset settings
     * 
     * Resets all settings to their default values and saves them to storage.
     * Shows confirmation dialog before proceeding.
     * 
     * @async
     * @example
     * await this.resetSettings();
     */
    async resetSettings() {
        if (!this.persistenceAvailable) {
            this.settingsManager.showStatus(
                I18n.t('settingsWriteBlockedBackgroundUnavailable'),
                'error',
                0
            );
            return;
        }
        if (confirm(I18n.t('resetConfirm'))) {
            try {
                // Show loading state
                this.elements.resetBtn.disabled = true;
                this.elements.resetBtn.textContent = `⏳ ${I18n.t('resetting')}`;

                // Reset all components
                this.settingsManager.resetAllComponents();
                
                // Save default settings
                const defaultSettings = {
                    aiProvider: CONFIG.AI.DEFAULT_PROVIDER,
                    aiProviderConfigurations: globalThis.StorageManager
                        .normalizeProviderConfigurations({}),
                    uiLanguage: I18n.getLanguage(),
                    dashboardOpenMode: globalThis.LaunchModeService.MODES.OVERLAY,
                    singleMailOpenMode: globalThis.LaunchModeService.MODES.OVERLAY
                };

                const result = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.SAVE_SETTINGS, defaultSettings);
                
                if (result.success) {
                    this.settingsManager.showStatus(I18n.t('settingsReset'), 'success');
                } else {
                    this.settingsManager.showStatus(I18n.t('settingsResetFailed'), 'error');
                }
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.settingsManager.showStatus(I18n.t('settingsResetFailed'), 'error');
            } finally {
                // Reset button state
                this.elements.resetBtn.disabled = !this.persistenceAvailable;
                this.elements.resetBtn.textContent = `🔄 ${I18n.t('resetSettings')}`;
            }
        }
    }

    /** Disable destructive persistence controls until the authoritative settings read succeeds. */
    setPersistenceAvailable(available) {
        this.persistenceAvailable = Boolean(available);
        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = !this.persistenceAvailable;
        }
        if (this.elements.resetBtn) {
            this.elements.resetBtn.disabled = !this.persistenceAvailable;
        }
    }

    /**
     * Close settings window
     * 
     * Closes the settings window with proper cleanup.
     * Handles both popup and tab scenarios.
     * 
     * @example
     * this.closeSettings();
     */
    async closeSettings() {
        try {
            // Cleanup components
            this.settingsManager.cleanup();
            
            const currentTab = await browser.tabs.getCurrent();
            if (currentTab?.id !== undefined) {
                await browser.tabs.remove(currentTab.id);
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing settings:', error);
            // Fallback: just hide the settings
            document.body.style.display = 'none';
        }
    }
};

/**
 * Make ActionsComponent available globally for non-module environments
 * 
 * This allows the ActionsComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.ActionsComponent = ActionsComponent;
}
