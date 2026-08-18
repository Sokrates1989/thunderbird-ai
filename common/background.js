/** Background coordinator for Thunderbird events and AI workflows. */
class ThunderbirdAI {
    constructor() {
        this.initialization = Promise.resolve();
        this.startupState = {
            state: 'starting',
            code: 'BACKGROUND_STARTING',
            stage: 'construct-background',
            timestamp: new Date().toISOString()
        };
        this.setupEventListeners();
    }

    /** Resolve the global service without touching a cross-script lexical binding in its TDZ. */
    dashboardLaunchService() {
        const service = globalThis.DashboardLaunchService;
        if (!service) {
            const error = new Error('Dashboard launch service was not loaded.');
            error.code = 'BACKGROUND_DEPENDENCY_MISSING';
            error.stage = 'resolve-dashboard-launch-service';
            throw error;
        }
        return service;
    }

    /** Stop actions cleanly when startup failed instead of continuing with partial services. */
    async requireInitialization() {
        const initialized = await this.initialization;
        if (initialized === true) {
            return;
        }
        const error = new Error('Thunderbird AI background initialization failed.');
        error.code = this.startupState.code || 'BACKGROUND_INITIALIZATION_FAILED';
        error.stage = this.startupState.stage || 'initialize-background';
        throw error;
    }

    setupEventListeners() {
        browser.runtime.onMessage.addListener((request, sender) => this.handleMessage(request, sender));
        browser.menus.onClicked.addListener((info, tab) => this.handleMenuClick(info, tab));
        browser.action.onClicked.addListener(tab => {
            void this.openDashboardFromToolbar(tab);
        });
        browser.messageDisplayAction.onClicked.addListener(tab => {
            void this.openSingleMailFromToolbar(tab);
        });
    }

    /** Finish localization and reset any popup assignments left by a prior release. */
    async initialize() {
        await this.initializeLaunchRouters();
        await this.initializeMenus();
    }

    async initializeLaunchRouters() {
        const launchModeService = globalThis.LaunchModeService;
        const preparations = [
            this.dashboardLaunchService().prepareToolbarRouter(),
            launchModeService.clearPopup(browser.messageDisplayAction)
        ];
        const results = await Promise.allSettled(preparations);
        for (const result of results) {
            if (result.status === 'rejected') {
                console.warn('Could not clear a pre-update action popup assignment.', result.reason);
            }
        }
    }

    /** Route one global-toolbar click through the persisted dashboard preference. */
    async openDashboardFromToolbar(tab = {}) {
        return RuntimeDiagnosticService.run('background', 'toolbar-dashboard', async () => {
            try {
                await this.requireInitialization();
                const launchService = this.dashboardLaunchService();
                const launchModeService = globalThis.LaunchModeService;
                const mode = await launchService.getMode();
                if (mode === launchModeService.MODES.TAB) {
                    await launchService.openExpanded('saved-preference');
                } else {
                    await launchModeService.openOverlay(
                        browser.action,
                        'global-dashboard.html',
                        { tabId: tab.id, windowId: tab.windowId }
                    );
                }
                return { success: true };
            } catch (error) {
                console.error('Could not open dashboard tab from toolbar:', error);
                const code = error?.code || 'DASHBOARD_LAUNCH_FAILED';
                await this.showNotification(
                    I18n.t('dashboardLaunchFailedTitle'),
                    I18n.t('dashboardLaunchFailedMessage', { code })
                );
                return { success: false, data: { code } };
            }
        });
    }

    /** Route the message-toolbar button independently from the global dashboard setting. */
    async openSingleMailFromToolbar(tab = {}) {
        return RuntimeDiagnosticService.run('background', 'toolbar-single-mail', async () => {
            try {
                await this.requireInitialization();
                const launchModeService = globalThis.LaunchModeService;
                const mode = await launchModeService.getMode(
                    CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE
                );
                if (mode === launchModeService.MODES.TAB) {
                    await SingleMailWorkspaceService.openFromDisplayedTab(
                        tab,
                        'saved-preference'
                    );
                } else {
                    await launchModeService.openOverlay(
                        browser.messageDisplayAction,
                        'single-mail-ui.html',
                        { tabId: tab.id, windowId: tab.windowId }
                    );
                }
                return { success: true };
            } catch (error) {
                console.error('Could not open the single-mail assistant from the toolbar:', error);
                await this.showNotification(
                    I18n.t('singleMailLaunchFailedTitle'),
                    I18n.t('singleMailLaunchFailedMessage')
                );
                return { success: false, data: { code: error?.code || 'SINGLE_MAIL_LAUNCH_FAILED' } };
            }
        });
    }

