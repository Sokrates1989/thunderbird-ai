/**
 * Thunderbird AI Assistant - Storage Utilities
 * 
 * This module provides a centralized storage management system for the Thunderbird AI Assistant.
 * It handles all local storage operations including settings, statistics, and user preferences.
 * 
 * @module StorageManager
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Global StorageManager object for managing local storage operations
 * 
 * This object provides methods for storing and retrieving data from Thunderbird's local storage.
 * It handles settings, statistics, and user preferences with proper error handling.
 * 
 * @namespace StorageManager
 * @type {Object}
 */
const StorageManager = {
    /**
     * Get a value from local storage
     * 
     * Retrieves a single value from the browser's local storage with optional default value.
     * Uses Thunderbird's storage API for persistence across sessions.
     * 
     * @async
     * @param {string} key - The storage key to retrieve
     * @param {*} defaultValue - Default value to return if key doesn't exist (default: null)
     * @returns {Promise<*>} The stored value or default value
     * 
     * @example
     * const apiKey = await StorageManager.get('openai_api_key', '');
     * const settings = await StorageManager.get('user_settings', { theme: 'dark' });
     */
    async get(key, defaultValue = null) {
        try {
            const result = await browser.storage.local.get([key]);
            return result[key] !== undefined ? result[key] : defaultValue;
        } catch (error) {
            console.error(`Error getting storage key ${key}:`, error);
            return defaultValue;
        }
    },

    /**
     * Set a value in local storage
     * 
     * Stores a single key-value pair in the browser's local storage.
     * Uses Thunderbird's storage API for persistence across sessions.
     * 
     * @async
     * @param {string} key - The storage key to set
     * @param {*} value - The value to store
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await StorageManager.set('openai_api_key', 'sk-...');
     * if (success) console.log('API key saved successfully');
     */
    async set(key, value) {
        try {
            await browser.storage.local.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Error setting storage key ${key}:`, error);
            return false;
        }
    },

    /**
     * Get multiple values from local storage
     * 
     * Retrieves multiple values from storage in a single operation for efficiency.
     * Returns an object with key-value pairs for all requested keys.
     * 
     * @async
     * @param {string[]} keys - Array of storage keys to retrieve
     * @returns {Promise<Object>} Object containing key-value pairs for all requested keys
     * 
     * @example
     * const data = await StorageManager.getMultiple(['api_key', 'model', 'settings']);
     * console.log(data.api_key, data.model, data.settings);
     */
    async getMultiple(keys) {
        try {
            return await browser.storage.local.get(keys);
        } catch (error) {
            console.error('Error getting multiple storage keys:', error);
            return {};
        }
    },

    /**
     * Set multiple values in local storage
     * 
     * Stores multiple key-value pairs in a single operation for efficiency.
     * Accepts an object with key-value pairs to store.
     * 
     * @async
     * @param {Object} data - Object containing key-value pairs to store
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await StorageManager.setMultiple({
     *   'api_key': 'sk-...',
     *   'model': 'gpt-4',
     *   'auto_process': true
     * });
     */
    async setMultiple(data) {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch (error) {
            console.error('Error setting multiple storage keys:', error);
            return false;
        }
    },

    /**
     * Remove a key from local storage
     * 
     * Deletes a specific key and its associated value from storage.
     * Useful for cleaning up sensitive data like API keys.
     * 
     * @async
     * @param {string} key - The storage key to remove
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await StorageManager.remove('openai_api_key');
     * if (success) console.log('API key removed successfully');
     */
    async remove(key) {
        try {
            await browser.storage.local.remove([key]);
            return true;
        } catch (error) {
            console.error(`Error removing storage key ${key}:`, error);
            return false;
        }
    },

    /**
     * Clear all local storage
     * 
     * Removes all stored data from local storage.
     * Use with caution as this will delete all user settings and statistics.
     * 
     * @async
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * if (confirm('Delete all data?')) {
     *   const success = await StorageManager.clear();
     *   if (success) console.log('All data cleared');
     * }
     */
    async clear() {
        try {
            await browser.storage.local.clear();
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    },

    /**
     * Get all application settings
     * 
     * Retrieves all user settings including API configuration, model preferences,
     * automation settings, and usage statistics.
     * 
     * @async
     * @returns {Promise<Object>} Object containing all settings
     * @returns {string} returns.openaiApiKey - OpenAI API key
     * @returns {string} returns.model - Selected AI model
     * @returns {boolean} returns.autoProcess - Auto-processing enabled flag
     * @returns {number} returns.emailsAnalyzed - Number of emails analyzed
     * @returns {number} returns.apiCalls - Number of API calls made
     * @returns {string} returns.lastUsed - Last usage timestamp
     * 
     * @example
     * const settings = await StorageManager.getSettings();
     * console.log('API Key:', settings.openaiApiKey);
     * console.log('Model:', settings.model);
     * console.log('Emails analyzed:', settings.emailsAnalyzed);
     */
    async getSettings() {
        const keys = Object.values(CONFIG.STORAGE_KEYS);
        const result = await this.getMultiple(keys);
        
        return {
            openaiApiKey: result[CONFIG.STORAGE_KEYS.OPENAI_API_KEY] || '',
            model: result[CONFIG.STORAGE_KEYS.MODEL] || CONFIG.OPENAI.DEFAULT_MODEL,
            autoProcess: result[CONFIG.STORAGE_KEYS.AUTO_PROCESS] || false,
            emailsAnalyzed: result[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED] || 0,
            apiCalls: result[CONFIG.STORAGE_KEYS.API_CALLS] || 0,
            lastUsed: result[CONFIG.STORAGE_KEYS.LAST_USED] || 'Nie'
        };
    },

    /**
     * Save application settings
     * 
     * Stores user settings including API configuration and model preferences.
     * Only saves non-statistical settings (statistics are updated separately).
     * 
     * @async
     * @param {Object} settings - Settings object to save
     * @param {string} settings.openaiApiKey - OpenAI API key
     * @param {string} settings.model - Selected AI model
     * @param {boolean} settings.autoProcess - Auto-processing enabled flag
     * @returns {Promise<boolean>} Success status of the operation
     * 
     * @example
     * const success = await StorageManager.saveSettings({
     *   openaiApiKey: 'sk-...',
     *   model: 'gpt-4',
     *   autoProcess: true
     * });
     */
    async saveSettings(settings) {
        const data = {
            [CONFIG.STORAGE_KEYS.OPENAI_API_KEY]: settings.openaiApiKey || '',
            [CONFIG.STORAGE_KEYS.MODEL]: settings.model || CONFIG.OPENAI.DEFAULT_MODEL,
            [CONFIG.STORAGE_KEYS.AUTO_PROCESS]: settings.autoProcess || false
        };
        
        return await this.setMultiple(data);
    },

    /**
     * Update usage statistics
     * 
     * Increments the appropriate counter and updates the last used timestamp.
     * Called after successful email processing operations.
     * 
     * @async
     * @param {string} type - Type of statistic to update ('email' or 'api')
     * @returns {Promise<void>}
     * 
     * @example
     * // After successful email summarization
     * await StorageManager.updateStatistics('email');
     * 
     * // After successful API call
     * await StorageManager.updateStatistics('api');
     */
    async updateStatistics(type) {
        try {
            const stats = await this.getSettings();
            
            if (type === 'email') {
                stats.emailsAnalyzed++;
            } else if (type === 'api') {
                stats.apiCalls++;
            }
            
            stats.lastUsed = new Date().toLocaleDateString('de-DE');
            
            await this.setMultiple({
                [CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]: stats.emailsAnalyzed,
                [CONFIG.STORAGE_KEYS.API_CALLS]: stats.apiCalls,
                [CONFIG.STORAGE_KEYS.LAST_USED]: stats.lastUsed
            });
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
};

/**
 * Make StorageManager available globally for non-module environments
 * 
 * This allows the StorageManager to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
} 