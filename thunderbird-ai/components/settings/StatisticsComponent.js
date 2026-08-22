/**
 * AI Mail Assistant for Thunderbird - Statistics Component
 * 
 * This module provides the statistics display functionality for the settings page.
 * It handles usage statistics and auto-refresh functionality.
 * 
 * @module StatisticsComponent
 * @author AI Mail Assistant for Thunderbird Team
 * @version 1.0.0
 */

/**
 * Statistics Component
 * 
 * Manages the statistics section including usage display and refresh functionality.
 * Provides auto-refresh and manual refresh capabilities.
 * 
 * @class StatisticsComponent
 * @author AI Mail Assistant for Thunderbird Team
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
    }

    /** Start background-backed refresh only after authoritative settings initialization. */
    start() {
        this.stopAutoRefresh();
        void this.loadStatistics().catch(error => {
            console.error('Could not load initial usage statistics:', error);
        });
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
                <h2>${I18n.t('statisticsTitle')}</h2>
                <button id="refreshStatsBtn" class="refresh-btn">
                    <span class="icon">🔄</span>
                    ${I18n.t('refresh')}
                </button>
            </div>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('emailsAnalyzedLabel')}:</span>
                    <span class="stat-value" id="emailsAnalyzed">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('apiCallsLabel')}:</span>
                    <span class="stat-value" id="apiCalls">0</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">${I18n.t('lastUsedLabel')}:</span>
                    <span class="stat-value" id="lastUsed">${I18n.t('never')}</span>
                </div>
                <div class="stat-item estimated-cost">
                    <span class="stat-label">${I18n.t('estimatedApiCostLabel')}:</span>
                    <span class="stat-value" id="estimatedApiCost">${this.formatEstimatedCost(0)}</span>
                </div>
            </div>
            <p class="usage-cost-help">
                ${I18n.t('estimatedApiCostHelp', {
                    version: CONFIG.ADDON_VERSION,
                    date: this.formatPricingDate()
                })}
                <a href="https://developers.openai.com/api/docs/models/compare" target="_blank" rel="noopener noreferrer">
                    ${I18n.t('apiPricingLink')}
                </a>
            </p>
        `;

        // Store element references
        this.elements.refreshStatsBtn = document.getElementById('refreshStatsBtn');
        this.elements.emailsAnalyzed = document.getElementById('emailsAnalyzed');
        this.elements.apiCalls = document.getElementById('apiCalls');
        this.elements.lastUsed = document.getElementById('lastUsed');
        this.elements.estimatedApiCost = document.getElementById('estimatedApiCost');
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
        const stats = await this.settingsManager.sendReadRequest(CONFIG.ACTIONS.GET_STATISTICS);
        if (!stats || stats.success === false) {
            throw new Error(stats?.error || 'STATISTICS_RESPONSE_INVALID');
        }
        this.updateDisplay(stats);
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
            this.elements.refreshStatsBtn.innerHTML = `<span class="icon">⏳</span> ${I18n.t('refreshing')}`;
            
            await this.loadStatistics();
            
            this.settingsManager.showStatus(I18n.t('statisticsUpdated'), 'success');
            
        } catch (error) {
            console.error('Error refreshing statistics:', error);
            this.settingsManager.showStatus(I18n.t('statisticsUpdateFailed'), 'error');
        } finally {
            this.elements.refreshStatsBtn.disabled = false;
            this.elements.refreshStatsBtn.innerHTML = `<span class="icon">🔄</span> ${I18n.t('refresh')}`;
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
            void this.loadStatistics().catch(error => {
                console.error('Could not auto-refresh usage statistics:', error);
            });
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
            this.elements.lastUsed.textContent = this.formatLastUsed(stats.lastUsed);
        }
        if (stats.estimatedApiCostUsd !== undefined) {
            this.elements.estimatedApiCost.textContent = this.formatEstimatedCost(
                stats.estimatedApiCostUsd
            );
        }
    }

    /** Format a small non-negative USD estimate without hiding sub-cent usage. */
    formatEstimatedCost(value) {
        const amount = Math.max(0, Number(value) || 0);
        return new Intl.NumberFormat(I18n.getLanguage(), {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 4,
            maximumFractionDigits: 6
        }).format(amount);
    }

    formatPricingDate() {
        const date = new Date(`${CONFIG.AI.PRICING_SNAPSHOT_DATE}T00:00:00Z`);
        return date.toLocaleDateString(I18n.getLanguage());
    }

    formatLastUsed(value) {
        if (!value) {
            return I18n.t('never');
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(I18n.getLanguage());
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