    async initializeMenus() {
        try {
            await browser.menus.removeAll();
            const items = [
                ['ai-summarize', I18n.t('contextSummarize')],
                ['ai-categorize', I18n.t('contextCategorize')],
                ['ai-suggest-reply', I18n.t('contextReply')],
                ['ai-chat', I18n.t('contextChat')]
            ];
            for (const [id, title] of items) {
                await browser.menus.create({ id, title, contexts: ['message_list'] });
            }
        } catch (error) {
            console.error('Could not initialize context menus:', error);
        }
    }

    async handleMessage(request) {
        if (request?.action === CONFIG.ACTIONS.GET_BACKGROUND_HEALTH) {
            return { success: true, data: this.backgroundHealth() };
        }
        return RuntimeDiagnosticService.run(
            'background',
            request?.action || 'unknown-message',
            async () => {
                try {
                    await this.requireInitialization();
                } catch (error) {
                    return {
                        success: false,
                        error: I18n.t('backgroundUnavailable'),
                        data: {
                            code: error?.code || 'BACKGROUND_INITIALIZATION_FAILED',
                            stage: error?.stage || 'initialize-background'
                        }
                    };
                }
                return this.dispatchMessage(request || {});
            }
        );
    }

    /** Return startup state and dependency availability without exposing persisted user data. */
    backgroundHealth() {
        return {
            ...this.startupState,
            session: RuntimeDiagnosticService.sessionId,
            dependencies: {
                launchMode: Boolean(globalThis.LaunchModeService),
                dashboardLaunch: Boolean(globalThis.DashboardLaunchService),
                storage: Boolean(globalThis.StorageManager),
                message: Boolean(globalThis.MessageService),
                openAI: Boolean(globalThis.OpenAIService)
            }
        };
    }

    /** Route a runtime request while the outer boundary records start and completion. */
    async dispatchMessage(request) {
        try {
            switch (request.action) {
                case CONFIG.ACTIONS.SUMMARIZE:
                    return this.runEmailAction('summarize', request.messageId);
                case CONFIG.ACTIONS.REPLY:
                    return this.runEmailAction('reply', request.messageId, request.context || {});
                case CONFIG.ACTIONS.REFINE_REPLY:
                    return this.refineReply(
                        request.messageId,
                        request.currentDraft,
                        request.instruction,
                        request.history || []
                    );
                case CONFIG.ACTIONS.CATEGORIZE:
                    return this.runEmailAction('categorize', request.messageId);
                case CONFIG.ACTIONS.IMPORTANCE:
                    return this.runEmailAction('importance', request.messageId);
                case CONFIG.ACTIONS.TRANSLATE:
                    return this.runEmailAction('translate', request.messageId, {
                        targetLanguage: request.targetLanguage
                    });
                case CONFIG.ACTIONS.EXTRACT_INFO:
                    return this.runEmailAction('extract', request.messageId);
                case CONFIG.ACTIONS.CHECK_SPAM:
                    return this.runEmailAction('spam', request.messageId);
                case CONFIG.ACTIONS.FIND_SIMILAR:
                    return this.findSimilar(request.messageId);
                case CONFIG.ACTIONS.SCORE_MESSAGE:
                    return this.scoreSingleMessage(request.messageId);
                case CONFIG.ACTIONS.DASHBOARD_BULK_TRIAGE:
                    return this.analyzeDashboardMessages(request.messageIds || []);
                case CONFIG.ACTIONS.DASHBOARD_SAVE_FEEDBACK:
                    return this.saveDashboardScoreFeedback(request);
                case CONFIG.ACTIONS.DASHBOARD_TRASH_MESSAGES:
                    return DashboardMailboxService.deleteMessages(request.messageIds || []);
                case CONFIG.ACTIONS.GET_SCORE_ARCHIVE:
                    return { success: true, data: await DashboardTrainingService.loadArchive() };
                case CONFIG.ACTIONS.UPDATE_SCORE_ARCHIVE:
                    return this.updateScoreArchive(request);
                case CONFIG.ACTIONS.REMOVE_SCORE_ARCHIVE:
                    return this.removeScoreArchive(request.storageKey);
                case CONFIG.ACTIONS.CHAT:
                    return this.processChatQuery(
                        request.query,
                        request.messageId,
                        request.history || []
                    );
                case CONFIG.ACTIONS.IMPROVE_TEXT:
                    return this.improveText(request.text, request.type);
                case CONFIG.ACTIONS.TEST:
                case CONFIG.ACTIONS.TEST_API:
                    return OpenAIService.testConnection(request.apiKey, request.model);
                case CONFIG.ACTIONS.GET_SETTINGS:
                case CONFIG.ACTIONS.GET_STATISTICS:
                    return StorageManager.getSettings();
                case CONFIG.ACTIONS.SAVE_SETTINGS:
                    return this.saveSettings(request);
                case CONFIG.ACTIONS.SET_DASHBOARD_OPEN_MODE:
                    return this.setDashboardOpenMode(request.mode);
                default:
                    return { success: false, error: I18n.t('unknownError') };
            }
        } catch (error) {
            console.error('Background action failed:', error);
            return { success: false, error: this.safeErrorMessage(error) };
        }
    }

