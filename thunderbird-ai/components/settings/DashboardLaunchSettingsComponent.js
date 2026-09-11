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
            'dashboardLaunchSettingsHint',
            [
                ['overlay', 'dashboardLaunchModeOverlay'],
                ['tab', 'dashboardLaunchModeTab']
            ]
        );
        const singleMail = this.createModeSetting(
            'singleMailOpenMode',
            'singleMailLaunchSettingsLabel',
            'singleMailLaunchSettingsHint',
            [
                ['overlay', 'dashboardLaunchModeOverlay'],
                ['window', 'singleMailLaunchModeWindow'],
                ['tab', 'dashboardLaunchModeTab']
            ]
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

    /** Create one launch-mode selector from the choices supported by that entry point. */
    createModeSetting(id, labelKey, hintKey, options) {
        const group = SafeDom.create('div', {
            className: 'setting-group launch-mode-setting'
        });
        const label = SafeDom.create('label', {
            text: I18n.t(labelKey),
            attributes: { for: id }
        });
        const select = SafeDom.create('select', { id });
        for (const [value, key] of options) {
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
        const previousMode = this.normalizeMode(
            setting,
            this.settingsManager.currentSettings[setting]
        );
        const selectedMode = this.normalizeMode(setting, element.value);
        element.disabled = true;
        try {
            const result = await this.settingsManager.sendToBackground(
                CONFIG.ACTIONS.SET_LAUNCH_MODE,
                { setting, mode: selectedMode }
            );
            if (!result?.success) {
                throw new Error('LAUNCH_MODE_SAVE_FAILED');
            }
            this.settingsManager.notifySettingChanged(setting, selectedMode, {
                persisted: true
            });
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
            dashboardOpenMode: this.normalizeMode(
                'dashboardOpenMode',
                this.elements.mode.value
            ),
            singleMailOpenMode: this.normalizeMode(
                'singleMailOpenMode',
                this.elements.singleMailMode.value
            )
        };
    }

    updateDisplay(settings) {
        this.elements.mode.value = this.normalizeMode(
            'dashboardOpenMode',
            settings.dashboardOpenMode
        );
        this.elements.singleMailMode.value = this.normalizeMode(
            'singleMailOpenMode',
            settings.singleMailOpenMode
        );
    }

    /** Keep the dashboard's two modes separate from the single-mail window option. */
    normalizeMode(setting, value) {
        if (setting === 'dashboardOpenMode') {
            return value === globalThis.LaunchModeService.MODES.TAB
                ? globalThis.LaunchModeService.MODES.TAB
                : globalThis.LaunchModeService.MODES.OVERLAY;
        }
        return globalThis.LaunchModeService.normalizeMode(value);
    }
};

globalThis.DashboardLaunchSettingsComponent = DashboardLaunchSettingsComponent;
