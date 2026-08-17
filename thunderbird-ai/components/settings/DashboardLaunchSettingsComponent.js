/** Settings control for choosing the global toolbar dashboard launch mode. */
const DashboardLaunchSettingsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('dashboard-launch-section');
        this.elements = {};
        this.initialize();
    }

    initialize() {
        this.container.innerHTML = `
            <h2>⛶ ${I18n.t('dashboardLaunchSettingsTitle')}</h2>
            <div class="setting-group">
                <label for="dashboardOpenMode">${I18n.t('dashboardLaunchSettingsLabel')}</label>
                <select id="dashboardOpenMode">
                    <option value="overlay">${I18n.t('dashboardLaunchModeOverlay')}</option>
                    <option value="tab">${I18n.t('dashboardLaunchModeTab')}</option>
                </select>
                <div class="help-text">${I18n.t('dashboardLaunchSettingsHint')}</div>
            </div>`;
        this.elements.mode = document.getElementById('dashboardOpenMode');
        this.elements.mode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('dashboardOpenMode', event.target.value);
        });
    }

    getCurrentValues() {
        return { dashboardOpenMode: DashboardLaunchService.normalizeMode(this.elements.mode.value) };
    }

    updateDisplay(settings) {
        this.elements.mode.value = DashboardLaunchService.normalizeMode(settings.dashboardOpenMode);
    }
};

globalThis.DashboardLaunchSettingsComponent = DashboardLaunchSettingsComponent;
