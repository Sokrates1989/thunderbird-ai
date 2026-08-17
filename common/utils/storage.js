/** Local persistence for settings, counters, and user-requested AI results. */
const StorageManager = {
    _apiUsageWriteQueue: Promise.resolve(),

    async get(key, defaultValue = null) {
        try {
            const result = await browser.storage.local.get([key]);
            return result[key] === undefined ? defaultValue : result[key];
        } catch (error) {
            console.error(`Could not read storage key ${key}:`, error);
            return defaultValue;
        }
    },

    async set(key, value) {
        try {
            await browser.storage.local.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Could not write storage key ${key}:`, error);
            return false;
        }
    },

    async getMultiple(keys) {
        try {
            return await browser.storage.local.get(keys);
        } catch (error) {
            console.error('Could not read storage keys:', error);
            return {};
        }
    },

    async setMultiple(data) {
        try {
            await browser.storage.local.set(data);
            return true;
        } catch (error) {
            console.error('Could not write storage keys:', error);
            return false;
        }
    },

    normalizeModel(model, fallback = CONFIG.OPENAI.DEFAULT_MODEL) {
        const supported = new Set(CONFIG.OPENAI.AVAILABLE_MODELS.map(item => item.value));
        return supported.has(model) ? model : fallback;
    },

    normalizeDashboardOpenMode(mode) {
        return LaunchModeService.normalizeMode(mode);
    },

    /** Return settings while transparently retiring legacy GPT-3.5/GPT-4 values. */
    async getSettings() {
        const keys = Object.values(CONFIG.STORAGE_KEYS);
        const result = await this.getMultiple(keys);
        const storedModel = result[CONFIG.STORAGE_KEYS.MODEL];
        const model = this.normalizeModel(storedModel);
        const legacyFallback = storedModel && model !== CONFIG.OPENAI.DEFAULT_MODEL ? model : null;
        const taskModels = {};

        for (const definition of CONFIG.OPENAI.MODEL_SETTINGS) {
            const storedTaskModel = result[definition.storageKey];
            taskModels[definition.property] = this.normalizeModel(
                storedTaskModel,
                legacyFallback || definition.defaultModel
            );
        }

        if (storedModel && storedModel !== model) {
            await this.set(CONFIG.STORAGE_KEYS.MODEL, model);
        }

        const apiUsageByModel = this.normalizeApiUsageByModel(
            result[CONFIG.STORAGE_KEYS.API_USAGE_BY_MODEL]
        );
        return {
            openaiApiKey: result[CONFIG.STORAGE_KEYS.OPENAI_API_KEY] || '',
            model,
            ...taskModels,
            taskModels: Object.fromEntries(
                CONFIG.OPENAI.MODEL_SETTINGS.flatMap(definition => (
                    definition.tasks.map(task => [task, taskModels[definition.property]])
                ))
            ),
            emailsAnalyzed: Number(result[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]) || 0,
            apiCalls: Number(result[CONFIG.STORAGE_KEYS.API_CALLS]) || 0,
            apiUsageByModel,
            estimatedApiCostUsd: this.estimateApiCostUsd(apiUsageByModel),
            lastUsed: result[CONFIG.STORAGE_KEYS.LAST_USED] || null,
            dashboardOpenMode: this.normalizeDashboardOpenMode(
                result[CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE]
            ),
            singleMailOpenMode: this.normalizeDashboardOpenMode(
                result[CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE]
            ),
            uiLanguage: I18n.isSupportedLanguage(result[CONFIG.STORAGE_KEYS.UI_LANGUAGE])
                ? result[CONFIG.STORAGE_KEYS.UI_LANGUAGE]
                : I18n.getLanguage()
        };
    },

    async saveSettings(settings) {
        const modeKeys = [
            CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE,
            CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE
        ];
        const currentModes = await this.getMultiple(modeKeys);
        const dashboardOpenMode = Object.hasOwn(settings, 'dashboardOpenMode')
            ? settings.dashboardOpenMode
            : currentModes[CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE];
        const singleMailOpenMode = Object.hasOwn(settings, 'singleMailOpenMode')
            ? settings.singleMailOpenMode
            : currentModes[CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE];
        const values = {
            [CONFIG.STORAGE_KEYS.OPENAI_API_KEY]: String(settings.openaiApiKey || '').trim(),
            [CONFIG.STORAGE_KEYS.UI_LANGUAGE]: I18n.isSupportedLanguage(settings.uiLanguage)
                ? settings.uiLanguage
                : I18n.getLanguage(),
            [CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE]: this.normalizeDashboardOpenMode(
                dashboardOpenMode
            ),
            [CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE]: this.normalizeDashboardOpenMode(
                singleMailOpenMode
            )
        };
        for (const definition of CONFIG.OPENAI.MODEL_SETTINGS) {
            values[definition.storageKey] = this.normalizeModel(
                settings[definition.property],
                definition.defaultModel
            );
        }
        return this.setMultiple(values);
    },

    /** Increment one usage counter by the number of completed operations. */
    async updateStatistics(type, amount = 1) {
        const keys = [
            CONFIG.STORAGE_KEYS.EMAILS_ANALYZED,
            CONFIG.STORAGE_KEYS.API_CALLS
        ];
        const current = await this.getMultiple(keys);
        const emailsAnalyzed = Number(current[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]) || 0;
        const apiCalls = Number(current[CONFIG.STORAGE_KEYS.API_CALLS]) || 0;

        await this.setMultiple({
            [CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]: emailsAnalyzed + (type === 'email' ? amount : 0),
            [CONFIG.STORAGE_KEYS.API_CALLS]: apiCalls + (type === 'api' ? amount : 0),
            [CONFIG.STORAGE_KEYS.LAST_USED]: new Date().toISOString()
        });
    },

    /** Convert untrusted API or storage values into non-negative whole token counts. */
    apiTokenCount(value) {
        const count = Number(value);
        return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    },

    /** Normalize persisted per-model usage before it reaches calculations or UI. */
    normalizeApiUsageByModel(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return Object.fromEntries(Object.entries(value).map(([model, usage]) => [model, {
            inputTokens: this.apiTokenCount(usage?.inputTokens),
            cachedInputTokens: this.apiTokenCount(usage?.cachedInputTokens),
            outputTokens: this.apiTokenCount(usage?.outputTokens)
        }]));
    },

    /** Estimate the recorded text-token spend using the bundled dated price snapshot. */
    estimateApiCostUsd(usageByModel) {
        return Object.entries(this.normalizeApiUsageByModel(usageByModel))
            .reduce((total, [model, usage]) => {
                const pricing = CONFIG.OPENAI.PRICING_USD_PER_MILLION_TOKENS[model];
                if (!pricing) {
                    return total;
                }
                const cachedTokens = Math.min(usage.inputTokens, usage.cachedInputTokens);
                const uncachedTokens = usage.inputTokens - cachedTokens;
                return total
                    + ((uncachedTokens * pricing.input) / 1_000_000)
                    + ((cachedTokens * pricing.cachedInput) / 1_000_000)
                    + ((usage.outputTokens * pricing.output) / 1_000_000);
            }, 0);
    },

    /** Serialize concurrent Responses API usage writes so bulk batches cannot overwrite each other. */
    async recordApiUsage(model, usage) {
        const inputTokens = this.apiTokenCount(usage?.input_tokens);
        const cachedInputTokens = Math.min(
            inputTokens,
            this.apiTokenCount(usage?.input_tokens_details?.cached_tokens)
        );
        const outputTokens = this.apiTokenCount(usage?.output_tokens);
        if (!model || (!inputTokens && !outputTokens)) {
            return false;
        }

        const write = this._apiUsageWriteQueue.catch(() => false).then(async () => {
            const key = CONFIG.STORAGE_KEYS.API_USAGE_BY_MODEL;
            const current = await this.get(key, {});
            const byModel = this.normalizeApiUsageByModel(current);
            const previous = byModel[model] || {
                inputTokens: 0,
                cachedInputTokens: 0,
                outputTokens: 0
            };
            byModel[model] = {
                inputTokens: previous.inputTokens + inputTokens,
                cachedInputTokens: previous.cachedInputTokens + cachedInputTokens,
                outputTokens: previous.outputTokens + outputTokens
            };
            return this.set(key, byModel);
        });
        this._apiUsageWriteQueue = write.catch(() => false);
        return write;
    },

    /** Keep a bounded local history for explicit “Save” actions. */
    async saveResult(result) {
        const key = CONFIG.STORAGE_KEYS.SAVED_RESULTS;
        const savedResults = await this.get(key, []);
        savedResults.unshift({
            ...result,
            savedAt: new Date().toISOString()
        });
        return this.set(key, savedResults.slice(0, 50));
    },

};

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
if (typeof globalThis !== 'undefined') {
    globalThis.StorageManager = StorageManager;
}
