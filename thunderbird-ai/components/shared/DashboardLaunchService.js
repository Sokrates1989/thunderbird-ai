/**
 * Coordinates dashboard launch mode, bounded tab API calls, and persisted launch diagnostics.
 * A stalled Thunderbird API call must never keep later toolbar clicks blocked indefinitely.
 */
const DashboardLaunchService = {
    MODES: Object.freeze({ OVERLAY: 'overlay', TAB: 'tab' }),
    PROMPTS: Object.freeze({ ADOPT_TAB: 'adopt-tab', DISCOVER_TAB: 'discover-tab' }),
    openInProgress: null,

    normalizeMode(value) {
        return value === this.MODES.TAB ? this.MODES.TAB : this.MODES.OVERLAY;
    },

    async getMode() {
        const key = CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE;
        const stored = await browser.storage.local.get(key);
        return this.normalizeMode(stored[key]);
    },

    /** Apply the global toolbar behavior; onClicked is active only without a popup. */
    async applyToolbarMode(mode) {
        const popup = this.normalizeMode(mode) === this.MODES.TAB
            ? ''
            : 'global-dashboard.html';
        await browser.action.setPopup({ popup });
    },

    /** Share one bounded launch attempt across rapid callers and always release its lock. */
    async openExpanded(source = 'manual') {
        if (this.openInProgress) {
            return this.openInProgress;
        }
        this.openInProgress = this.runLaunch(source);
        try {
            return await this.openInProgress;
        } finally {
            this.openInProgress = null;
        }
    },

    /** Record one complete launch attempt and preserve its failure after the event page closes. */
    async runLaunch(source) {
        const normalizedSource = String(source || 'manual').slice(0, 80);
        const startedAt = Date.now();
        await this.persistDiagnostic({
            state: 'started',
            stage: 'launch',
            code: 'DASHBOARD_LAUNCH_STARTED',
            source: normalizedSource,
            timestamp: new Date(startedAt).toISOString()
        });
        try {
            return await this.openOrFocusExpanded(normalizedSource, startedAt);
        } catch (error) {
            const launchError = this.normalizeLaunchError(error, error?.stage || 'launch');
            await this.persistDiagnostic({
                state: launchError.code === 'DASHBOARD_LAUNCH_TIMEOUT' ? 'timed-out' : 'failed',
                stage: launchError.stage,
                code: launchError.code,
                source: normalizedSource,
                timestamp: new Date().toISOString(),
                durationMs: Date.now() - startedAt,
                technicalError: launchError.message
            });
            throw launchError;
        }
    },

    /** Focus the existing dashboard when possible and create one durable tab otherwise. */
    async openOrFocusExpanded(source, startedAt = Date.now()) {
        const dashboardUrl = browser.runtime.getURL('global-dashboard.html');
        const url = `${dashboardUrl}?view=expanded&source=${encodeURIComponent(source)}`;
        let existing = null;
        let fallbackError = null;
        try {
            existing = await this.findExpandedTab(dashboardUrl);
        } catch (error) {
            fallbackError = this.normalizeLaunchError(error, 'query-tabs');
            console.warn('Could not inspect existing dashboard tabs; opening a new one.', fallbackError);
        }
        if (existing?.id !== undefined) {
            try {
                return await this.focusExistingTab(existing, source, startedAt);
            } catch (error) {
                fallbackError = this.normalizeLaunchError(error, 'activate-tab');
                console.warn(
                    'Could not focus the existing dashboard tab; opening a new one.',
                    fallbackError
                );
            }
        }
        return this.createDashboardTab(url, source, startedAt, fallbackError);
    },

    /** Activate one known dashboard tab and record optional window-focus degradation. */
    async focusExistingTab(existing, source, startedAt) {
        const focusedTab = await this.withTimeout(
            () => browser.tabs.update(existing.id, { active: true }),
            'activate-tab'
        );
        const focusWarning = await this.focusWindow(existing.windowId);
        await this.persistDiagnostic({
            state: 'focused',
            stage: 'focus-existing-tab',
            code: 'DASHBOARD_TAB_FOCUSED',
            source,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            tabId: focusedTab?.id ?? existing.id,
            windowId: existing.windowId,
            fallbackCode: focusWarning?.code || null,
            technicalError: focusWarning?.message || null
        });
        return focusedTab;
    },

    /** Create the fallback content tab and retain why existing-tab reuse was skipped. */
    async createDashboardTab(url, source, startedAt, fallbackError) {
        const created = await this.withTimeout(
            () => browser.tabs.create({ url }),
            'create-tab'
        );
        await this.persistDiagnostic({
            state: 'created',
            stage: 'create-tab',
            code: 'DASHBOARD_TAB_CREATED',
            source,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            tabId: created?.id ?? null,
            windowId: created?.windowId ?? null,
            fallbackCode: fallbackError?.code || null,
            technicalError: fallbackError?.message || null
        });
        return created;
    },

    /** Find a content tab owned by the current extension without matching unrelated pages. */
    async findExpandedTab(dashboardUrl) {
        if (typeof browser.tabs.query !== 'function') {
            return null;
        }
        const tabs = await this.withTimeout(() => browser.tabs.query({}), 'query-tabs');
        return tabs.find(tab => tab.url === dashboardUrl
            || tab.url?.startsWith(`${dashboardUrl}?`)) || null;
    },

    /** Bring the containing window forward without allowing best-effort focus to block launches. */
    async focusWindow(windowId) {
        if (windowId === undefined || typeof browser.windows?.update !== 'function') {
            return null;
        }
        try {
            await this.withTimeout(
                () => browser.windows.update(windowId, { focused: true }),
                'focus-window',
                CONFIG.UI.DASHBOARD_WINDOW_FOCUS_TIMEOUT_MS
            );
            return null;
        } catch (error) {
            const focusError = this.normalizeLaunchError(error, 'focus-window');
            console.warn(
                'Dashboard tab was activated, but its Thunderbird window could not be focused.',
                focusError
            );
            return focusError;
        }
    },

    /** Bound a Thunderbird promise so a stalled extension API cannot poison future clicks. */
    async withTimeout(operation, stage, timeoutMs = CONFIG.UI.DASHBOARD_LAUNCH_API_TIMEOUT_MS) {
        let timeoutId;
        const timeout = new Promise((_resolve, reject) => {
            timeoutId = setTimeout(() => {
                reject(this.createLaunchError(
                    `Thunderbird did not finish ${stage} within ${timeoutMs} ms.`,
                    'DASHBOARD_LAUNCH_TIMEOUT',
                    stage
                ));
            }, timeoutMs);
        });
        try {
            return await Promise.race([Promise.resolve().then(operation), timeout]);
        } catch (error) {
            throw this.normalizeLaunchError(error, stage);
        } finally {
            clearTimeout(timeoutId);
        }
    },

    /** Create an internal error carrying stable operator-safe diagnostic fields. */
    createLaunchError(message, code, stage) {
        const error = new Error(message);
        error.code = code;
        error.stage = stage;
        return error;
    },

    /** Normalize cross-context Thunderbird rejections without exposing arbitrary objects. */
    normalizeLaunchError(error, stage) {
        const message = typeof error?.message === 'string' ? error.message : String(error);
        const normalized = new Error(message);
        normalized.code = typeof error?.code === 'string'
            ? error.code
            : 'DASHBOARD_LAUNCH_API_FAILED';
        normalized.stage = typeof error?.stage === 'string' ? error.stage : stage;
        return normalized;
    },

    /** Save only bounded technical launch metadata; launch behavior never depends on this write. */
    async persistDiagnostic(diagnostic) {
        if (typeof browser.storage?.local?.set !== 'function') {
            return;
        }
        try {
            await this.withTimeout(
                () => browser.storage.local.set({
                    [CONFIG.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC]: diagnostic
                }),
                'persist-diagnostic',
                CONFIG.UI.DASHBOARD_DIAGNOSTIC_TIMEOUT_MS
            );
        } catch (error) {
            console.warn('Could not persist the dashboard launch diagnostic.', error);
        }
    },

    /** Load the last persisted launch result for the operator-facing settings diagnostic. */
    async loadDiagnostic() {
        const key = CONFIG.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC;
        const stored = await this.withTimeout(
            () => browser.storage.local.get(key),
            'load-diagnostic',
            CONFIG.UI.DASHBOARD_DIAGNOSTIC_TIMEOUT_MS
        );
        const diagnostic = stored?.[key];
        return diagnostic && typeof diagnostic === 'object' ? diagnostic : null;
    },

    /** Count only actual overlay opens and explicit uses of the expand control. */
    async promptForOpen(locationSearch) {
        const parameters = new URLSearchParams(locationSearch || '');
        const expanded = parameters.get('view') === 'expanded';
        if (!expanded) {
            return this.incrementPromptCounter(this.PROMPTS.DISCOVER_TAB);
        }
        if (parameters.get('source') === 'manual') {
            return this.incrementPromptCounter(this.PROMPTS.ADOPT_TAB);
        }
        return null;
    },

    async incrementPromptCounter(prompt) {
        const definition = this.promptDefinition(prompt);
        const stored = await browser.storage.local.get([
            definition.countKey,
            definition.suppressedKey
        ]);
        if (stored[definition.suppressedKey] === true) {
            return null;
        }
        const previous = Number.parseInt(stored[definition.countKey], 10);
        const count = Math.min(
            definition.threshold,
            (Number.isFinite(previous) && previous > 0 ? previous : 0) + 1
        );
        await browser.storage.local.set({ [definition.countKey]: count });
        return count >= definition.threshold ? prompt : null;
    },

    /** A handled prompt starts a new counting cycle unless it was permanently dismissed. */
    async resolvePrompt(prompt, doNotShowAgain) {
        const definition = this.promptDefinition(prompt);
        await browser.storage.local.set({
            [definition.countKey]: 0,
            [definition.suppressedKey]: doNotShowAgain === true
        });
    },

    promptDefinition(prompt) {
        const keys = CONFIG.STORAGE_KEYS;
        if (prompt === this.PROMPTS.ADOPT_TAB) {
            return {
                countKey: keys.DASHBOARD_EXPAND_USE_COUNT,
                suppressedKey: keys.DASHBOARD_EXPAND_PROMPT_SUPPRESSED,
                threshold: CONFIG.UI.DASHBOARD_EXPAND_PROMPT_THRESHOLD
            };
        }
        if (prompt === this.PROMPTS.DISCOVER_TAB) {
            return {
                countKey: keys.DASHBOARD_OVERLAY_OPEN_COUNT,
                suppressedKey: keys.DASHBOARD_OVERLAY_PROMPT_SUPPRESSED,
                threshold: CONFIG.UI.DASHBOARD_OVERLAY_PROMPT_THRESHOLD
            };
        }
        throw new Error(`Unsupported dashboard launch prompt: ${String(prompt)}`);
    }
};

globalThis.DashboardLaunchService = DashboardLaunchService;
