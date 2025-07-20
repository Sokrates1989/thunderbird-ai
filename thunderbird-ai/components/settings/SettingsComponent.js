/**
 * Thunderbird AI Assistant - Settings Component
 * 
 * This module provides the settings management component for the Thunderbird AI Assistant.
 * It handles user preferences, API configuration, and statistics display.
 * 
 * @module SettingsComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Main SettingsComponent class for managing add-on settings
 * 
 * This class handles the settings interface for the Thunderbird AI Assistant.
 * It manages API configuration, user preferences, statistics, and settings persistence.
 * 
 * @class SettingsComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const SettingsComponent = class {
    /**
     * Initialize the SettingsComponent
     * 
     * Sets up the component, initializes UI elements, attaches event listeners,
     * and loads current settings from storage.
     * 
     * @constructor
     * @example
     * const settings = new SettingsComponent();
     */
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadSettings();
    }

    /**
     * Initialize UI element references
     * 
     * Gets references to all DOM elements used by the settings component.
     * This includes form inputs, buttons, and display areas.
     * 
     * @example
     * this.initializeElements();
     */
    initializeElements() {
        // Form elements
        this.openaiApiKeyInput = document.getElementById('openaiApiKey');
        this.modelSelect = document.getElementById('model');
        this.autoProcessCheckbox = document.getElementById('autoProcess');
        
        // Buttons
        this.saveBtn = document.getElementById('saveBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.closeBtn = document.getElementById('closeBtn');
        this.testApiBtn = document.getElementById('testApiBtn');
        this.refreshStatsBtn = document.getElementById('refreshStatsBtn');
        
        // Status and results
        this.status = document.getElementById('status');
        this.testResult = document.getElementById('testResult');
        
        // Statistics
        this.emailsAnalyzed = document.getElementById('emailsAnalyzed');
        this.apiCalls = document.getElementById('apiCalls');
        this.lastUsed = document.getElementById('lastUsed');
        
        // Auto-refresh timer
        this.autoRefreshTimer = null;
    }

    /**
     * Attach event listeners to UI elements
     * 
     * Sets up click handlers and other event listeners for user interactions
     * with the settings interface.
     * 
     * @example
     * this.attachEventListeners();
     */
    attachEventListeners() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.resetBtn.addEventListener('click', () => this.resetSettings());
        this.closeBtn.addEventListener('click', () => this.closeSettings());
        this.testApiBtn.addEventListener('click', () => this.testApiConnection());
        this.refreshStatsBtn.addEventListener('click', () => this.refreshStatistics());
        
        // Start auto-refresh timer
        this.startAutoRefresh();
    }

    /**
     * Load settings from storage
     * 
     * Retrieves current settings from storage and populates the form fields.
     * Also loads and displays usage statistics.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.loadSettings();
     */
    async loadSettings() {
        try {
            const settings = await this.sendToBackground(CONFIG.ACTIONS.GET_SETTINGS);
            
            if (settings) {
                this.openaiApiKeyInput.value = settings.openaiApiKey || '';
                this.modelSelect.value = settings.model || CONFIG.OPENAI.DEFAULT_MODEL;
                this.autoProcessCheckbox.checked = settings.autoProcess || false;
            }
            
            await this.loadStatistics();
            
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus(CONFIG.ERRORS.SETTINGS_LOAD_FAILED, 'error');
        }
    }

    /**
     * Save settings to storage
     * 
     * Collects form data and saves settings to storage.
     * Shows success or error feedback to the user.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.saveSettings();
     */
    async saveSettings() {
        try {
            const settings = {
                openaiApiKey: this.openaiApiKeyInput.value.trim(),
                model: this.modelSelect.value,
                autoProcess: this.autoProcessCheckbox.checked
            };

            const result = await this.sendToBackground(CONFIG.ACTIONS.SAVE_SETTINGS, settings);
            
            if (result.success) {
                this.showStatus(CONFIG.SUCCESS.SETTINGS_SAVED, 'success');
            } else {
                this.showStatus(CONFIG.ERRORS.SETTINGS_SAVE_FAILED + ': ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus(CONFIG.ERRORS.SETTINGS_SAVE_FAILED, 'error');
        }
    }

    /**
     * Reset settings to defaults
     * 
     * Resets all settings to their default values and saves them to storage.
     * Shows confirmation dialog before proceeding.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.resetSettings();
     */
    async resetSettings() {
        if (confirm('Möchten Sie wirklich alle Einstellungen zurücksetzen?')) {
            try {
                this.openaiApiKeyInput.value = '';
                this.modelSelect.value = CONFIG.OPENAI.DEFAULT_MODEL;
                this.autoProcessCheckbox.checked = false;
                
                const result = await this.sendToBackground(CONFIG.ACTIONS.SAVE_SETTINGS, {
                    openaiApiKey: '',
                    model: CONFIG.OPENAI.DEFAULT_MODEL,
                    autoProcess: false
                });
                
                if (result.success) {
                    this.showStatus('Einstellungen zurückgesetzt!', 'success');
                } else {
                    this.showStatus('Fehler beim Zurücksetzen: ' + result.error, 'error');
                }
                
            } catch (error) {
                console.error('Error resetting settings:', error);
                this.showStatus('Fehler beim Zurücksetzen der Einstellungen', 'error');
            }
        }
    }

    /**
     * Test OpenAI API connection
     * 
     * Tests the configured API key by making a simple request to OpenAI.
     * Shows loading state and provides feedback on success or failure.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.testApiConnection();
     */
    async testApiConnection() {
        const apiKey = this.openaiApiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showTestResult('Bitte geben Sie zuerst einen API-Schlüssel ein.', 'error');
            return;
        }

        this.testApiBtn.disabled = true;
        this.testApiBtn.innerHTML = '<span class="icon">⏳</span> Teste Verbindung...';
        
        try {
            const result = await this.sendToBackground(CONFIG.ACTIONS.TEST_API, { apiKey });
            
            if (result.success) {
                this.showTestResult(CONFIG.SUCCESS.API_TEST_SUCCESS, 'success');
            } else {
                this.showTestResult('❌ API-Verbindung fehlgeschlagen: ' + result.error, 'error');
            }
            
        } catch (error) {
            console.error('API test error:', error);
            this.showTestResult('❌ Fehler beim Testen der API-Verbindung: ' + error.message, 'error');
        } finally {
            this.testApiBtn.disabled = false;
            this.testApiBtn.innerHTML = '<span class="icon">🔍</span> API-Verbindung testen';
        }
    }

    /**
     * Load usage statistics
     * 
     * Retrieves usage statistics from storage and displays them in the interface.
     * Shows emails analyzed, API calls, and last usage information.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.loadStatistics();
     */
    async loadStatistics() {
        try {
            const stats = await this.sendToBackground(CONFIG.ACTIONS.GET_STATISTICS);
            
            if (stats) {
                this.emailsAnalyzed.textContent = stats.emailsAnalyzed || 0;
                this.apiCalls.textContent = stats.apiCalls || 0;
                this.lastUsed.textContent = stats.lastUsed || 'Nie';
            }
            
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Refresh statistics manually
     * 
     * Manually refreshes the statistics display with loading state.
     * Shows feedback on success or failure.
     * 
     * @async
     * @returns {Promise<void>}
     * 
     * @example
     * await this.refreshStatistics();
     */
    async refreshStatistics() {
        try {
            this.refreshStatsBtn.disabled = true;
            this.refreshStatsBtn.innerHTML = '<span class="icon">⏳</span> Aktualisiere...';
            
            await this.loadStatistics();
            
            this.showStatus('Statistiken aktualisiert!', 'success');
            
        } catch (error) {
            console.error('Error refreshing statistics:', error);
            this.showStatus('Fehler beim Aktualisieren der Statistiken', 'error');
        } finally {
            this.refreshStatsBtn.disabled = false;
            this.refreshStatsBtn.innerHTML = '<span class="icon">🔄</span> Aktualisieren';
        }
    }

    /**
     * Start auto-refresh timer
     * 
     * Starts an automatic refresh timer that updates statistics every 30 seconds.
     * Ensures statistics stay current without manual intervention.
     * 
     * @example
     * this.startAutoRefresh();
     */
    startAutoRefresh() {
        // Refresh statistics every 30 seconds
        this.autoRefreshTimer = setInterval(() => {
            this.loadStatistics();
        }, 30000);
    }

    /**
     * Stop auto-refresh timer
     * 
     * Stops the automatic refresh timer to prevent memory leaks.
     * Should be called when the component is destroyed.
     * 
     * @example
     * this.stopAutoRefresh();
     */
    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
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
    closeSettings() {
        try {
            // Stop auto-refresh timer
            this.stopAutoRefresh();
            
            // Try to close the window if it's a popup
            if (window.opener) {
                window.close();
            } else {
                // If it's opened in a tab, redirect to a blank page or close tab
                window.location.href = 'about:blank';
            }
        } catch (error) {
            console.error('Error closing settings:', error);
            // Fallback: just hide the settings
            document.body.style.display = 'none';
        }
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
        this.status.textContent = message;
        this.status.className = `status ${type}`;
        
        setTimeout(() => {
            this.status.style.display = 'none';
        }, 5000);
    }

    /**
     * Show test result message
     * 
     * Displays a test result message with appropriate styling.
     * Used for API test results and other test feedback.
     * 
     * @param {string} message - Test result message to display
     * @param {string} type - Result type ('success', 'error')
     * @example
     * this.showTestResult('API connection successful!', 'success');
     * this.showTestResult('Connection failed', 'error');
     */
    showTestResult(message, type) {
        this.testResult.textContent = message;
        this.testResult.className = `test-result ${type}`;
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
};

/**
 * Make SettingsComponent available globally for non-module environments
 * 
 * This allows the SettingsComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.SettingsComponent = SettingsComponent;
} 