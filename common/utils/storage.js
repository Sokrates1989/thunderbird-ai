/** Local persistence for settings, counters, and user-requested AI results. */
const StorageManager = {
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

    normalizeModel(model) {
        const supported = new Set(CONFIG.OPENAI.AVAILABLE_MODELS.map(item => item.value));
        return supported.has(model) ? model : CONFIG.OPENAI.DEFAULT_MODEL;
    },

    /** Return settings while transparently retiring legacy GPT-3.5/GPT-4 values. */
    async getSettings() {
        const keys = Object.values(CONFIG.STORAGE_KEYS);
        const result = await this.getMultiple(keys);
        const storedModel = result[CONFIG.STORAGE_KEYS.MODEL];
        const model = this.normalizeModel(storedModel);

        if (storedModel && storedModel !== model) {
            await this.set(CONFIG.STORAGE_KEYS.MODEL, model);
        }

        return {
            openaiApiKey: result[CONFIG.STORAGE_KEYS.OPENAI_API_KEY] || '',
            model,
            autoProcess: Boolean(result[CONFIG.STORAGE_KEYS.AUTO_PROCESS]),
            emailsAnalyzed: Number(result[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]) || 0,
            apiCalls: Number(result[CONFIG.STORAGE_KEYS.API_CALLS]) || 0,
            lastUsed: result[CONFIG.STORAGE_KEYS.LAST_USED] || null,
            uiLanguage: I18n.isSupportedLanguage(result[CONFIG.STORAGE_KEYS.UI_LANGUAGE])
                ? result[CONFIG.STORAGE_KEYS.UI_LANGUAGE]
                : I18n.getLanguage()
        };
    },

    async saveSettings(settings) {
        return this.setMultiple({
            [CONFIG.STORAGE_KEYS.OPENAI_API_KEY]: String(settings.openaiApiKey || '').trim(),
            [CONFIG.STORAGE_KEYS.MODEL]: this.normalizeModel(settings.model),
            [CONFIG.STORAGE_KEYS.AUTO_PROCESS]: Boolean(settings.autoProcess),
            [CONFIG.STORAGE_KEYS.UI_LANGUAGE]: I18n.isSupportedLanguage(settings.uiLanguage)
                ? settings.uiLanguage
                : I18n.getLanguage()
        });
    },

    /** Increment one usage counter after a completed operation. */
    async updateStatistics(type) {
        const keys = [
            CONFIG.STORAGE_KEYS.EMAILS_ANALYZED,
            CONFIG.STORAGE_KEYS.API_CALLS
        ];
        const current = await this.getMultiple(keys);
        const emailsAnalyzed = Number(current[CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]) || 0;
        const apiCalls = Number(current[CONFIG.STORAGE_KEYS.API_CALLS]) || 0;

        await this.setMultiple({
            [CONFIG.STORAGE_KEYS.EMAILS_ANALYZED]: emailsAnalyzed + (type === 'email' ? 1 : 0),
            [CONFIG.STORAGE_KEYS.API_CALLS]: apiCalls + (type === 'api' ? 1 : 0),
            [CONFIG.STORAGE_KEYS.LAST_USED]: new Date().toISOString()
        });
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

    /** Store the most recent opt-in automatic analysis for each message. */
    async saveAutomaticResult(messageId, result) {
        const key = CONFIG.STORAGE_KEYS.AUTOMATIC_RESULTS;
        const results = await this.get(key, {});
        results[String(messageId)] = {
            ...result,
            createdAt: new Date().toISOString()
        };

        const bounded = Object.fromEntries(
            Object.entries(results)
                .sort((left, right) => right[1].createdAt.localeCompare(left[1].createdAt))
                .slice(0, 20)
        );
        return this.set(key, bounded);
    },

    async getAutomaticResult(messageId) {
        const results = await this.get(CONFIG.STORAGE_KEYS.AUTOMATIC_RESULTS, {});
        return results[String(messageId)] || null;
    }
};

if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
if (typeof globalThis !== 'undefined') {
    globalThis.StorageManager = StorageManager;
}
