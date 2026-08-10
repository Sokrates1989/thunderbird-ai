// Thunderbird AI Assistant - shared configuration and localized UI strings.

const CONFIG = {
    ADDON_NAME: 'Thunderbird AI Assistant',
    ADDON_VERSION: '1.5.1',
    ADDON_ID: 'thunderbird-ai@example.com',

    OPENAI: {
        BASE_URL: 'https://api.openai.com/v1',
        DEFAULT_MODEL: 'auto',
        AVAILABLE_MODELS: [
            {
                value: 'auto',
                labelKey: 'modelAutomatic'
            },
            {
                value: 'gpt-5.6-luna',
                labelKey: 'modelLuna'
            },
            {
                value: 'gpt-5.6-terra',
                labelKey: 'modelTerra'
            },
            {
                value: 'gpt-5.6-sol',
                labelKey: 'modelSol'
            }
        ],
        TASK_PROFILES: {
            summarize: { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', maxOutputTokens: 1200 },
            reply: { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            replyRefine: { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            categorize: { model: 'gpt-5.6-luna', effort: 'low', verbosity: 'low', maxOutputTokens: 350 },
            importance: { model: 'gpt-5.6-luna', effort: 'low', verbosity: 'low', maxOutputTokens: 350 },
            chat: { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', maxOutputTokens: 1200 },
            translate: { model: 'gpt-5.6-luna', effort: 'low', verbosity: 'medium', maxOutputTokens: 1800 },
            extract: { model: 'gpt-5.6-luna', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            spam: { model: 'gpt-5.6-luna', effort: 'low', verbosity: 'low', maxOutputTokens: 450 },
            improve: { model: 'gpt-5.6-terra', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            test: { model: 'gpt-5.6-luna', effort: 'none', verbosity: 'low', maxOutputTokens: 20 }
        },
        MAX_EMAIL_CHARACTERS: 50000,
        MAX_REPLY_DRAFT_CHARACTERS: 20000,
        MAX_REPLY_INSTRUCTION_CHARACTERS: 4000
    },

    STORAGE_KEYS: {
        OPENAI_API_KEY: 'openaiApiKey',
        MODEL: 'model',
        AUTO_PROCESS: 'autoProcess',
        EMAILS_ANALYZED: 'emailsAnalyzed',
        API_CALLS: 'apiCalls',
        LAST_USED: 'lastUsed',
        SAVED_RESULTS: 'savedResults',
        AUTOMATIC_RESULTS: 'automaticResults',
        UI_LANGUAGE: 'uiLanguage',
        INSTALLER_LANGUAGE_VERSION: 'installerLanguageVersion',
        REPLY_INCLUDE_ORIGINAL: 'replyIncludeOriginal',
        REPLY_TO_ALL: 'replyToAll',
        REPLY_INCLUDE_ATTACHMENTS: 'replyIncludeAttachments'
    },

    UI: {
        POPUP_WIDTH: 450,
        POPUP_HEIGHT: 600,
        TOAST_DURATION: 3000,
        LOADING_TIMEOUT: 60000
    },

    ACTIONS: {
        SUMMARIZE: 'summarizeMessage',
        REPLY: 'suggestReply',
        REFINE_REPLY: 'refineReply',
        CATEGORIZE: 'categorizeMessage',
        IMPORTANCE: 'checkImportance',
        IMPROVE_TEXT: 'improveText',
        CHAT: 'processChatQuery',
        TEST: 'testConnection',
        GET_SETTINGS: 'getSettings',
        SAVE_SETTINGS: 'saveSettings',
        TEST_API: 'testApiConnection',
        GET_STATISTICS: 'getStatistics',
        GET_AUTOMATIC_RESULT: 'getAutomaticResult',
        TRANSLATE: 'translateMessage',
        EXTRACT_INFO: 'extractInfo',
        CHECK_SPAM: 'checkSpam',
        FIND_SIMILAR: 'findSimilar'
    },

    SHORTCUTS: {
        SUMMARIZE: 'Ctrl+Alt+S',
        REPLY: 'Ctrl+Alt+R',
        CATEGORIZE: 'Ctrl+Alt+C',
        IMPORTANCE: 'Ctrl+Alt+I'
    }
};

const LOCALE_MESSAGES = globalThis.LOCALE_MESSAGES || {};

const I18n = {
    language: null,

    isSupportedLanguage(language) {
        return language === 'de' || language === 'en';
    },

    browserLanguage() {
        let locale = '';
        try {
            locale = typeof browser !== 'undefined' ? browser.i18n?.getUILanguage?.() || '' : '';
        } catch (_error) {
            locale = typeof navigator !== 'undefined' ? navigator.language : '';
        }
        return String(locale).toLowerCase().startsWith('de') ? 'de' : 'en';
    },

    getLanguage() {
        return this.language || this.browserLanguage();
    },

    async loadInstallDefaults() {
        try {
            const url = browser.runtime.getURL('install-defaults.json');
            const response = await fetch(url);
            return response.ok ? await response.json() : {};
        } catch (_error) {
            return {};
        }
    },

    async initialize() {
        const version = CONFIG.ADDON_VERSION;
        let stored = {};
        try {
            stored = await browser.storage.local.get([
                CONFIG.STORAGE_KEYS.UI_LANGUAGE,
                CONFIG.STORAGE_KEYS.INSTALLER_LANGUAGE_VERSION
            ]);
        } catch (_error) {
            // Tests and constrained contexts may not expose extension storage.
        }
        const defaults = await this.loadInstallDefaults();
        const storedLanguage = stored[CONFIG.STORAGE_KEYS.UI_LANGUAGE];
        const installerVersion = stored[CONFIG.STORAGE_KEYS.INSTALLER_LANGUAGE_VERSION];
        const installerLanguage = defaults.language;
        const installerDefaultApplies = this.isSupportedLanguage(installerLanguage)
            && defaults.version === version
            && installerVersion !== version;
        this.language = installerDefaultApplies
            ? installerLanguage
            : this.isSupportedLanguage(storedLanguage)
                ? storedLanguage
                : this.browserLanguage();
        try {
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.UI_LANGUAGE]: this.language,
                [CONFIG.STORAGE_KEYS.INSTALLER_LANGUAGE_VERSION]: version
            });
        } catch (_error) {
            // The detected language remains usable when storage is unavailable.
        }
        return this.language;
    },

    async setLanguage(language) {
        if (!this.isSupportedLanguage(language)) {
            throw new Error(`Unsupported UI language: ${String(language)}`);
        }
        this.language = language;
        await browser.storage.local.set({
            [CONFIG.STORAGE_KEYS.UI_LANGUAGE]: language,
            [CONFIG.STORAGE_KEYS.INSTALLER_LANGUAGE_VERSION]: CONFIG.ADDON_VERSION
        });
    },

    t(key, replacements = {}) {
        const language = this.getLanguage();
        const template = LOCALE_MESSAGES[language]?.[key] || LOCALE_MESSAGES.en?.[key] || key;
        return Object.entries(replacements).reduce(
            (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
            template
        );
    },

    modelLabel(model) {
        const definition = CONFIG.OPENAI.AVAILABLE_MODELS.find(item => item.value === model);
        return definition?.labelKey ? this.t(definition.labelKey) : model;
    },

    localizeDocument(root = document) {
        root.documentElement.lang = this.getLanguage();
        const attributes = [
            ['data-i18n', 'textContent'],
            ['data-i18n-placeholder', 'placeholder'],
            ['data-i18n-title', 'title'],
            ['data-i18n-aria-label', 'aria-label']
        ];
        for (const [attribute, property] of attributes) {
            for (const element of root.querySelectorAll(`[${attribute}]`)) {
                const key = element.getAttribute(attribute);
                if (!key) {
                    continue;
                }
                if (property === 'aria-label') {
                    element.setAttribute(property, this.t(key));
                } else {
                    element[property] = this.t(key);
                }
            }
        }
    }
};

// Keep compatibility with the existing non-module Thunderbird build.
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.LOCALE_MESSAGES = LOCALE_MESSAGES;
    window.I18n = I18n;
}
if (typeof globalThis !== 'undefined') {
    globalThis.CONFIG = CONFIG;
    globalThis.LOCALE_MESSAGES = LOCALE_MESSAGES;
    globalThis.I18n = I18n;
}