    /** Expose only errors explicitly marked as localized presentation-safe messages. */
    safeErrorMessage(error) {
        return error?.userFacing === true && error.message
            ? error.message
            : I18n.t('unknownError');
    }

    async saveSettings(settings) {
        const success = await StorageManager.saveSettings(settings);
        if (success && I18n.isSupportedLanguage(settings.uiLanguage)) {
            await I18n.setLanguage(settings.uiLanguage);
            await this.initializeMenus();
        }
        return { success };
    }

    async setDashboardOpenMode(mode) {
        const launchService = this.dashboardLaunchService();
        const normalizedMode = launchService.normalizeMode(mode);
        const success = await StorageManager.set(
            CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE,
            normalizedMode
        );
        if (success) {
            await launchService.prepareToolbarRouter();
        }
        return { success, data: { mode: normalizedMode } };
    }

    async runEmailAction(task, messageId, options = {}) {
        let message = await MessageService.getFullMessage(messageId);
        if (task === 'spam') {
            [message] = await SpamPrecheckService.enrichMessages([message]);
        }
        let result;
        switch (task) {
            case 'summarize':
                result = await OpenAIService.generateSummary(message);
                break;
            case 'reply':
                result = await OpenAIService.generateReply(message, options);
                break;
            case 'categorize':
                result = await OpenAIService.categorizeEmail(message);
                break;
            case 'importance':
                result = await OpenAIService.checkImportance(message);
                break;
            case 'translate':
                result = await OpenAIService.translateMessage(message, options.targetLanguage);
                break;
            case 'extract':
                result = await OpenAIService.extractInfo(message);
                break;
            case 'spam':
                result = await OpenAIService.checkSpam(message);
                break;
            default:
                throw new Error(`Unsupported email task: ${task}`);
        }

        await StorageManager.updateStatistics('email');
        if (result.usedApi) {
            await StorageManager.updateStatistics('api', this.apiAttemptCount(result));
        }
        return this.successResult(task, result, messageId);
    }

    /** Load selected messages once and return configured-model importance, spam, and risk scores. */
    async analyzeDashboardMessages(messageIds) {
        const uniqueIds = [...new Set(messageIds)]
            .filter(messageId => messageId !== undefined && messageId !== null);
        if (!uniqueIds.length) {
            return { success: true, data: { results: [], failedCount: 0, model: null } };
        }
        const loadedMessages = await Promise.all(
            uniqueIds.map(messageId => MessageService.getFullMessage(messageId))
        );
        const messages = await SpamPrecheckService.enrichMessages(loadedMessages);
        const feedbackExamples = await DashboardTrainingService.relevantExamples(messages);
        const analysis = await OpenAIService.analyzeBulkTriage(messages, feedbackExamples);
        await StorageManager.updateStatistics('email', analysis.scores.length);
        if (analysis.apiCalls) {
            await StorageManager.updateStatistics('api', analysis.apiCalls);
        }
        return {
            success: true,
            data: {
                results: analysis.scores,
                failedCount: analysis.failedCount,
                model: analysis.model
            }
        };
    }

    /** Score one message and return any exact archived operator correction beside it. */
    async scoreSingleMessage(messageId) {
        const loadedMessage = await MessageService.getFullMessage(messageId);
        const [message] = await SpamPrecheckService.enrichMessages([loadedMessage]);
        const [archivedFeedback, feedbackExamples] = await Promise.all([
            DashboardTrainingService.findForMessage(message),
            DashboardTrainingService.relevantExamples([message])
        ]);
        const result = await OpenAIService.analyzeSingleScore(message, feedbackExamples);
        await StorageManager.updateStatistics('email');
        await StorageManager.updateStatistics('api', this.apiAttemptCount(result));
        return {
            success: true,
            data: {
                title: I18n.t('singleScoreTitle'),
                messageId,
                importanceScore: result.importanceScore,
                spamScore: result.spamScore,
                riskScore: result.riskScore,
                model: result.model,
                archivedFeedback
            }
        };
    }

