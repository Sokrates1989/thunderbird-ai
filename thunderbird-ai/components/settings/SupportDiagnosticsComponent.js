/** Read-only support report that remains usable when the background event page cannot start. */
const SupportDiagnosticsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('support-diagnostics-section');
        this.currentText = '';
        this.initialize();
    }

    initialize() {
        this.container.innerHTML = `
            <h2>🩺 ${I18n.t('supportDiagnosticsTitle')}</h2>
            <p class="help-text">${I18n.t('supportDiagnosticsHint')}</p>
            <div id="supportDiagnosticsHealth" class="support-health pending" role="status"></div>
            <details class="support-diagnostics-details">
                <summary>${I18n.t('supportDiagnosticsDetailsTitle')}</summary>
                <pre id="supportDiagnosticDetails" aria-live="polite"></pre>
            </details>
            <div class="support-diagnostic-actions">
                <button type="button" id="supportDiagnosticRefresh" class="btn secondary">
                    ↻ ${I18n.t('dashboardLaunchDiagnosticsRefresh')}
                </button>
                <button type="button" id="supportDiagnosticCopy" class="btn secondary">
                    📋 ${I18n.t('dashboardLaunchDiagnosticsCopy')}
                </button>
            </div>`;
        this.elements = {
            health: document.getElementById('supportDiagnosticsHealth'),
            details: document.getElementById('supportDiagnosticDetails'),
            refresh: document.getElementById('supportDiagnosticRefresh'),
            copy: document.getElementById('supportDiagnosticCopy')
        };
        this.elements.refresh.addEventListener('click', () => void this.refresh());
        this.elements.copy.addEventListener('click', () => void this.copy());
        void this.refresh();
    }

    /** Gather independent sources so one broken subsystem does not hide the remaining evidence. */
    async refresh() {
        this.elements.refresh.disabled = true;
        this.elements.health.className = 'support-health pending';
        this.elements.health.textContent = I18n.t('supportDiagnosticsChecking');
        try {
            const [browserInfo, launch, runtime, storedHealth, liveHealth, storageAudit] =
                await Promise.all([
                    this.capture(() => browser.runtime.getBrowserInfo?.()),
                    this.capture(() => globalThis.DashboardLaunchService.loadDiagnostic()),
                    this.capture(() => globalThis.RuntimeDiagnosticService.load()),
                    this.capture(() => globalThis.RuntimeDiagnosticService.loadBackgroundHealth()),
                    this.capture(() => this.probeBackground()),
                    this.capture(() => this.auditStorage())
                ]);
            const diagnostics = {
                browserInfo,
                launch,
                runtime,
                storedHealth,
                liveHealth,
                storageAudit
            };
            this.currentText = this.format(diagnostics);
            this.elements.details.textContent = this.currentText;
            const liveReady = liveHealth.ok
                && liveHealth.value?.success
                && liveHealth.value?.data?.state === 'ready';
            const degraded = liveReady
                && Array.isArray(liveHealth.value?.data?.warnings)
                && liveHealth.value.data.warnings.length > 0;
            let healthClass = 'failed';
            let healthMessageKey = 'supportDiagnosticsFailed';
            if (liveReady) {
                healthClass = degraded ? 'degraded' : 'healthy';
                healthMessageKey = degraded
                    ? 'supportDiagnosticsDegraded'
                    : 'supportDiagnosticsHealthy';
            }
            this.elements.health.className = `support-health ${healthClass}`;
            this.elements.health.textContent = I18n.t(healthMessageKey);
            this.elements.copy.disabled = false;
        } catch (error) {
            console.error('Could not build support diagnostics:', error);
            this.elements.health.className = 'support-health failed';
            this.elements.health.textContent = I18n.t('dashboardLaunchDiagnosticsLoadFailed');
            this.elements.copy.disabled = true;
        } finally {
            this.elements.refresh.disabled = false;
        }
    }

    async capture(operation) {
        try {
            return { ok: true, value: await operation() };
        } catch (error) {
            return {
                ok: false,
                error: globalThis.RuntimeDiagnosticService.safeTechnicalError(
                    error?.message || error?.name || error
                )
            };
        }
    }

    async probeBackground() {
        const deadline = Date.now() + CONFIG.UI.BACKGROUND_INITIALIZATION_WAIT_TIMEOUT_MS;
        let response;
        do {
            response = await globalThis.RetryService.withTimeout(
                () => browser.runtime.sendMessage({
                    action: CONFIG.ACTIONS.GET_BACKGROUND_HEALTH
                }),
                {
                    timeoutMs: 1800,
                    code: 'BACKGROUND_HEALTH_TIMEOUT',
                    stage: 'probe-background-health'
                }
            );
            if (response?.data?.state !== 'starting') {
                return response;
            }
            await globalThis.RetryService.wait(200);
        } while (Date.now() < deadline);
        return response;
    }

    /** Report presence and counts only; the API key and email contents never enter the report. */
    async auditStorage() {
        const keys = [
            CONFIG.STORAGE_KEYS.OPENAI_API_KEY,
            CONFIG.STORAGE_KEYS.AI_PROVIDER,
            CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS,
            CONFIG.STORAGE_KEYS.UI_LANGUAGE,
            CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE,
            CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE,
            CONFIG.STORAGE_KEYS.EMAILS_ANALYZED,
            CONFIG.STORAGE_KEYS.API_CALLS,
            CONFIG.STORAGE_KEYS.LAST_USED,
            CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE,
            CONFIG.STORAGE_KEYS.SAVED_RESULTS
        ];
        const stored = await browser.storage.local.get(keys);
        const provider = globalThis.AIProviderService.normalizeProviderId(
            stored[CONFIG.STORAGE_KEYS.AI_PROVIDER]
        );
        const providerConfigurations = stored[CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS];
        return {
            keysPresent: keys.filter(key => Object.hasOwn(stored, key)).length,
            provider,
            apiKeyPresent: Boolean(
                providerConfigurations?.[provider]?.apiKey
                || (provider === 'openai' && stored[CONFIG.STORAGE_KEYS.OPENAI_API_KEY])
            ),
            uiLanguage: stored[CONFIG.STORAGE_KEYS.UI_LANGUAGE] || null,
            dashboardOpenMode: stored[CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE] || null,
            singleMailOpenMode: stored[CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE] || null,
            emailsAnalyzed: Number(stored[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]) || 0,
            apiCalls: Number(stored[CONFIG.STORAGE_KEYS.API_CALLS]) || 0,
            lastUsed: stored[CONFIG.STORAGE_KEYS.LAST_USED] || null,
            scoreReferences: Array.isArray(stored[CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE])
                ? stored[CONFIG.STORAGE_KEYS.DASHBOARD_FEEDBACK_ARCHIVE].length
                : 0,
            savedResults: Array.isArray(stored[CONFIG.STORAGE_KEYS.SAVED_RESULTS])
                ? stored[CONFIG.STORAGE_KEYS.SAVED_RESULTS].length
                : 0
        };
    }

    format(diagnostics) {
        const none = I18n.t('dashboardLaunchDiagnosticNone');
        const browserVersion = diagnostics.browserInfo.ok
            ? diagnostics.browserInfo.value?.version || none
            : this.failure(diagnostics.browserInfo);
        const live = diagnostics.liveHealth.ok
            ? JSON.stringify(diagnostics.liveHealth.value?.data || diagnostics.liveHealth.value, null, 2)
            : this.failure(diagnostics.liveHealth);
        const storedHealth = diagnostics.storedHealth.ok
            ? JSON.stringify(diagnostics.storedHealth.value || none, null, 2)
            : this.failure(diagnostics.storedHealth);
        const storage = diagnostics.storageAudit.ok
            ? this.formatStorageAudit(diagnostics.storageAudit.value)
            : this.failure(diagnostics.storageAudit);
        const launch = diagnostics.launch.ok
            ? JSON.stringify(diagnostics.launch.value || none, null, 2)
            : this.failure(diagnostics.launch);
        const events = diagnostics.runtime.ok && Array.isArray(diagnostics.runtime.value)
            ? diagnostics.runtime.value.map(event => this.formatRuntimeEvent(event)).join('\n')
            : this.failure(diagnostics.runtime);
        return [
            I18n.t('supportDiagnosticsEnvironment', {
                addonVersion: CONFIG.ADDON_VERSION,
                thunderbirdVersion: browserVersion
            }),
            `${I18n.t('supportDiagnosticsLiveHealthHeading')}\n${live}`,
            `${I18n.t('supportDiagnosticsStoredHealthHeading')}\n${storedHealth}`,
            `${I18n.t('supportDiagnosticsStorageHeading')}\n${storage}`,
            `${I18n.t('supportDiagnosticsLaunchHeading')}\n${launch}`,
            `${I18n.t('supportDiagnosticsRuntimeHeading')}\n${events || I18n.t('supportDiagnosticsRuntimeEmpty')}`
        ].join('\n\n');
    }

    formatStorageAudit(audit) {
        return I18n.t('supportDiagnosticsStorageDetails', {
            keys: audit.keysPresent,
            provider: globalThis.AIProviderService.providerLabel(audit.provider),
            apiKey: I18n.t(audit.apiKeyPresent ? 'yes' : 'no'),
            language: audit.uiLanguage || '-',
            dashboardMode: audit.dashboardOpenMode || '-',
            singleMailMode: audit.singleMailOpenMode || '-',
            emails: audit.emailsAnalyzed,
            calls: audit.apiCalls,
            lastUsed: audit.lastUsed || '-',
            references: audit.scoreReferences,
            results: audit.savedResults
        });
    }

    formatRuntimeEvent(event) {
        const duration = Number.isFinite(event?.durationMs) ? `${event.durationMs} ms` : '-';
        return I18n.t('supportDiagnosticsRuntimeEntryExpanded', {
            timestamp: this.timestamp(event?.timestamp),
            session: event?.session || '-',
            context: event?.context || '-',
            action: event?.action || '-',
            state: event?.state || '-',
            code: event?.code || '-',
            stage: event?.stage || '-',
            duration,
            location: event?.location || '-'
        });
    }

    timestamp(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString(I18n.getLanguage());
    }

    failure(result) {
        return I18n.t('supportDiagnosticsSourceFailed', { error: result?.error || '-' });
    }

    async copy() {
        try {
            await navigator.clipboard.writeText(this.currentText);
            this.settingsManager.showStatus(I18n.t('dashboardLaunchDiagnosticsCopied'), 'success');
        } catch (error) {
            console.error('Could not copy support diagnostics:', error);
            this.settingsManager.showStatus(
                I18n.t('dashboardLaunchDiagnosticsCopyFailed'),
                'error'
            );
        }
    }
};

globalThis.SupportDiagnosticsComponent = SupportDiagnosticsComponent;
