/**
 * Thunderbird AI Assistant - API Configuration Component
 * 
 * This module provides the API configuration functionality for the settings page.
 * It handles OpenAI API key and model selection.
 * 
 * @module ApiConfigComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * API Configuration Component
 * 
 * Manages the OpenAI API configuration section including API key input
 * and model selection. Provides validation and user feedback.
 * 
 * @class ApiConfigComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const ApiConfigComponent = class {
    /**
     * Initialize the API Configuration Component
     * 
     * Sets up the component, creates the UI, and attaches event listeners.
     * 
     * @constructor
     * @param {Object} settingsManager - Reference to the settings manager
     * @example
     * const apiConfig = new ApiConfigComponent(settingsManager);
     */
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('api-config-section');
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
     * Builds the HTML structure for the API configuration section.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        const modelOptions = CONFIG.OPENAI.AVAILABLE_MODELS
            .map(model => `<option value="${model.value}">${I18n.modelLabel(model.value)}</option>`)
            .join('');
        const taskSelectors = CONFIG.OPENAI.MODEL_SETTINGS.map(definition => `
            <div class="model-task-setting">
                <label for="${definition.property}">${I18n.t(definition.labelKey)}</label>
                <select id="${definition.property}" data-model-property="${definition.property}">
                    ${modelOptions}
                </select>
            </div>
        `).join('');
        this.container.innerHTML = `
            <h2>${I18n.t('apiConfigTitle')}</h2>
            <div class="setting-group">
                <label for="openaiApiKey">${I18n.t('apiKeyLabel')}</label>
                <input type="password" id="openaiApiKey" placeholder="sk-..." />
                <div class="help-text">
                    ${I18n.t('apiKeyHelp')}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">${I18n.t('apiKeyLink')}</a>
                </div>
            </div>

            <div class="setting-group">
                <label>${I18n.t('modelRoutingTitle')}</label>
                <div class="help-text" id="modelRoutingHelp">
                    ${I18n.t('modelRoutingHelp')}
                </div>
                <div class="model-task-grid" aria-describedby="modelRoutingHelp">${taskSelectors}</div>
            </div>
        `;

        // Store element references
        this.elements.apiKeyInput = document.getElementById('openaiApiKey');
        this.elements.modelSelects = Object.fromEntries(
            [...this.container.querySelectorAll('[data-model-property]')]
                .map(select => [select.dataset.modelProperty, select])
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
        // API key validation on input
        this.elements.apiKeyInput.addEventListener('input', (e) => {
            this.validateApiKey(e.target.value);
        });

        for (const [property, select] of Object.entries(this.elements.modelSelects)) {
            select.addEventListener('change', event => {
                this.settingsManager.notifySettingChanged(property, event.target.value);
            });
        }
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
                this.elements.apiKeyInput.value = settings.openaiApiKey || '';
                for (const definition of CONFIG.OPENAI.MODEL_SETTINGS) {
                    this.elements.modelSelects[definition.property].value =
                        settings[definition.property] || definition.defaultModel;
                }
            }
        } catch (error) {
            console.error('Error loading API settings:', error);
        }
    }

    /**
     * Validate API key format
     * 
     * Checks if the API key has the correct format and provides visual feedback.
     * 
     * @param {string} apiKey - The API key to validate
     * @example
     * this.validateApiKey('sk-...');
     */
    validateApiKey(apiKey) {
        const isValid = apiKey.startsWith('sk-') && apiKey.length > 20;
        
        this.elements.apiKeyInput.classList.toggle('valid', isValid);
        this.elements.apiKeyInput.classList.toggle('invalid', apiKey && !isValid);
        
        // Notify settings manager of the change
        this.settingsManager.notifySettingChanged('openaiApiKey', apiKey);
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
            openaiApiKey: this.elements.apiKeyInput.value.trim(),
            ...Object.fromEntries(
                Object.entries(this.elements.modelSelects)
                    .map(([property, select]) => [property, select.value])
            )
        };
    }

    /**
     * Update display
     * 
     * Updates the component display with new values.
     * 
     * @param {Object} settings - New settings to display
     * @example
     * this.updateDisplay({ openaiApiKey: 'sk-...', model: 'auto' });
     */
    updateDisplay(settings) {
        if (settings.openaiApiKey !== undefined) {
            this.elements.apiKeyInput.value = settings.openaiApiKey;
        }
        for (const definition of CONFIG.OPENAI.MODEL_SETTINGS) {
            const value = settings[definition.property];
            if (value !== undefined) {
                this.elements.modelSelects[definition.property].value = value;
            }
        }
    }
};

/**
 * Make ApiConfigComponent available globally for non-module environments
 * 
 * This allows the ApiConfigComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.ApiConfigComponent = ApiConfigComponent;
}
