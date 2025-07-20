/**
 * Thunderbird AI Assistant - Statistics Component
 * 
 * This module provides the statistics display functionality for the settings page.
 * It handles usage statistics and auto-refresh functionality.
 * 
 * @module StatisticsComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */

/**
 * Statistics Component
 * 
 * Manages the statistics section including usage display and refresh functionality.
 * Provides auto-refresh and manual refresh capabilities.
 * 
 * @class StatisticsComponent
 * @author Thunderbird AI Assistant Team
 * @version 1.0.0
 */
const StatisticsComponent = class {
    /**
     * Initialize the Statistics Component
     * 
     * Sets up the component, creates the UI, and attaches event listeners.
     * 
     * @constructor
     * @param {Object} settingsManager - Reference to the settings manager
     * @example
     * const statistics = new StatisticsComponent(settingsManager);
     */
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('statistics-section');
        this.elements = {};
        this.autoRefreshTimer = null;
        
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
        this.loadStatistics();
        this.startAutoRefresh();
    }

    /**
     * Create the UI structure
     * 
     * Builds the HTML structure for the statistics section.
     * 
     * @example
     * this.createUI();
     */
    createUI() {
        this.container.innerHTML = `
            <div class="stats-header">
                <h2>📊 Nutzungsstatistiken</h2>
                <button id="refreshStatsBtn" class="refresh-btn">
                    <span class="icon">🔄</span>
                    Aktualisieren
                </button>
            </div>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-label">E-Mails analysiert:</span>
                    <span class="stat-value" id="emailsAnalyzed">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">API-Aufrufe:</span>
                    <span class="stat-value" id="apiCalls">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Letzte Nutzung:</span>
                    <span class="stat-value" id="lastUsed">Nie</span>
                </div>
            </div>
        `;

        // Store element references
        this.elements.refreshStatsBtn = document.getElementById('refreshStatsBtn');
        this.elements.emailsAnalyzed = document.getElementById('emailsAnalyzed');
        this.elements.apiCalls = document.getElementById('apiCalls');
        this.elements.lastUsed = document.getElementById('lastUsed');
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
        // Refresh statistics button click
        this.elements.refreshStatsBtn.addEventListener('click', () => {
            this.refreshStatistics();
        });
    }

    /**
     * Load statistics
     * 
     * Retrieves and displays current usage statistics.
     * 
     * @async
     * @example
     * await this.loadStatistics();
     */
    async loadStatistics() {
        try {
            const stats = await this.settingsManager.sendToBackground(CONFIG.ACTIONS.GET_STATISTICS);
            
            if (stats) {
                this.elements.emailsAnalyzed.textContent = stats.emailsAnalyzed || 0;
                this.elements.apiCalls.textContent = stats.apiCalls || 0;
                this.elements.lastUsed.textContent = stats.lastUsed || 'Nie';
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
     * @example
     * await this.refreshStatistics();
     */
    async refreshStatistics() {
        try {
            this.elements.refreshStatsBtn.disabled = true;
            this.elements.refreshStatsBtn.innerHTML = '<span class="icon">⏳</span> Aktualisiere...';
            
            await this.loadStatistics();
            
            this.settingsManager.showStatus('Statistiken aktualisiert!', 'success');
            
        } catch (error) {
            console.error('Error refreshing statistics:', error);
            this.settingsManager.showStatus('Fehler beim Aktualisieren der Statistiken', 'error');
        } finally {
            this.elements.refreshStatsBtn.disabled = false;
            this.elements.refreshStatsBtn.innerHTML = '<span class="icon">🔄</span> Aktualisieren';
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
     * Update statistics display
     * 
     * Updates the statistics display with new values.
     * 
     * @param {Object} stats - New statistics to display
     * @example
     * this.updateDisplay({ emailsAnalyzed: 10, apiCalls: 5, lastUsed: '2024-01-15' });
     */
    updateDisplay(stats) {
        if (stats.emailsAnalyzed !== undefined) {
            this.elements.emailsAnalyzed.textContent = stats.emailsAnalyzed;
        }
        if (stats.apiCalls !== undefined) {
            this.elements.apiCalls.textContent = stats.apiCalls;
        }
        if (stats.lastUsed !== undefined) {
            this.elements.lastUsed.textContent = stats.lastUsed;
        }
    }

    /**
     * Cleanup component
     * 
     * Performs cleanup when the component is destroyed.
     * Stops timers and removes event listeners.
     * 
     * @example
     * this.cleanup();
     */
    cleanup() {
        this.stopAutoRefresh();
    }
};

/**
 * Make StatisticsComponent available globally for non-module environments
 * 
 * This allows the StatisticsComponent to be accessed from any script without ES6 imports.
 * Used for Thunderbird add-on compatibility.
 */
if (typeof window !== 'undefined') {
    window.StatisticsComponent = StatisticsComponent;
} 