    /** Persist explicit operator corrections independently from Thunderbird mail state. */
    async saveDashboardScoreFeedback(request) {
        return RetryService.run(
            async () => {
                const message = await MessageService.getFullMessage(request.messageId);
                const feedback = await DashboardTrainingService.archiveFeedback(message, {
                    originalScores: request.originalScores,
                    correctedScores: request.correctedScores,
                    reason: request.reason,
                    reasons: request.reasons,
                    sourceModel: request.sourceModel
                });
                return {
                    success: true,
                    data: {
                        importanceScore: feedback.correctedScores.importanceScore,
                        spamScore: feedback.correctedScores.spamScore,
                        riskScore: feedback.correctedScores.riskScore,
                        correctedAt: feedback.updatedAt,
                        reasons: feedback.reasons
                    }
                };
            },
            {
                maxAttempts: 3,
                shouldRetry: error => error?.message !== I18n.t('dashboardFeedbackInvalid'),
                delayMs: (_error, attempt) => RetryService.exponentialDelay(attempt, {
                    baseDelayMs: 150,
                    maxDelayMs: 750
                }),
                onRetry: (_error, attempt, delayMs) => {
                    console.warn('Retrying idempotent score feedback save.', { attempt, delayMs });
                }
            }
        );
    }

    async updateScoreArchive(request) {
        const record = await DashboardTrainingService.updateArchivedFeedback(
            request.storageKey,
            {
                correctedScores: request.correctedScores,
                reasons: request.reasons
            }
        );
        return { success: true, data: record };
    }

    async removeScoreArchive(storageKey) {
        const removed = await DashboardTrainingService.removeArchivedFeedback(storageKey);
        return { success: removed, error: removed ? null : I18n.t('scoreArchiveMissing') };
    }

    successResult(task, result, messageId) {
        const definitions = {
            summarize: ['summaryTitle', ['copy', 'save']],
            reply: ['replyTitle', ['copy', 'reply', 'save']],
            categorize: ['categoryTitle', ['copy', 'save']],
            importance: ['importanceTitle', ['copy', 'save']],
            translate: ['translationTitle', ['copy', 'save']],
            extract: ['extractionTitle', ['copy', 'save']],
            spam: ['spamTitle', ['copy', 'save']],
            improve: ['improveTitle', ['copy']]
        };
        const [titleKey, actionTypes] = definitions[task];
        const labels = { copy: 'copy', save: 'save', reply: 'useAsReply' };
        return {
            success: true,
            data: {
                title: I18n.t(titleKey),
                content: result.content,
                actions: actionTypes.map(type => ({ type, label: I18n.t(labels[type]) })),
                messageId,
                model: result.model || null,
                usedApi: Boolean(result.usedApi)
            }
        };
    }

    async processChatQuery(query, messageId, history) {
        const message = await MessageService.getFullMessage(messageId);
        const result = await OpenAIService.processChat(query, message, history);
        await StorageManager.updateStatistics('email');
        await StorageManager.updateStatistics('api', this.apiAttemptCount(result));
        return {
            success: true,
            data: {
                title: I18n.t('chatTitle'),
                content: result.content,
                model: result.model
            }
        };
    }

    /** Refine an editable draft against the source email and return the shared result contract. */
    async refineReply(messageId, currentDraft, instruction, history) {
        const message = await MessageService.getFullMessage(messageId);
        const result = await OpenAIService.refineReply(
            message,
            currentDraft,
            instruction,
            history
        );
        await StorageManager.updateStatistics('email');
        if (result.usedApi) {
            await StorageManager.updateStatistics('api', this.apiAttemptCount(result));
        }
        return this.successResult('reply', result, messageId);
    }

    async improveText(text, type) {
        const result = await OpenAIService.improveText(text, type);
        await StorageManager.updateStatistics('api', this.apiAttemptCount(result));
        return this.successResult('improve', result, null);
    }

    /** Count physical API attempts so retry recovery remains visible in local statistics. */
    apiAttemptCount(result) {
        const retryCount = Number(result?.retryCount);
        return 1 + (Number.isInteger(retryCount) && retryCount > 0 ? retryCount : 0);
    }

