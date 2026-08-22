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

    /** Read a persistence-critical key and surface storage failures to the caller. */
    async getStrict(key, defaultValue = null) {
        const result = await browser.storage.local.get([key]);
        return result[key] === undefined ? defaultValue : result[key];
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

    /** Read persistence-critical keys without converting failures into empty defaults. */
    async getMultipleStrict(keys) {
        return browser.storage.local.get(keys);
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

    normalizeLegacyOpenAIModel(model, fallback = CONFIG.AI.DEFAULT_MODEL) {
        const supported = new Set(CONFIG.AI.AVAILABLE_MODELS.map(item => item.value));
        return supported.has(model) ? model : fallback;
    },

    /** Build explicit task defaults for one provider without sharing mutable state. */
    defaultTaskModels(providerId) {
        const provider = CONFIG.AI.PROVIDERS[providerId]
            || CONFIG.AI.PROVIDERS[CONFIG.AI.DEFAULT_PROVIDER];
        return Object.fromEntries(CONFIG.AI.MODEL_SETTINGS.flatMap(definition => (
            definition.tasks.map(task => {
                const profile = CONFIG.AI.TASK_PROFILES[task] || CONFIG.AI.TASK_PROFILES.summarize;
                return [task, provider.modelRoles[profile.modelRole] || ''];
            })
        )));
    },

    /** Normalize all provider profiles and migrate the legacy OpenAI fields in memory. */
    normalizeProviderConfigurations(value, legacy = {}) {
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const configurations = {};
        for (const providerId of Object.keys(CONFIG.AI.PROVIDERS)) {
            const raw = source[providerId] && typeof source[providerId] === 'object'
                ? source[providerId]
                : {};
            configurations[providerId] = globalThis.AIProviderService.normalizeConfiguration(
                providerId,
                {
                    ...raw,
                    defaultModel: raw.defaultModel || '',
                    taskModels: {
                        ...this.defaultTaskModels(providerId),
                        ...(raw.taskModels || {})
                    }
                }
            );
        }

        if (!source.openai) {
            const storedModel = legacy.model;
            const normalizedModel = this.normalizeLegacyOpenAIModel(storedModel);
            const legacyFallback = storedModel && normalizedModel !== CONFIG.AI.DEFAULT_MODEL
                ? normalizedModel
                : '';
            configurations.openai.apiKey = String(legacy.apiKey || '').trim();
            for (const definition of CONFIG.AI.MODEL_SETTINGS) {
                const chosen = this.normalizeLegacyOpenAIModel(
                    legacy[definition.storageKey],
                    legacyFallback || definition.defaultModel
                );
                for (const task of definition.tasks) {
                    configurations.openai.taskModels[task] = chosen;
                }
            }
        }
        return configurations;
    },

    normalizeDashboardOpenMode(mode) {
        return globalThis.LaunchModeService.normalizeMode(mode);
    },

    /** Return provider-aware settings while preserving legacy OpenAI installations. */
    async getSettings(options = {}) {
        const migrate = options.migrate !== false;
        const keys = Object.values(CONFIG.STORAGE_KEYS);
        const result = await this.getMultipleStrict(keys);
        const storedModel = result[CONFIG.STORAGE_KEYS.MODEL];
        const model = this.normalizeLegacyOpenAIModel(storedModel);
        const storedConfigurations = result[CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS];
        const providerConfigurations = this.normalizeProviderConfigurations(
            storedConfigurations,
            {
                apiKey: result[CONFIG.STORAGE_KEYS.OPENAI_API_KEY],
                model,
                ...Object.fromEntries(CONFIG.AI.MODEL_SETTINGS.map(definition => [
                    definition.storageKey,
                    result[definition.storageKey]
                ]))
            }
        );
        const aiProvider = globalThis.AIProviderService.normalizeProviderId(
            result[CONFIG.STORAGE_KEYS.AI_PROVIDER]
        );
        const providerConfig = providerConfigurations[aiProvider];
        const taskModels = providerConfig.taskModels;
        const taskProperties = Object.fromEntries(CONFIG.AI.MODEL_SETTINGS.map(definition => [
            definition.property,
            taskModels[definition.tasks[0]] || ''
        ]));

        if (migrate && (!storedConfigurations || result[CONFIG.STORAGE_KEYS.AI_PROVIDER] !== aiProvider)) {
            await this.setMultiple({
                [CONFIG.STORAGE_KEYS.AI_PROVIDER]: aiProvider,
                [CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS]: providerConfigurations
            });
        }

        const apiUsageByModel = this.normalizeApiUsageByModel(
            result[CONFIG.STORAGE_KEYS.API_USAGE_BY_MODEL]
        );
        return {
            aiProvider,
            aiProviderConfigurations: providerConfigurations,
            providerConfig,
            apiKey: providerConfig.apiKey,
            openaiApiKey: providerConfigurations.openai.apiKey,
            model,
            ...taskProperties,
            taskModels,
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
            CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE,
            CONFIG.STORAGE_KEYS.AI_PROVIDER,
            CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS,
            CONFIG.STORAGE_KEYS.OPENAI_API_KEY,
            CONFIG.STORAGE_KEYS.MODEL,
            ...CONFIG.AI.MODEL_SETTINGS.map(definition => definition.storageKey)
        ];
        const currentValues = await this.getMultipleStrict(modeKeys);
        const dashboardOpenMode = Object.hasOwn(settings, 'dashboardOpenMode')
            ? settings.dashboardOpenMode
            : currentValues[CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE];
        const singleMailOpenMode = Object.hasOwn(settings, 'singleMailOpenMode')
            ? settings.singleMailOpenMode
            : currentValues[CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE];
        const currentConfigurations = this.normalizeProviderConfigurations(
            currentValues[CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS],
            {
                apiKey: currentValues[CONFIG.STORAGE_KEYS.OPENAI_API_KEY],
                model: currentValues[CONFIG.STORAGE_KEYS.MODEL],
                ...Object.fromEntries(CONFIG.AI.MODEL_SETTINGS.map(definition => [
                    definition.storageKey,
                    currentValues[definition.storageKey]
                ]))
            }
        );
        const providerConfigurations = Object.hasOwn(settings, 'aiProviderConfigurations')
            ? this.normalizeProviderConfigurations(settings.aiProviderConfigurations)
            : currentConfigurations;
        if (!Object.hasOwn(settings, 'aiProviderConfigurations')) {
            if (Object.hasOwn(settings, 'openaiApiKey')) {
                providerConfigurations.openai.apiKey = String(settings.openaiApiKey || '').trim();
            }
            for (const definition of CONFIG.AI.MODEL_SETTINGS) {
                if (!Object.hasOwn(settings, definition.property)) {
                    continue;
                }
                for (const task of definition.tasks) {
                    providerConfigurations.openai.taskModels[task] = String(
                        settings[definition.property] || definition.defaultModel
                    ).trim();
                }
            }
        }
        const aiProvider = Object.hasOwn(settings, 'aiProvider')
            ? globalThis.AIProviderService.normalizeProviderId(settings.aiProvider)
            : globalThis.AIProviderService.normalizeProviderId(
                currentValues[CONFIG.STORAGE_KEYS.AI_PROVIDER]
            );
        const openAIConfiguration = providerConfigurations.openai;
        const values = {
            [CONFIG.STORAGE_KEYS.AI_PROVIDER]: aiProvider,
            [CONFIG.STORAGE_KEYS.AI_PROVIDER_CONFIGURATIONS]: providerConfigurations,
            [CONFIG.STORAGE_KEYS.OPENAI_API_KEY]: openAIConfiguration.apiKey,
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
        for (const definition of CONFIG.AI.MODEL_SETTINGS) {
            values[definition.storageKey] = openAIConfiguration.taskModels[definition.tasks[0]]
                || definition.defaultModel;
        }
        return this.setMultiple(values);
    },

    /** Increment one usage counter by the number of completed operations. */
    async updateStatistics(type, amount = 1) {
        const keys = [
            CONFIG.STORAGE_KEYS.EMAILS_ANALYZED,
            CONFIG.STORAGE_KEYS.API_CALLS
        ];
        const current = await this.getMultipleStrict(keys);
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
                const separator = model.indexOf(':');
                const provider = separator >= 0 ? model.slice(0, separator) : 'openai';
                const providerModel = separator >= 0 ? model.slice(separator + 1) : model;
                const pricing = provider === 'openai'
                    ? CONFIG.AI.PRICING_USD_PER_MILLION_TOKENS[providerModel]
                    : null;
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

    /** Serialize provider-qualified usage writes so bulk batches cannot overwrite each other. */
    async recordApiUsage(provider, model, usage) {
        const inputTokens = this.apiTokenCount(usage?.input_tokens);
        const cachedInputTokens = Math.min(
            inputTokens,
            this.apiTokenCount(usage?.input_tokens_details?.cached_tokens)
        );
        const outputTokens = this.apiTokenCount(usage?.output_tokens);
        if (!provider || !model || (!inputTokens && !outputTokens)) {
            return false;
        }

        const write = this._apiUsageWriteQueue.catch(() => false).then(async () => {
            const key = CONFIG.STORAGE_KEYS.API_USAGE_BY_MODEL;
            const current = await this.getStrict(key, {});
            const byModel = this.normalizeApiUsageByModel(current);
            const usageKey = `${provider}:${model}`;
            const previous = byModel[usageKey] || {
                inputTokens: 0,
                cachedInputTokens: 0,
                outputTokens: 0
            };
            byModel[usageKey] = {
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
