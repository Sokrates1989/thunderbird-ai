/**
 * Thunderbird AI Assistant - Automation Component
 * 
 * This module provides the automation settings functionality for the settings page.
 * It handles automatic email processing configuration.
 * 
 * @module AutomationComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Automation Component
 * 
 * Manages the automation settings section including auto-processing configuration.
 * Provides user feedback and validation.
 * 
 * @class AutomationComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const AutomationComponent = class {
    /**
     * Initialize the Automation Component
     * 
     * Sets up the component, creates the UI, and attaches event listeners.
     * 
     * @constructor
     * @param {Object} settingsManager - Reference to the settings manager
     * @example
     * const automation = new AutomationComponent(settingsManager);
     */
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('automation-section');
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
        this.loadCurrentSettings();
    }

    /**
     * Create the UI structure
     * 
     * Builds the HTML structure for the automation settings section.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        this.container.innerHTML = `
            <h2>${I18n.t('automationTitle')}</h2>
            <div class="setting-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="autoProcess" />
                    <span class="checkmark"></span>
                    ${I18n.t('autoProcessLabel')}
                </label>
                <div class="help-text">
                    ${I18n.t('autoProcessHelp')}
                </div>
            </div>
        `;

        // Store element references
        this.elements.autoProcessCheckbox = document.getElementById('autoProcess');
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
        // Auto-process checkbox change
        this.elements.autoProcessCheckbox.addEventListener('change', (e) => {
            this.settingsManager.notifySettingChanged('autoProcess', e.target.checked);
        });
    }

    /**
     * Load current settings
     * 
     * Populates the form with current settings from storage.
     * 
     * @async
     * @example
     * await this.loadCurrentSettings();
     */
    async loadCurrentSettings() {
        try {
            const settings = await this.settingsManager.getSettings();
            
            if (settings) {
                this.elements.autoProcessCheckbox.checked = settings.autoProcess || false;
            }
        } catch (error) {
            console.error('Error loading automation settings:', error);
        }
    }

    /**
     * Get current values
     * 
     * Returns the current values from the form fields.
     * 
     * @returns {Object} Current form values
     * @example
     * const values = this.getCurrentValues();
     */
    getCurrentValues() {
        return {
            autoProcess: this.elements.autoProcessCheckbox.checked
        };
    }

    /**
     * Update display
     * 
     * Updates the component display with new values.
     * 
     * @param {Object} settings - New settings to display
     * @example
     * this.updateDisplay({ autoProcess: true });
     */
    updateDisplay(settings) {
        if (settings.autoProcess !== undefined) {
            this.elements.autoProcessCheckbox.checked = settings.autoProcess;
        }
    }
};

/**
 * Make AutomationComponent available globally for non-module environments
 * 
 * This allows the AutomationComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.AutomationComponent = AutomationComponent;
}