    async findSimilar(messageId) {
        const similarMessages = await MessageService.findSimilarMessages(messageId);
        const content = similarMessages.length
            ? similarMessages.map(message => {
                const date = message.date
                    ? new Date(message.date).toLocaleDateString(I18n.getLanguage())
                    : '–';
                return `• ${message.subject}\n  ${message.author} · ${date}`;
            }).join('\n\n')
            : I18n.t('noSimilar');
        await StorageManager.updateStatistics('email');
        return {
            success: true,
            data: {
                title: I18n.t('similarTitle'),
                content,
                actions: [{ type: 'copy', label: I18n.t('copy') }],
                messageId,
                similarMessages
            }
        };
    }

    async handleMenuClick(info) {
        const messageId = info.targetMessageId;
        if (messageId === undefined || messageId === null) {
            return;
        }
        try {
            await this.requireInitialization();
            const mode = {
                'ai-chat': 'chat',
                'ai-suggest-reply': 'reply'
            }[info.menuItemId];
            if (mode) {
                await SingleMailWorkspaceService.openExpanded(messageId, mode, 'context-menu');
                return;
            }
            const taskByMenu = {
                'ai-summarize': 'summarize',
                'ai-categorize': 'categorize'
            };
            const response = await this.runEmailAction(taskByMenu[info.menuItemId], messageId);
            const preview = response.data.content.replace(/\s+/gu, ' ').slice(0, 220);
            await this.showNotification(response.data.title, preview);
        } catch (error) {
            console.error('Context-menu action failed:', error);
            await this.showNotification(I18n.t('errorTitle'), I18n.t('unknownError'));
        }
    }

    async showNotification(title, message) {
        try {
            await browser.notifications.create({
                type: 'basic',
                iconUrl: browser.runtime.getURL('icon.svg'),
                title,
                message
            });
        } catch (error) {
            console.error('Could not show notification:', error);
        }
    }
}

if (browser.runtime?.onInstalled?.addListener) {
    browser.runtime.onInstalled.addListener(details => {
        const service = globalThis.DashboardLaunchService;
        if (!service) {
            void RuntimeDiagnosticService.recordBackgroundHealth('failed', {
                code: 'BACKGROUND_DEPENDENCY_MISSING',
                stage: 'on-installed-dashboard-cleanup'
            });
            return;
        }
        void service.markDashboardTabCleanupPending(details).catch(error => {
            console.error('Could not schedule dashboard tab cleanup:', error);
            void RuntimeDiagnosticService.record('background', 'install-cleanup', 'failed', {
                code: error?.code || error?.name || 'DASHBOARD_CLEANUP_SCHEDULE_FAILED',
                stage: 'on-installed-dashboard-cleanup',
                location: RuntimeDiagnosticService.errorLocation(error)
            });
        });
    });
}

RuntimeDiagnosticService.installGlobalHandlers('background');
globalThis.thunderbirdAI = new ThunderbirdAI();
const backgroundInitializationStartedAt = Date.now();
const backgroundStartingDiagnostic = RuntimeDiagnosticService.recordBackgroundHealth('starting', {
    code: 'BACKGROUND_STARTING',
    stage: 'initialize-background'
});
globalThis.thunderbirdAIInitialization = RuntimeDiagnosticService.run(
    'background',
    'initialize',
    async () => {
        await I18n.initialize();
        await globalThis.thunderbirdAI.initialize();
        globalThis.thunderbirdAI.startupState = {
            state: 'ready',
            code: 'BACKGROUND_READY',
            stage: 'initialize-background',
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - backgroundInitializationStartedAt
        };
        await backgroundStartingDiagnostic;
        await RuntimeDiagnosticService.recordBackgroundHealth(
            'ready',
            globalThis.thunderbirdAI.startupState
        );
        return true;
    }
)
    .catch(async error => {
        globalThis.thunderbirdAI.startupState = {
            state: 'failed',
            code: error?.code || error?.name || 'BACKGROUND_INITIALIZATION_FAILED',
            stage: error?.stage || 'initialize-background',
            location: RuntimeDiagnosticService.errorLocation(error),
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - backgroundInitializationStartedAt
        };
        await backgroundStartingDiagnostic;
        await RuntimeDiagnosticService.recordBackgroundHealth('failed', {
            ...globalThis.thunderbirdAI.startupState,
            technicalError: error?.message
        });
        console.error('Thunderbird AI Assistant failed to initialize:', error);
        return false;
    });
globalThis.thunderbirdAI.initialization = globalThis.thunderbirdAIInitialization;
