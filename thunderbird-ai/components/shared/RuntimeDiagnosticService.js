/**
 * Persists a bounded, content-free activity trail for support diagnostics.
 * Only stable action names and states are stored; email text and API data are excluded.
 */
const RuntimeDiagnosticService = {
    MAX_EVENTS: 100,
    WRITE_TIMEOUT_MS: 150,
    HEALTH_STORAGE_TIMEOUT_MS: 750,
    sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    writeQueue: Promise.resolve(),
    installedContexts: new Set(),

    /** Add one sanitized event without allowing diagnostics to break the actual workflow. */
    record(context, action, state, details = {}) {
        const event = {
            timestamp: new Date().toISOString(),
            session: this.safeToken(this.sessionId),
            context: this.safeToken(context),
            action: this.safeToken(action),
            state: this.safeToken(state),
            code: this.safeToken(details.code),
            stage: this.safeToken(details.stage),
            location: this.safeToken(details.location),
            durationMs: this.safeDuration(details.durationMs)
        };
        const pendingWrite = this.writeQueue
            .catch(() => {})
            .then(async () => {
                const key = CONFIG.STORAGE_KEYS.RUNTIME_DIAGNOSTICS;
                const stored = await browser.storage.local.get(key);
                const events = Array.isArray(stored?.[key]) ? stored[key] : [];
                await browser.storage.local.set({
                    [key]: [...events, event].slice(-this.MAX_EVENTS)
                });
            })
            .catch(error => {
                console.warn('Could not persist runtime support diagnostic:', error);
            });
        this.writeQueue = Promise.race([
            pendingWrite,
            new Promise(resolve => setTimeout(resolve, this.WRITE_TIMEOUT_MS))
        ]);
        return this.writeQueue;
    },

    /** Wrap an asynchronous boundary so an unfinished last event identifies a stalled action. */
    async run(context, action, operation) {
        const startedAt = Date.now();
        await this.record(context, action, 'started');
        try {
            const result = await operation();
            await this.record(
                context,
                action,
                result?.success === false ? 'reported-failure' : 'completed',
                {
                    code: result?.data?.code,
                    stage: result?.data?.stage,
                    durationMs: Date.now() - startedAt
                }
            );
            return result;
        } catch (error) {
            await this.record(context, action, 'failed', {
                code: error?.code || error?.name,
                stage: error?.stage,
                location: this.errorLocation(error),
                durationMs: Date.now() - startedAt
            });
            throw error;
        }
    },

    async load() {
        const key = CONFIG.STORAGE_KEYS.RUNTIME_DIAGNOSTICS;
        const stored = await browser.storage.local.get(key);
        return Array.isArray(stored?.[key]) ? stored[key].slice(-this.MAX_EVENTS) : [];
    },

    /** Persist the latest background startup outcome without API keys or message content. */
    async recordBackgroundHealth(state, details = {}) {
        const key = CONFIG.STORAGE_KEYS.BACKGROUND_HEALTH_DIAGNOSTIC;
        const diagnostic = {
            timestamp: new Date().toISOString(),
            session: this.safeToken(this.sessionId),
            state: this.safeToken(state),
            code: this.safeToken(details.code),
            stage: this.safeToken(details.stage),
            location: this.safeToken(details.location),
            durationMs: this.safeDuration(details.durationMs),
            technicalError: this.safeTechnicalError(details.technicalError)
        };
        try {
            await this.withStorageTimeout(
                () => browser.storage.local.set({ [key]: diagnostic }),
                'persist-background-health'
            );
        } catch (error) {
            console.warn('Could not persist background health diagnostic:', error);
        }
        return diagnostic;
    },

    /** Load the latest content-free background startup record. */
    async loadBackgroundHealth() {
        const key = CONFIG.STORAGE_KEYS.BACKGROUND_HEALTH_DIAGNOSTIC;
        const stored = await this.withStorageTimeout(
            () => browser.storage.local.get(key),
            'load-background-health'
        );
        const diagnostic = stored?.[key];
        return diagnostic && typeof diagnostic === 'object' ? diagnostic : null;
    },

    /** Keep support-only health storage from holding the background event page open forever. */
    async withStorageTimeout(operation, stage) {
        let timeoutId;
        const timeout = new Promise((_resolve, reject) => {
            timeoutId = setTimeout(() => {
                const error = new Error(`Diagnostic storage timed out during ${stage}.`);
                error.code = 'DIAGNOSTIC_STORAGE_TIMEOUT';
                error.stage = stage;
                reject(error);
            }, this.HEALTH_STORAGE_TIMEOUT_MS);
        });
        try {
            return await Promise.race([Promise.resolve().then(operation), timeout]);
        } finally {
            clearTimeout(timeoutId);
        }
    },

    /** Capture otherwise invisible page/background failures without persisting error messages. */
    installGlobalHandlers(context) {
        if (!globalThis.addEventListener || this.installedContexts.has(context)) {
            return;
        }
        this.installedContexts.add(context);
        globalThis.addEventListener('error', event => {
            void this.record(context, 'global-error', 'uncaught-error', {
                code: event?.error?.name || 'ERROR',
                location: this.sourceLocation(event?.filename, event?.lineno, event?.colno)
            });
        });
        globalThis.addEventListener('unhandledrejection', event => {
            void this.record(context, 'unhandled-promise', 'unhandled-rejection', {
                code: event?.reason?.name || 'PROMISE_REJECTION',
                location: this.errorLocation(event?.reason)
            });
        });
    },

    /** Extract only the first source filename and position from a JavaScript stack. */
    errorLocation(error) {
        const stack = String(error?.stack || '');
        const match = stack.match(/([^\\/()\s]+\.js):(\d+):(\d+)/u);
        return match ? `${match[1]}:${match[2]}:${match[3]}` : '';
    },

    sourceLocation(filename, line, column) {
        const basename = String(filename || '').split(/[\\/]/u).pop();
        return [basename, line, column].filter(value => value !== undefined && value !== null)
            .join(':');
    },

    safeToken(value) {
        return String(value || '')
            .replace(/[^A-Za-z0-9._:-]/gu, '_')
            .slice(0, 100);
    },

    safeDuration(value) {
        const duration = Number(value);
        return Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null;
    },

    /** Bound and redact the startup-only technical note shown in Support diagnostics. */
    safeTechnicalError(value) {
        return String(value || '')
            .replace(/sk-[A-Za-z0-9_-]+/gu, '[redacted-api-key]')
            .replace(/[\r\n]+/gu, ' ')
            .slice(0, 300);
    }
};

globalThis.RuntimeDiagnosticService = RuntimeDiagnosticService;
