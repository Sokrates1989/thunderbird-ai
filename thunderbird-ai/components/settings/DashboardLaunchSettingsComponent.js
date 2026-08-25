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
        this.elements.mode.addEventListener('change', () => {
            void this.persistMode('dashboardOpenMode', this.elements.mode);
        });
        this.elements.singleMailMode.addEventListener('change', () => {
            void this.persistMode('singleMailOpenMode', this.elements.singleMailMode);
        });
    }

    /** Save a launch selector immediately and restore its last value when persistence fails. */
    async persistMode(setting, element) {
        const previousMode = globalThis.LaunchModeService.normalizeMode(
            this.settingsManager.currentSettings[setting]
        );
        const selectedMode = globalThis.LaunchModeService.normalizeMode(element.value);
        element.disabled = true;
        try {
            const result = await this.settingsManager.sendToBackground(
                CONFIG.ACTIONS.SET_LAUNCH_MODE,
                { setting, mode: selectedMode }
            );
            if (!result?.success) {
                throw new Error('LAUNCH_MODE_SAVE_FAILED');
            }
            this.settingsManager.notifySettingChanged(setting, selectedMode);
            this.settingsManager.showStatus(I18n.t('settingsSaved'), 'success');
            return true;
        } catch (error) {
            console.error('Could not save launch mode:', error);
            element.value = previousMode;
            this.settingsManager.showStatus(I18n.t('settingsSaveFailed'), 'error');
            return false;
        } finally {
            element.disabled = false;
        }
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
