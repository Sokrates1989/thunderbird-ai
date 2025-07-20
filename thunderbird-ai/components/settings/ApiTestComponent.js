/**
 * Thunderbird AI Assistant - API Test Component
 * 
 * This module provides the API testing functionality for the settings page.
 * It handles OpenAI API connection testing and user feedback.
 * 
 * @module ApiTestComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * API Test Component
 * 
 * Manages the API testing section including connection testing and result display.
 * Provides real-time feedback and error handling.
 * 
 * @class ApiTestComponent
 * @author Thunderbird AI Assistant Team
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
        this.container.innerHTML = `
            <h2>🧪 API Test</h2>
            <div class="test-section">
                <button id="testApiBtn" class="test-btn">
                    <span class="icon">🔍</span>
                    API-Verbindung testen
                </button>
                <div id="testResult" class="test-result"></div>
            </div>
        `;

        // Store element references
        this.elements.testApiBtn = document.getElementById('testApiBtn');
        this.elements.testResult = document.getElementById('testResult');
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
     * Tests the configured API key by making a simple request to OpenAI.
     * Shows loading state and provides feedback on success or failure.
     * 
     * @async
     * @example
     * await this.testApiConnection();
     */
    async testApiConnection() {
        try {
            // Get current API key from the input field (not saved settings)
            const apiKeyInput = document.getElementById('openaiApiKey');
            const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

            if (!apiKey) {
                this.showTestResult('❌ Kein API-Schlüssel eingegeben. Bitte geben Sie einen Schlüssel ein.', 'error');
                return;
            }

            // Show loading state
            this.elements.testApiBtn.disabled = true;
            this.elements.testApiBtn.innerHTML = '<span class="icon">⏳</span> Teste...';

            // Test the connection
            const result = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.TEST_API, { apiKey });

            if (result.success) {
                this.showTestResult('✅ ' + result.message, 'success');
            } else {
                this.showTestResult('❌ ' + result.message, 'error');
            }

        } catch (error) {
            console.error('API test error:', error);
            this.showTestResult('❌ Fehler beim Testen der API-Verbindung: ' + error.message, 'error');
        } finally {
            // Reset button state
            this.elements.testApiBtn.disabled = false;
            this.elements.testApiBtn.innerHTML = '<span class="icon">🔍</span> API-Verbindung testen';
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