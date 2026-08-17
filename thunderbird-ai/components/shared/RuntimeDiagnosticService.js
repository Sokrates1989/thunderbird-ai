/**
 * Persists a bounded, content-free activity trail for support diagnostics.
 * Only stable action names and states are stored; email text and API data are excluded.
 */
const RuntimeDiagnosticService = {
    MAX_EVENTS: 40,
    WRITE_TIMEOUT_MS: 150,
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
            location: this.safeToken(details.location)
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
        await this.record(context, action, 'started');
        try {
            const result = await operation();
            await this.record(
                context,
                action,
                result?.success === false ? 'reported-failure' : 'completed',
                { code: result?.data?.code }
            );
            return result;
        } catch (error) {
            await this.record(context, action, 'failed', { code: error?.code || error?.name });
            throw error;
        }
    },

    async load() {
        const key = CONFIG.STORAGE_KEYS.RUNTIME_DIAGNOSTICS;
        const stored = await browser.storage.local.get(key);
        return Array.isArray(stored?.[key]) ? stored[key].slice(-this.MAX_EVENTS) : [];
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
                code: event?.reason?.name || 'PROMISE_REJECTION'
            });
        });
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
    }
};

globalThis.RuntimeDiagnosticService = RuntimeDiagnosticService;
