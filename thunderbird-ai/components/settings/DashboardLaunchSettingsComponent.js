/** Settings controls for independent dashboard and single-mail launch modes. */
const DashboardLaunchSettingsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('dashboard-launch-section');
        this.elements = {};
        this.currentDiagnostics = null;
        this.initialize();
    }

    /** Render launch preferences and start a non-blocking read of the last diagnostic. */
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
            </div>
            <details class="dashboard-launch-diagnostics">
                <summary>${I18n.t('dashboardLaunchDiagnosticsTitle')}</summary>
                <p class="help-text">${I18n.t('dashboardLaunchDiagnosticsHint')}</p>
                <pre id="dashboardLaunchDiagnosticDetails" aria-live="polite"></pre>
                <div class="dashboard-launch-diagnostic-actions">
                    <button type="button" id="dashboardLaunchDiagnosticRefresh" class="btn secondary">
                        <span aria-hidden="true">↻</span>
                        <span>${I18n.t('dashboardLaunchDiagnosticsRefresh')}</span>
                    </button>
                    <button type="button" id="dashboardLaunchDiagnosticCopy" class="btn secondary">
                        <span aria-hidden="true">📋</span>
                        <span>${I18n.t('dashboardLaunchDiagnosticsCopy')}</span>
                    </button>
                </div>
            </details>`;
        this.elements.mode = document.getElementById('dashboardOpenMode');
        this.elements.singleMailMode = document.getElementById('singleMailOpenMode');
        this.elements.diagnosticDetails = document.getElementById('dashboardLaunchDiagnosticDetails');
        this.elements.diagnosticRefresh = document.getElementById('dashboardLaunchDiagnosticRefresh');
        this.elements.diagnosticCopy = document.getElementById('dashboardLaunchDiagnosticCopy');
        this.elements.mode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('dashboardOpenMode', event.target.value);
        });
        this.elements.singleMailMode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('singleMailOpenMode', event.target.value);
        });
        this.elements.diagnosticRefresh.addEventListener('click', () => {
            void this.refreshDiagnostic().catch(error => this.showDiagnosticError(error));
        });
        this.elements.diagnosticCopy.addEventListener('click', () => {
            void this.copyDiagnostic().catch(error => {
                console.error('Could not copy the dashboard launch diagnostic:', error);
                this.settingsManager.showStatus(
                    I18n.t('dashboardLaunchDiagnosticsCopyFailed'),
                    'error'
                );
            });
        });
        void this.refreshDiagnostic().catch(error => this.showDiagnosticError(error));
    }

    /** Reload the latest bounded launch record directly from extension-local storage. */
    async refreshDiagnostic() {
        this.elements.diagnosticRefresh.disabled = true;
        try {
            const browserInfoPromise = browser.runtime.getBrowserInfo
                ? browser.runtime.getBrowserInfo().catch(() => null)
                : Promise.resolve(null);
            const [launch, runtime, browserInfo] = await Promise.all([
                DashboardLaunchService.loadDiagnostic(),
                RuntimeDiagnosticService.load(),
                browserInfoPromise
            ]);
            this.currentDiagnostics = { launch, runtime, browserInfo };
            this.elements.diagnosticDetails.textContent = this.formatSupportDiagnostics(
                this.currentDiagnostics
            );
            this.elements.diagnosticCopy.disabled = !launch && !runtime.length;
        } finally {
            this.elements.diagnosticRefresh.disabled = false;
        }
    }

    /** Copy the same localized diagnostic text that is visible in settings. */
    async copyDiagnostic() {
        if (!this.currentDiagnostics) {
            return;
        }
        await navigator.clipboard.writeText(this.formatSupportDiagnostics(this.currentDiagnostics));
        this.settingsManager.showStatus(I18n.t('dashboardLaunchDiagnosticsCopied'), 'success');
    }

    /** Combine environment, launch, and recent activity without mailbox or API contents. */
    formatSupportDiagnostics(diagnostics) {
        const runtime = diagnostics?.runtime || [];
        const environment = I18n.t('supportDiagnosticsEnvironment', {
            addonVersion: CONFIG.ADDON_VERSION,
            thunderbirdVersion: diagnostics?.browserInfo?.version
                || I18n.t('dashboardLaunchDiagnosticNone')
        });
        const launch = [
            I18n.t('supportDiagnosticsLaunchHeading'),
            this.formatDiagnostic(diagnostics?.launch)
        ].join('\n');
        const activity = runtime.length
            ? runtime.map(event => this.formatRuntimeEvent(event)).join('\n')
            : I18n.t('supportDiagnosticsRuntimeEmpty');
        return [
            environment,
            launch,
            `${I18n.t('supportDiagnosticsRuntimeHeading')}\n${activity}`
        ].join('\n\n');
    }

    formatRuntimeEvent(event) {
        const stateKey = {
            started: 'supportDiagnosticStateStarted',
            completed: 'supportDiagnosticStateCompleted',
            'reported-failure': 'supportDiagnosticStateReportedFailure',
            failed: 'supportDiagnosticStateFailed',
            'uncaught-error': 'supportDiagnosticStateUncaughtError',
            'unhandled-rejection': 'supportDiagnosticStateUnhandledRejection'
        }[event?.state] || 'dashboardLaunchDiagnosticStateUnknown';
        return I18n.t('supportDiagnosticsRuntimeEntry', {
            timestamp: this.formatTimestamp(event?.timestamp),
            session: event?.session || I18n.t('dashboardLaunchDiagnosticNone'),
            context: event?.context || I18n.t('dashboardLaunchDiagnosticNone'),
            action: event?.action || I18n.t('dashboardLaunchDiagnosticNone'),
            state: I18n.t(stateKey),
            code: event?.code || I18n.t('dashboardLaunchDiagnosticNone'),
            location: event?.location || I18n.t('dashboardLaunchDiagnosticNone')
        });
    }

    /** Convert the bounded stored fields into the current UI language. */
    formatDiagnostic(diagnostic) {
        if (!diagnostic) {
            return I18n.t('dashboardLaunchDiagnosticsEmpty');
        }
        const stateKey = {
            started: 'dashboardLaunchDiagnosticStateStarted',
            focused: 'dashboardLaunchDiagnosticStateFocused',
            created: 'dashboardLaunchDiagnosticStateCreated',
            failed: 'dashboardLaunchDiagnosticStateFailed',
            'timed-out': 'dashboardLaunchDiagnosticStateTimedOut'
        }[diagnostic.state] || 'dashboardLaunchDiagnosticStateUnknown';
        const timestamp = this.formatTimestamp(diagnostic.timestamp);
        return I18n.t('dashboardLaunchDiagnosticsDetails', {
            timestamp,
            state: I18n.t(stateKey),
            stage: diagnostic.stage || I18n.t('dashboardLaunchDiagnosticNone'),
            source: diagnostic.source || I18n.t('dashboardLaunchDiagnosticNone'),
            code: diagnostic.code || I18n.t('dashboardLaunchDiagnosticNone'),
            duration: Number.isFinite(diagnostic.durationMs)
                ? diagnostic.durationMs
                : I18n.t('dashboardLaunchDiagnosticNone'),
            tab: diagnostic.tabId ?? I18n.t('dashboardLaunchDiagnosticNone'),
            window: diagnostic.windowId ?? I18n.t('dashboardLaunchDiagnosticNone'),
            fallback: diagnostic.fallbackCode || I18n.t('dashboardLaunchDiagnosticNone'),
            error: diagnostic.technicalError || I18n.t('dashboardLaunchDiagnosticNone')
        });
    }

    /** Format a valid ISO timestamp without allowing an invalid record to break Settings. */
    formatTimestamp(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return I18n.t('dashboardLaunchDiagnosticNone');
        }
        return new Intl.DateTimeFormat(I18n.getLanguage(), {
            dateStyle: 'short',
            timeStyle: 'medium'
        }).format(date);
    }

    /** Keep diagnostic failures local to this optional settings subsection. */
    showDiagnosticError(error) {
        console.error('Could not load the dashboard launch diagnostic:', error);
        this.elements.diagnosticDetails.textContent = I18n.t(
            'dashboardLaunchDiagnosticsLoadFailed'
        );
        this.elements.diagnosticCopy.disabled = true;
    }

    getCurrentValues() {
        return {
            dashboardOpenMode: LaunchModeService.normalizeMode(this.elements.mode.value),
            singleMailOpenMode: LaunchModeService.normalizeMode(
                this.elements.singleMailMode.value
            )
        };
    }

    updateDisplay(settings) {
        this.elements.mode.value = LaunchModeService.normalizeMode(settings.dashboardOpenMode);
        this.elements.singleMailMode.value = LaunchModeService.normalizeMode(
            settings.singleMailOpenMode
        );
    }
};

globalThis.DashboardLaunchSettingsComponent = DashboardLaunchSettingsComponent;
