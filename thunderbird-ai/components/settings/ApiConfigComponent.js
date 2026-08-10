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
        this.container.innerHTML = `
            <h2>🤖 OpenAI API Konfiguration</h2>
            <div class="setting-group">
                <label for="openaiApiKey">OpenAI API-Schlüssel:</label>
                <input type="password" id="openaiApiKey" placeholder="sk-..." />
                <div class="help-text">
                    Ihr OpenAI API-Schlüssel wird für E-Mail-Zusammenfassungen verwendet. 
                    <a href="https://platform.openai.com/api-keys" target="_blank">Hier erhalten Sie einen Schlüssel</a>
                </div>
            </div>

            <div class="setting-group">
                <label for="model">AI Modell:</label>
                <select id="model">
                    ${modelOptions}
                </select>
                <div class="help-text">
                    ${I18n.t('modelHelp')}
                </div>
            </div>
        `;

        // Store element references
        this.elements.apiKeyInput = document.getElementById('openaiApiKey');
        this.elements.modelSelect = document.getElementById('model');
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

        // Model selection change
        this.elements.modelSelect.addEventListener('change', (e) => {
            this.settingsManager.notifySettingChanged('model', e.target.value);
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
                this.elements.apiKeyInput.value = settings.openaiApiKey || '';
                this.elements.modelSelect.value = settings.model || CONFIG.OPENAI.DEFAULT_MODEL;
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
            model: this.elements.modelSelect.value
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
        if (settings.model !== undefined) {
            this.elements.modelSelect.value = settings.model;
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
