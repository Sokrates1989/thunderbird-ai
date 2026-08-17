/** Settings control for choosing the global toolbar dashboard launch mode. */
const DashboardLaunchSettingsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('dashboard-launch-section');
        this.elements = {};
        this.currentDiagnostic = null;
        this.initialize();
    }

    /** Render launch preferences and start a non-blocking read of the last diagnostic. */
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
        this.elements.diagnosticDetails = document.getElementById('dashboardLaunchDiagnosticDetails');
        this.elements.diagnosticRefresh = document.getElementById('dashboardLaunchDiagnosticRefresh');
        this.elements.diagnosticCopy = document.getElementById('dashboardLaunchDiagnosticCopy');
        this.elements.mode.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('dashboardOpenMode', event.target.value);
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
            this.currentDiagnostic = await DashboardLaunchService.loadDiagnostic();
            this.elements.diagnosticDetails.textContent = this.formatDiagnostic(
                this.currentDiagnostic
            );
            this.elements.diagnosticCopy.disabled = !this.currentDiagnostic;
        } finally {
            this.elements.diagnosticRefresh.disabled = false;
        }
    }

    /** Copy the same localized diagnostic text that is visible in settings. */
    async copyDiagnostic() {
        if (!this.currentDiagnostic) {
            return;
        }
        await navigator.clipboard.writeText(this.formatDiagnostic(this.currentDiagnostic));
        this.settingsManager.showStatus(I18n.t('dashboardLaunchDiagnosticsCopied'), 'success');
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
        return { dashboardOpenMode: DashboardLaunchService.normalizeMode(this.elements.mode.value) };
    }

    updateDisplay(settings) {
        this.elements.mode.value = DashboardLaunchService.normalizeMode(settings.dashboardOpenMode);
    }
};

globalThis.DashboardLaunchSettingsComponent = DashboardLaunchSettingsComponent;
