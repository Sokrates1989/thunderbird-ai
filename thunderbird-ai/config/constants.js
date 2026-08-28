// AI Mail Assistant for Thunderbird - shared configuration and localized UI strings.

const CONFIG = {
    ADDON_NAME: 'AI Mail Assistant for Thunderbird',
    ADDON_VERSION: '3.6.0',
    ADDON_ID: 'thunderbird-ai@felicitas-wisdom.com',

    AI: {
        DEFAULT_PROVIDER: 'openai',
        PROVIDERS: {
            openai: {
                labelKey: 'providerOpenAI',
                guidePath: 'openai',
                tutorialLinkKey: 'providerTutorialOpenAIKeys',
                tutorialStepKeys: [
                    'providerTutorialOpenAIAccount',
                    'providerTutorialPasteAndTest'
                ],
                protocol: 'openai-responses',
                authMode: 'bearer',
                baseUrl: 'https://api.openai.com/v1',
                apiKeyUrl: 'https://platform.openai.com/api-keys',
                apiKeyRequired: true,
                modelPresets: ['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-5.6-sol'],
                modelRoles: {
                    fast: 'gpt-5.6-luna',
                    balanced: 'gpt-5.6-terra',
                    quality: 'gpt-5.6-sol'
                }
            },
            anthropic: {
                labelKey: 'providerAnthropic',
                guidePath: 'claude-anthropic',
                tutorialLinkKey: 'providerTutorialAnthropicKeys',
                tutorialStepKeys: [
                    'providerTutorialAnthropicAccount',
                    'providerTutorialPasteAndTest'
                ],
                protocol: 'anthropic-messages',
                authMode: 'x-api-key',
                baseUrl: 'https://api.anthropic.com/v1',
                apiKeyUrl: 'https://platform.claude.com/settings/keys',
                apiKeyRequired: true,
                modelPresets: [
                    'claude-haiku-4-5-20251001',
                    'claude-sonnet-5',
                    'claude-opus-5'
                ],
                modelRoles: {
                    fast: 'claude-haiku-4-5-20251001',
                    balanced: 'claude-sonnet-5',
                    quality: 'claude-sonnet-5'
                }
            },
            mistral: {
                labelKey: 'providerMistral',
                guidePath: 'mistral',
                tutorialLinkKey: 'providerTutorialMistralKeys',
                tutorialStepKeys: [
                    'providerTutorialMistralAccount',
                    'providerTutorialPasteAndTest'
                ],
                protocol: 'openai-chat',
                authMode: 'bearer',
                baseUrl: 'https://api.mistral.ai/v1',
                apiKeyUrl: 'https://console.mistral.ai/api-keys',
                apiKeyRequired: true,
                modelPresets: [
                    'mistral-small-latest',
                    'mistral-medium-latest',
                    'mistral-large-latest'
                ],
                modelRoles: {
                    fast: 'mistral-small-latest',
                    balanced: 'mistral-medium-latest',
                    quality: 'mistral-large-latest'
                }
            },
            deepseek: {
                labelKey: 'providerDeepSeek',
                guidePath: 'deepseek',
                tutorialLinkKey: 'providerTutorialDeepSeekKeys',
                tutorialStepKeys: [
                    'providerTutorialDeepSeekAccount',
                    'providerTutorialPasteAndTest'
                ],
                protocol: 'openai-chat',
                authMode: 'bearer',
                baseUrl: 'https://api.deepseek.com',
                apiKeyUrl: 'https://platform.deepseek.com/api_keys',
                apiKeyRequired: true,
                modelPresets: ['deepseek-v4-flash', 'deepseek-v4-pro'],
                modelRoles: {
                    fast: 'deepseek-v4-flash',
                    balanced: 'deepseek-v4-flash',
                    quality: 'deepseek-v4-pro'
                }
            },
            custom: {
                labelKey: 'providerCustom',
                guidePath: 'custom-endpoint',
                tutorialUrl: 'https://huggingface.co/settings/tokens',
                tutorialLinkKey: 'providerTutorialCustomExample',
                tutorialStepKeys: [
                    'providerTutorialCustomDetails',
                    'providerTutorialCustomTest'
                ],
                protocol: 'openai-chat',
                authMode: 'bearer',
                baseUrl: '',
                apiKeyUrl: '',
                apiKeyRequired: false,
                modelPresets: [],
                modelRoles: { fast: '', balanced: '', quality: '' }
            }
        },
        PROTOCOLS: [
            { value: 'openai-chat', labelKey: 'providerProtocolOpenAIChat' },
            { value: 'openai-responses', labelKey: 'providerProtocolOpenAIResponses' },
            { value: 'anthropic-messages', labelKey: 'providerProtocolAnthropic' }
        ],
        AUTH_MODES: [
            { value: 'bearer', labelKey: 'providerAuthBearer' },
            { value: 'x-api-key', labelKey: 'providerAuthApiKeyHeader' },
            { value: 'none', labelKey: 'providerAuthNone' }
        ],
        BASE_URL: 'https://api.openai.com/v1',
        DEFAULT_MODEL: 'auto',
        REQUEST_MAX_ATTEMPTS: 3,
        RETRY_BASE_DELAY_MS: 500,
        RETRY_MAX_DELAY_MS: 10000,
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
        PRICING_SNAPSHOT_DATE: '2026-08-11',
        PRICING_USD_PER_MILLION_TOKENS: {
            'gpt-5.6-luna': { input: 0.20, cachedInput: 0.02, output: 1.20 },
            'gpt-5.6-terra': { input: 2.00, cachedInput: 0.20, output: 12.00 },
            'gpt-5.6-sol': { input: 5.00, cachedInput: 0.50, output: 30.00 }
        },
        TASK_PROFILES: {
            summarize: { model: 'gpt-5.6-sol', modelRole: 'quality', effort: 'low', verbosity: 'medium', maxOutputTokens: 1200 },
            reply: { model: 'gpt-5.6-sol', modelRole: 'quality', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            replyRefine: { model: 'gpt-5.6-sol', modelRole: 'quality', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            categorize: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'low', maxOutputTokens: 350 },
            importance: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'low', maxOutputTokens: 350 },
            chat: { model: 'gpt-5.6-sol', modelRole: 'quality', effort: 'low', verbosity: 'medium', maxOutputTokens: 1200 },
            translate: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'medium', maxOutputTokens: 1800 },
            extract: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            spam: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'low', maxOutputTokens: 450 },
            bulkTriage: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'low', verbosity: 'low', maxOutputTokens: 1200 },
            singleScore: { model: 'gpt-5.6-terra', modelRole: 'balanced', effort: 'low', verbosity: 'low', maxOutputTokens: 300 },
            improve: { model: 'gpt-5.6-terra', modelRole: 'balanced', effort: 'low', verbosity: 'medium', maxOutputTokens: 900 },
            test: { model: 'gpt-5.6-luna', modelRole: 'fast', effort: 'none', verbosity: 'low', maxOutputTokens: 512 }
        },
        MODEL_SETTINGS: [
            { property: 'bulkModel', storageKey: 'bulkModel', labelKey: 'modelTaskBulk', tasks: ['bulkTriage'], defaultModel: 'gpt-5.6-luna' },
            { property: 'singleScoreModel', storageKey: 'singleScoreModel', labelKey: 'modelTaskSingleScore', tasks: ['singleScore'], defaultModel: 'gpt-5.6-terra' },
            { property: 'summarizeModel', storageKey: 'summarizeModel', labelKey: 'modelTaskSummarize', tasks: ['summarize'], defaultModel: 'gpt-5.6-sol' },
            { property: 'replyModel', storageKey: 'replyModel', labelKey: 'modelTaskReply', tasks: ['reply', 'replyRefine'], defaultModel: 'gpt-5.6-sol' },
            { property: 'chatModel', storageKey: 'chatModel', labelKey: 'modelTaskChat', tasks: ['chat'], defaultModel: 'gpt-5.6-sol' },
            { property: 'categorizeModel', storageKey: 'categorizeModel', labelKey: 'modelTaskCategorize', tasks: ['categorize'], defaultModel: 'gpt-5.6-luna' },
            { property: 'importanceModel', storageKey: 'importanceModel', labelKey: 'modelTaskImportance', tasks: ['importance'], defaultModel: 'gpt-5.6-luna' },
            { property: 'translateModel', storageKey: 'translateModel', labelKey: 'modelTaskTranslate', tasks: ['translate'], defaultModel: 'gpt-5.6-luna' },
            { property: 'extractModel', storageKey: 'extractModel', labelKey: 'modelTaskExtract', tasks: ['extract'], defaultModel: 'gpt-5.6-luna' },
            { property: 'spamModel', storageKey: 'spamModel', labelKey: 'modelTaskSpam', tasks: ['spam'], defaultModel: 'gpt-5.6-luna' },
            { property: 'improveModel', storageKey: 'improveModel', labelKey: 'modelTaskImprove', tasks: ['improve'], defaultModel: 'gpt-5.6-terra' }
        ],
        MAX_EMAIL_CHARACTERS: 50000,
        BULK_TRIAGE_BATCH_SIZE: 8,
        BULK_TRIAGE_CONCURRENCY: 2,
        BULK_TRIAGE_EMAIL_CHARACTERS: 6000,
        BULK_TRIAGE_FEEDBACK_EXAMPLES: 5,
        DASHBOARD_FEEDBACK_ARCHIVE_LIMIT: 250,
        DASHBOARD_FEEDBACK_REASON_CHARACTERS: 1000,
        SCORE_FEEDBACK_CATEGORIES: [
            'sender',
            'addressStyle',
            'content',
            'requestedAction',
            'linksAttachments',
            'previousExperience',
            'phishingSignals',
            'dangerousContent',
            'potentiallyIllegal',
            'unwantedContent'
        ],
        SCORE_FEEDBACK_CATEGORIES_BY_SCORE: {
            importance: [
                'sender',
                'addressStyle',
                'content',
                'requestedAction',
                'linksAttachments',
                'previousExperience'
            ],
            spam: [
                'sender',
                'addressStyle',
                'content',
                'requestedAction',
                'linksAttachments',
                'previousExperience'
            ],
            risk: [
                'sender',
                'addressStyle',
                'phishingSignals',
                'dangerousContent',
                'potentiallyIllegal',
                'unwantedContent',
                'previousExperience'
            ]
        },
        MAX_REPLY_DRAFT_CHARACTERS: 20000,
        MAX_REPLY_INSTRUCTION_CHARACTERS: 4000
    },

    SPAM_PRECHECK: {
        HISTORY_LIMIT: 1000,
        HISTORY_PAGE_SIZE: 100,
        CACHE_TTL_MS: 600000,
        CACHE_LIMIT: 200,
        CONCURRENCY: 4,
        RECENT_DAYS: [30, 90]
    },

    STORAGE_KEYS: {
        OPENAI_API_KEY: 'openaiApiKey',
        AI_PROVIDER: 'aiProvider',
        AI_PROVIDER_CONFIGURATIONS: 'aiProviderConfigurations',
        MODEL: 'model',
        BULK_MODEL: 'bulkModel',
        SINGLE_SCORE_MODEL: 'singleScoreModel',
        SUMMARIZE_MODEL: 'summarizeModel',
        REPLY_MODEL: 'replyModel',
        CHAT_MODEL: 'chatModel',
        CATEGORIZE_MODEL: 'categorizeModel',
        IMPORTANCE_MODEL: 'importanceModel',
        TRANSLATE_MODEL: 'translateModel',
        EXTRACT_MODEL: 'extractModel',
        SPAM_MODEL: 'spamModel',
        IMPROVE_MODEL: 'improveModel',
        EMAILS_ANALYZED: 'emailsAnalyzed',
        API_CALLS: 'apiCalls',
        API_USAGE_BY_MODEL: 'apiUsageByModel',
        LAST_USED: 'lastUsed',
        SAVED_RESULTS: 'savedResults',
        UI_LANGUAGE: 'uiLanguage',
        INSTALLER_LANGUAGE_VERSION: 'installerLanguageVersion',
        REPLY_INCLUDE_ORIGINAL: 'replyIncludeOriginal',
        REPLY_TO_ALL: 'replyToAll',
        REPLY_INCLUDE_ATTACHMENTS: 'replyIncludeAttachments',
        DASHBOARD_DISPLAY_OPTIONS_EXPANDED: 'dashboardDisplayOptionsExpanded',
        DASHBOARD_SHOW_PREVIEW: 'dashboardShowPreview',
        DASHBOARD_PREVIEW_LINES: 'dashboardPreviewLines',
        DASHBOARD_CONTEXT_MENU_STYLE: 'dashboardContextMenuStyle',
        DASHBOARD_SORT_ORDER: 'dashboardSortOrder',
        DASHBOARD_VIEW_MODE: 'dashboardViewMode',
        DASHBOARD_MESSAGE_LIMIT: 'dashboardMessageLimit',
        DASHBOARD_DATE_FROM: 'dashboardDateFrom',
        DASHBOARD_DATE_TO: 'dashboardDateTo',
        DASHBOARD_INCLUDE_READ: 'dashboardIncludeRead',
        DASHBOARD_SENDER_FILTER: 'dashboardSenderFilter',
        DASHBOARD_AI_STATUS_FILTER: 'dashboardAiStatusFilter',
        DASHBOARD_IMPORTANCE_MINIMUM: 'dashboardImportanceMinimum',
        DASHBOARD_SPAM_MINIMUM: 'dashboardSpamMinimum',
        DASHBOARD_RISK_MINIMUM: 'dashboardRiskMinimum',
        DASHBOARD_SELECTED_MESSAGES: 'dashboardSelectedMessages',
        DASHBOARD_AI_RESULTS: 'dashboardAiResults',
        DASHBOARD_FEEDBACK_ARCHIVE: 'dashboardFeedbackArchive',
        DASHBOARD_DELETE_DIAGNOSTIC: 'dashboardDeleteDiagnostic',
        DASHBOARD_LAUNCH_DIAGNOSTIC: 'dashboardLaunchDiagnostic',
        BACKGROUND_HEALTH_DIAGNOSTIC: 'backgroundHealthDiagnostic',
        DASHBOARD_TAB_CLEANUP_PENDING: 'dashboardTabCleanupPending',
        DASHBOARD_INSTALL_EVENT: 'dashboardInstallEvent',
        RUNTIME_DIAGNOSTICS: 'runtimeDiagnostics',
        DASHBOARD_OPEN_MODE: 'dashboardOpenMode',
        SINGLE_MAIL_OPEN_MODE: 'singleMailOpenMode',
        DASHBOARD_EXPAND_USE_COUNT: 'dashboardExpandUseCount',
        DASHBOARD_EXPAND_PROMPT_SUPPRESSED: 'dashboardExpandPromptSuppressed',
        DASHBOARD_OVERLAY_OPEN_COUNT: 'dashboardOverlayOpenCount',
        DASHBOARD_OVERLAY_PROMPT_SUPPRESSED: 'dashboardOverlayPromptSuppressed'
    },

    UI: {
        POPUP_WIDTH: 450,
        POPUP_HEIGHT: 600,
        TOAST_DURATION: 3000,
        LOADING_TIMEOUT: 60000,
        DASHBOARD_EXPAND_PROMPT_THRESHOLD: 3,
        DASHBOARD_OVERLAY_PROMPT_THRESHOLD: 5,
        BACKGROUND_STARTUP_STEP_TIMEOUT_MS: 2000,
        BACKGROUND_STARTUP_WRAPPER_GRACE_MS: 250,
        BACKGROUND_INITIALIZATION_WAIT_TIMEOUT_MS: 6500,
        SETTINGS_READ_TIMEOUT_MS: 7500,
        DASHBOARD_LAUNCH_API_TIMEOUT_MS: 2500,
        DASHBOARD_WINDOW_FOCUS_TIMEOUT_MS: 1000,
        DASHBOARD_DIAGNOSTIC_TIMEOUT_MS: 750
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
        GET_BACKGROUND_HEALTH: 'getBackgroundHealth',
        PREPARE_RESTORED_DASHBOARD: 'prepareRestoredDashboard',
        TRANSLATE: 'translateMessage',
        EXTRACT_INFO: 'extractInfo',
        CHECK_SPAM: 'checkSpam',
        FIND_SIMILAR: 'findSimilar',
        SCORE_MESSAGE: 'scoreMessage',
        DASHBOARD_BULK_TRIAGE: 'analyzeDashboardMessages',
        DASHBOARD_SAVE_FEEDBACK: 'saveDashboardScoreFeedback',
        DASHBOARD_TRASH_MESSAGES: 'trashDashboardMessages',
        GET_SCORE_ARCHIVE: 'getScoreArchive',
        UPDATE_SCORE_ARCHIVE: 'updateScoreArchive',
        REMOVE_SCORE_ARCHIVE: 'removeScoreArchive',
        SET_LAUNCH_MODE: 'setLaunchMode',
        SET_DASHBOARD_OPEN_MODE: 'setDashboardOpenMode'
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
        const definition = CONFIG.AI.AVAILABLE_MODELS.find(item => item.value === model);
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
