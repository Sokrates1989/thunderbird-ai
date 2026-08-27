/** Settings controls for independent dashboard and single-mail launch modes. */
const DashboardLaunchSettingsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('dashboard-launch-section');
        this.elements = {};
        this.initialize();
    }

    initialize() {
        const heading = SafeDom.create('h2', {
            text: `⛶ ${I18n.t('dashboardLaunchSettingsTitle')}`
        });
        const settings = SafeDom.create('div', { className: 'launch-mode-settings' });
        const dashboard = this.createModeSetting(
            'dashboardOpenMode',
            'dashboardLaunchSettingsLabel',
            'dashboardLaunchSettingsHint'
        );
        const singleMail = this.createModeSetting(
            'singleMailOpenMode',
            'singleMailLaunchSettingsLabel',
            'singleMailLaunchSettingsHint'
        );
        this.elements.mode = dashboard.select;
        this.elements.singleMailMode = singleMail.select;
        settings.append(dashboard.group, singleMail.group);
        this.container.replaceChildren(heading, settings);
        this.elements.mode.addEventListener('change', () => {
            void this.persistMode('dashboardOpenMode', this.elements.mode);
        });
        this.elements.singleMailMode.addEventListener('change', () => {
            void this.persistMode('singleMailOpenMode', this.elements.singleMailMode);
        });
    }

    /** Create one launch-mode selector with the shared overlay and tab choices. */
    createModeSetting(id, labelKey, hintKey) {
        const group = SafeDom.create('div', {
            className: 'setting-group launch-mode-setting'
        });
        const label = SafeDom.create('label', {
            text: I18n.t(labelKey),
            attributes: { for: id }
        });
        const select = SafeDom.create('select', { id });
        for (const [value, key] of [
            ['overlay', 'dashboardLaunchModeOverlay'],
            ['tab', 'dashboardLaunchModeTab']
        ]) {
            select.appendChild(SafeDom.create('option', {
                text: I18n.t(key),
                properties: { value }
            }));
        }
        const help = SafeDom.create('div', {
            className: 'help-text',
            text: I18n.t(hintKey)
        });
        group.append(label, select, help);
        return { group, select };
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
