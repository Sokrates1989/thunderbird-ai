/**
 * AI Mail Assistant for Thunderbird - API Test Component
 * 
 * This module provides the API testing functionality for the settings page.
 * It handles selected-provider connection testing and user feedback.
 * 
 * @module ApiTestComponent
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */

/**
 * API Test Component
 * 
 * Manages the API testing section including connection testing and result display.
 * Provides real-time feedback and error handling.
 * 
 * @class ApiTestComponent
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */
const ApiTestComponent = class {
    /**
     * Initialize the API Test Component
     * 
     * Sets up the component, creates the UI, and attaches event listeners.
     * 
     * @constructor
     * @param {Object} settingsManager - Reference to the settings manager
     * @example
     * const apiTest = new ApiTestComponent(settingsManager);
     */
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('api-test-section');
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
    }

    /**
     * Create the UI structure
     * 
     * Builds the HTML structure for the API testing section.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        const heading = SafeDom.create('h2', { text: I18n.t('apiTestTitle') });
        const section = SafeDom.create('div', { className: 'test-section' });
        this.elements.testApiBtn = SafeDom.create('button', {
            id: 'testApiBtn',
            className: 'test-btn'
        });
        SafeDom.setIconLabel(
            this.elements.testApiBtn,
            '🔍',
            I18n.t('apiTestButton'),
            'test-button-label'
        );
        this.elements.testResult = SafeDom.create('div', {
            id: 'testResult',
            className: 'test-result'
        });
        section.append(this.elements.testApiBtn, this.elements.testResult);
        this.container.replaceChildren(heading, section);
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
        // API test button click
        this.elements.testApiBtn.addEventListener('click', () => {
            this.testApiConnection();
        });
    }

    /**
     * Test API connection
     * 
     * Tests the visible provider configuration without saving it first.
     * Shows loading state and provides feedback on success or failure.
     * 
     * @async
     * @example
     * await this.testApiConnection();
     */
    async testApiConnection() {
        try {
            const apiConfig = this.settingsManager.components.apiConfig;
            const providerConfig = apiConfig.getActiveProviderConfiguration();
            const definition = CONFIG.AI.PROVIDERS[providerConfig.provider];
            if (definition.apiKeyRequired && !providerConfig.apiKey) {
                this.showTestResult(`❌ ${I18n.t('apiKeyRequiredForTest')}`, 'error');
                return;
            }
            const permissionGranted = await apiConfig.ensureEndpointPermission();
            if (!permissionGranted) {
                this.showTestResult(`❌ ${I18n.t('providerPermissionDenied')}`, 'error');
                return;
            }
            const model = providerConfig.taskModels.bulkTriage
                || globalThis.AIProviderService.resolveModel(providerConfig, 'test');

            // Show loading state
            this.elements.testApiBtn.disabled = true;
            SafeDom.setIconLabel(
                this.elements.testApiBtn,
                '⏳',
                I18n.t('apiTesting'),
                'test-button-label'
            );

            // Test the connection
            const result = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.TEST_API, {
                providerConfig,
                model
            });

            if (result.success) {
                this.showTestResult('✅ ' + result.message, 'success');
            } else {
                this.showTestResult('❌ ' + result.message, 'error');
            }

        } catch (error) {
            console.error('API test error:', error);
            this.showTestResult(
                `❌ ${error?.userFacing === true ? error.message : I18n.t('apiTestFailed')}`,
                'error'
            );
        } finally {
            // Reset button state
            this.elements.testApiBtn.disabled = false;
            SafeDom.setIconLabel(
                this.elements.testApiBtn,
                '🔍',
                I18n.t('apiTestButton'),
                'test-button-label'
            );
        }
    }

    /**
     * Show test result
     * 
     * Displays the test result with appropriate styling.
     * 
     * @param {string} message - Result message to display
     * @param {string} type - Result type ('success' or 'error')
     * @example
     * this.showTestResult('API connection successful!', 'success');
     */
    showTestResult(message, type) {
        this.elements.testResult.textContent = message;
        this.elements.testResult.className = `test-result ${type}`;
    }

    /**
     * Clear test result
     * 
     * Clears the test result display.
     * 
     * @example
     * this.clearTestResult();
     */
    clearTestResult() {
        this.elements.testResult.textContent = '';
        this.elements.testResult.className = 'test-result';
    }
};

/**
 * Make ApiTestComponent available globally for non-module environments
 * 
 * This allows the ApiTestComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.ApiTestComponent = ApiTestComponent;
}
