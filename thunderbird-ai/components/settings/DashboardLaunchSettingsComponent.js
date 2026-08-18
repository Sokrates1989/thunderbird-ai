/** Settings controls for independent dashboard and single-mail launch modes. */
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
            <div class="launch-mode-settings">
                <div class="setting-group launch-mode-setting">
                    <label for="dashboardOpenMode">${I18n.t('dashboardLaunchSettingsLabel')}</label>
                    <select id="dashboardOpenMode">
                        <option value="overlay">${I18n.t('dashboardLaunchModeOverlay')}</option>
                        <option value="tab">${I18n.t('dashboardLaunchModeTab')}</option>
                    </select>
                    <div class="help-text">${I18n.t('dashboardLaunchSettingsHint')}</div>
                </div>
                <div class="setting-group launch-mode-setting">
                    <label for="singleMailOpenMode">${I18n.t('singleMailLaunchSettingsLabel')}</label>
                    <select id="singleMailOpenMode">
                        <option value="overlay">${I18n.t('dashboardLaunchModeOverlay')}</option>
                        <option value="tab">${I18n.t('dashboardLaunchModeTab')}</option>
                    </select>
                    <div class="help-text">${I18n.t('singleMailLaunchSettingsHint')}</div>
                </div>
            </div>`;
        this.elements.mode = document.getElementById('dashboardOpenMode');
        this.elements.singleMailMode = document.getElementById('singleMailOpenMode');
        this.elements.mode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('dashboardOpenMode', event.target.value);
        });
        this.elements.singleMailMode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('singleMailOpenMode', event.target.value);
        });
    }

    getCurrentValues() {
        return {
            dashboardOpenMode: globalThis.LaunchModeService.normalizeMode(
                this.elements.mode.value
            ),
            singleMailOpenMode: globalThis.LaunchModeService.normalizeMode(
                this.elements.singleMailMode.value
            )
        };
    }

    updateDisplay(settings) {
        this.elements.mode.value = globalThis.LaunchModeService.normalizeMode(
            settings.dashboardOpenMode
        );
        this.elements.singleMailMode.value = globalThis.LaunchModeService.normalizeMode(
            settings.singleMailOpenMode
        );
    }
};

globalThis.DashboardLaunchSettingsComponent = DashboardLaunchSettingsComponent;
