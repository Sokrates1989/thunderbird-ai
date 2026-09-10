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
        this.containers = [
            document.getElementById('actions-section-top'),
            document.getElementById('actions-section')
        ].filter(Boolean);
        this.elements = {
            saveControls: [],
            resetButtons: [],
            closeButtons: [],
            floatingSave: null
        };
        this.persistenceAvailable = false;
        this.persistedSettings = null;
        this.isDirty = false;
        this.isSaving = false;
        this.savedFeedbackVisible = false;
        this.savedFeedbackTimer = null;
        
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
        for (const container of this.containers) {
            const suffix = container.id === 'actions-section-top' ? 'Top' : '';
            const saveIcon = SafeDom.create('span', {
                className: 'icon',
                text: '💾',
                attributes: { 'aria-hidden': 'true' }
            });
            const saveLabel = SafeDom.create('span', {
                text: I18n.t('saveSettings')
            });
            const saveBtn = SafeDom.create('button', {
                id: `saveBtn${suffix}`,
                className: 'btn primary',
                attributes: { type: 'button' }
            }, [saveIcon, saveLabel]);
            const resetBtn = SafeDom.create('button', {
                id: `resetBtn${suffix}`,
                className: 'btn secondary',
                attributes: { type: 'button' }
            });
            SafeDom.setIconLabel(resetBtn, '🔄', I18n.t('resetSettings'));
            const closeBtn = SafeDom.create('button', {
                id: `closeBtn${suffix}`,
                className: 'btn',
                attributes: { type: 'button' }
            });
            SafeDom.setIconLabel(closeBtn, '❌', I18n.t('close'));
            container.replaceChildren(saveBtn, resetBtn, closeBtn);
            this.elements.saveControls.push({
                button: saveBtn,
                icon: saveIcon,
                label: saveLabel
            });
            this.elements.resetButtons.push(resetBtn);
            this.elements.closeButtons.push(closeBtn);
        }

        this.elements.floatingSave = {
            button: document.getElementById('settingsSaveFloating'),
            icon: document.getElementById('settingsSaveFloatingIcon'),
            label: document.getElementById('settingsSaveFloatingLabel')
        };
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
        for (const { button } of this.elements.saveControls) {
            button.addEventListener('click', () => {
                void this.saveSettings();
            });
        }
        this.elements.floatingSave.button.addEventListener('click', () => {
            void this.saveSettings();
        });
        for (const button of this.elements.resetButtons) {
            button.addEventListener('click', () => {
                void this.resetSettings();
            });
        }
        for (const button of this.elements.closeButtons) {
            button.addEventListener('click', () => {
                void this.closeSettings();
            });
        }
    }

    /**
     * Save settings
     * 
     * Collects all settings from components and saves them to storage.
     * Shows success or error feedback to the user.
     * 
     * @async
     * @param {Object} options - Permission and feedback behavior for this save
     * @returns {Promise<boolean>} Whether the settings were persisted
     * @example
     * await this.saveSettings();
     */
    async saveSettings(options = {}) {
        const {
            endpointPermissionGranted = false,
            showSuccessStatus = true,
            showFailureStatus = true
        } = options;
        if (!this.persistenceAvailable) {
            if (showFailureStatus) {
                this.settingsManager.showStatus(
                    I18n.t('settingsWriteBlockedBackgroundUnavailable'),
                    'error',
                    0
                );
            }
            return false;
        }
        if (this.isSaving) {
            return false;
        }
        try {
            const settings = this.settingsManager.collectAllSettings();
            const permissionGranted = endpointPermissionGranted
                || await this.settingsManager.components.apiConfig.ensureEndpointPermission();
            if (!permissionGranted) {
                if (showFailureStatus) {
                    this.settingsManager.showStatus(
                        I18n.t('providerPermissionDenied'),
                        'error'
                    );
                }
                return false;
            }

            this.setSaving(true);
            const result = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.SAVE_SETTINGS, settings);
            
            if (result.success) {
                this.settingsManager.currentSettings = {
                    ...this.settingsManager.currentSettings,
                    ...settings
                };
                this.markSettingsPersisted(settings, { showFeedback: true });
                const languageChanged = settings.uiLanguage !== I18n.getLanguage();
                await I18n.setLanguage(settings.uiLanguage);
                if (showSuccessStatus) {
                    this.settingsManager.showStatus(I18n.t('settingsSaved'), 'success');
                }
                if (languageChanged) {
                    window.location.reload();
                }
                return true;
            }
            if (showFailureStatus) {
                this.settingsManager.showStatus(I18n.t('settingsSaveFailed'), 'error');
            }
            return false;
        } catch (error) {
            console.error('Error saving settings:', error);
            if (showFailureStatus) {
                this.settingsManager.showStatus(
                    error?.userFacing === true ? error.message : I18n.t('settingsSaveFailed'),
                    'error'
                );
            }
            return false;
        } finally {
            this.setSaving(false);
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
                for (const button of this.elements.resetButtons) {
                    button.disabled = true;
                    SafeDom.setIconLabel(button, '⏳', I18n.t('resetting'));
                }
                this.setSaving(true);

                this.settingsManager.resetAllComponents();
                this.refreshDirtyState();
                
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
                    this.settingsManager.currentSettings = {
                        ...this.settingsManager.currentSettings,
                        ...defaultSettings
                    };
                    this.markSettingsPersisted(defaultSettings, { showFeedback: true });
                    this.settingsManager.showStatus(I18n.t('settingsReset'), 'success');
                } else {
                    this.settingsManager.showStatus(I18n.t('settingsResetFailed'), 'error');
                }
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.settingsManager.showStatus(I18n.t('settingsResetFailed'), 'error');
            } finally {
                this.setSaving(false);
                for (const button of this.elements.resetButtons) {
                    button.disabled = !this.persistenceAvailable;
                    SafeDom.setIconLabel(button, '🔄', I18n.t('resetSettings'));
                }
            }
        }
    }

    /** Disable destructive persistence controls until the authoritative settings read succeeds. */
    setPersistenceAvailable(available) {
        this.persistenceAvailable = Boolean(available);
        this.renderSaveState();
        for (const button of this.elements.resetButtons) {
            button.disabled = !this.persistenceAvailable || this.isSaving;
        }
    }

    /** Use deterministic plain-data ordering when comparing settings snapshots. */
    normalizeSettingsValue(value) {
        if (Array.isArray(value)) {
            return value.map(item => this.normalizeSettingsValue(item));
        }
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.keys(value).sort().map(key => [
                key,
                this.normalizeSettingsValue(value[key])
            ]));
        }
        return value;
    }

    settingsFingerprint(settings) {
        return JSON.stringify(this.normalizeSettingsValue(settings || {}));
    }

    /** Establish the authoritative snapshot represented by the currently rendered fields. */
    markSettingsPersisted(settings, { showFeedback = false } = {}) {
        this.persistedSettings = this.normalizeSettingsValue(settings || {});
        this.isDirty = false;
        clearTimeout(this.savedFeedbackTimer);
        this.savedFeedbackVisible = Boolean(showFeedback);
        if (showFeedback) {
            this.savedFeedbackTimer = setTimeout(() => {
                this.savedFeedbackVisible = false;
                this.renderSaveState();
            }, 1800);
        }
        this.renderSaveState();
    }

    /** Re-evaluate the full form while allowing independently persisted controls to stay clean. */
    handleSettingChanged(key, value, { persisted = false } = {}) {
        if (persisted && this.persistedSettings) {
            this.persistedSettings[key] = this.normalizeSettingsValue(value);
        }
        this.refreshDirtyState();
    }

    refreshDirtyState() {
        if (!this.persistedSettings) {
            return;
        }
        this.savedFeedbackVisible = false;
        clearTimeout(this.savedFeedbackTimer);
        this.isDirty = this.settingsFingerprint(this.settingsManager.collectAllSettings())
            !== this.settingsFingerprint(this.persistedSettings);
        this.renderSaveState();
    }

    setSaving(saving) {
        this.isSaving = Boolean(saving);
        this.renderSaveState();
        for (const button of this.elements.resetButtons) {
            button.disabled = !this.persistenceAvailable || this.isSaving;
        }
    }

    /** Keep the repeated and floating save controls synchronized from one state model. */
    renderSaveState() {
        const standardLabel = I18n.t(this.isSaving ? 'saving' : 'saveSettings');
        for (const control of this.elements.saveControls) {
            control.button.disabled = !this.persistenceAvailable
                || this.isSaving
                || !this.isDirty;
            control.icon.textContent = this.isSaving ? '⏳' : '💾';
            control.label.textContent = standardLabel;
        }

        const floating = this.elements.floatingSave;
        if (!floating?.button) {
            return;
        }
        const state = this.isSaving
            ? 'saving'
            : this.savedFeedbackVisible
                ? 'saved'
                : this.isDirty
                    ? 'dirty'
                    : 'clean';
        const labelKey = state === 'saving'
            ? 'saving'
            : state === 'saved'
                ? 'settingsSavedShort'
                : 'saveSettings';
        floating.button.hidden = !this.persistenceAvailable
            || (state === 'clean' && !this.savedFeedbackVisible);
        floating.button.disabled = state !== 'dirty';
        floating.button.dataset.state = state;
        floating.button.ariaLabel = I18n.t(labelKey);
        floating.button.title = I18n.t(labelKey);
        floating.icon.textContent = state === 'saving' ? '⏳' : state === 'saved' ? '✓' : '💾';
        floating.label.textContent = I18n.t(labelKey);
    }

    cleanup() {
        clearTimeout(this.savedFeedbackTimer);
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
