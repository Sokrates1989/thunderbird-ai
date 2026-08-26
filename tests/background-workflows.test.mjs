import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function eventTarget() {
    return { addListener() {} };
}

test('toolbar listeners are registered before asynchronous background initialization', () => {
    const source = fs.readFileSync(
        path.join(repositoryRoot, 'common/background.js'),
        'utf8'
    );
    const instanceIndex = source.indexOf('globalThis.thunderbirdAI = new ThunderbirdAI()');
    const initializationIndex = source.indexOf(
        'globalThis.thunderbirdAIInitialization = RuntimeDiagnosticService.run'
    );

    assert.ok(instanceIndex >= 0);
    assert.ok(initializationIndex > instanceIndex);
    assert.match(source, /browser\.action\.onClicked\.addListener/u);
    assert.match(source, /browser\.messageDisplayAction\.onClicked\.addListener/u);
});

async function loadBackground(options = {}) {
    const stats = [];
    const serviceCalls = [];
    const deleteCalls = [];
    const storageState = { ...(options.initialStorage || {}) };
    const popupAssignments = [];
    const messagePopupAssignments = [];
    const openedPopups = [];
    const openedTabs = [];
    const notifications = [];
    let actionClickListener = null;
    let messageActionClickListener = null;
    let installedListener = null;
    const context = createContext({
        console: options.console || console,
        browser: {
            i18n: { getUILanguage: () => 'de-DE' },
            runtime: {
                onMessage: eventTarget(),
                onInstalled: { addListener: listener => { installedListener = listener; } },
                getURL: value => value,
                getBrowserInfo: options.getBrowserInfo || (async () => ({ version: '140.0' }))
            },
            menus: {
                onClicked: eventTarget(),
                removeAll: options.removeMenus || (async () => {}),
                create: options.createMenu || (async () => {})
            },
            action: {
                onClicked: { addListener: listener => { actionClickListener = listener; } },
                setPopup: options.setDashboardPopup || (async details => {
                    popupAssignments.push({ ...details });
                }),
                openPopup: async details => {
                    openedPopups.push(['dashboard', details ? { ...details } : null]);
                    return true;
                }
            },
            messageDisplayAction: {
                onClicked: { addListener: listener => { messageActionClickListener = listener; } },
                setPopup: options.setSingleMailPopup || (async details => {
                    messagePopupAssignments.push({ ...details });
                }),
                openPopup: async details => {
                    openedPopups.push(['single-mail', details ? { ...details } : null]);
                    return true;
                }
            },
            messageDisplay: {
                onMessagesDisplayed: eventTarget(),
                getDisplayedMessages: options.getDisplayedMessages || (async () => [{ id: 73 }])
            },
            messages: {
                delete: async (...parameters) => {
                    deleteCalls.push(parameters);
                    return options.deleteMessages?.(...parameters);
                }
            },
            notifications: {
                create: async details => {
                    notifications.push({ ...details });
                    return 'notification-id';
                }
            },
            storage: { local: {
                get: async keys => {
                    const requested = Array.isArray(keys) ? keys : [keys];
                    return Object.fromEntries(requested
                        .filter(key => Object.hasOwn(storageState, key))
                        .map(key => [key, storageState[key]]));
                },
                set: async values => Object.assign(storageState, values)
            } },
            tabs: {
                query: async () => [],
                update: async (tabId, details) => ({ id: tabId, ...details }),
                create: options.createTab || (async details => {
                    openedTabs.push({ ...details });
                    return { id: 11, windowId: 3, ...details };
                })
            },
            windows: { update: async (windowId, details) => ({ id: windowId, ...details }) }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    Object.assign(context.CONFIG.UI, options.ui || {});
    loadScript(context, 'thunderbird-ai/components/shared/RuntimeDiagnosticService.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(context, 'thunderbird-ai/components/shared/SingleMailWorkspaceService.js');
    loadScript(context, 'thunderbird-ai/components/shared/DashboardLaunchService.js');
    context.MessageService = {
        getFullMessage: options.getFullMessage || (async id => ({
            id,
            subject: 'Test',
            author: 'Ada',
            formattedDate: '10.08.2026',
            content: 'Nachrichtentext',
            attachments: []
        })),
        findSimilarMessages: async () => [{
            id: 8,
            subject: 'Ähnlich',
            author: 'Ada',
            date: '2026-08-09'
        }]
    };
    context.SpamPrecheckService = {
        enrichMessages: options.enrichMessages || (async messages => messages.map(message => ({
            ...message,
            spamPrecheck: {
                senderHistoryAvailable: true,
                totalFromSender: 12,
                recent30DaysFromSender: 3,
                recent90DaysFromSender: 7,
                newsletterSignals: [],
                suggestedSpamMinimum: 3
            }
        })))
    };
    context.DashboardTrainingService = {
        relevantExamples: async () => [],
        findForMessage: async () => ({
            storageKey: 'known',
            correctedScores: { importanceScore: 91, spamScore: 4, riskScore: 6 },
            reasons: {
                importance: { categories: ['sender'], text: 'Known sender' },
                risk: { categories: ['previousExperience'], text: 'Verified sender' }
            }
        }),
        loadArchive: async () => [{ storageKey: 'known' }],
        updateArchivedFeedback: async (storageKey, feedback) => ({ storageKey, ...feedback }),
        removeArchivedFeedback: async storageKey => storageKey === 'known',
        archiveFeedback: options.archiveFeedback || (async (_message, feedback) => ({
            correctedScores: feedback.correctedScores,
            reasons: feedback.reasons,
            updatedAt: '2026-08-10T12:00:00.000Z'
        }))
    };
    const result = method => async () => {
        serviceCalls.push(method);
        return { content: `${method} result`, usedApi: true, model: 'gpt-5.6-luna' };
    };
    context.OpenAIService = {
        generateSummary: result('summary'),
        generateReply: result('reply'),
        refineReply: result('reply-refine'),
        categorizeEmail: result('categorize'),
        checkImportance: result('importance'),
        translateMessage: result('translate'),
        extractInfo: result('extract'),
        checkSpam: result('spam'),
        analyzeBulkTriage: async messages => {
            serviceCalls.push(`bulk:${messages.length}`);
            return {
                scores: messages.map((message, index) => ({
                    messageId: message.id,
                    importanceScore: 80 - index,
                    spamScore: 10 + index,
                    riskScore: 5 + index
                })),
                failedCount: 0,
                apiCalls: 1,
                model: 'gpt-5.6-luna'
            };
        },
        analyzeSingleScore: async () => ({
            importanceScore: 77,
            spamScore: 8,
            riskScore: 12,
            usedApi: true,
            model: 'gpt-5.6-terra'
        }),
        processChat: result('chat'),
        improveText: result('improve'),
        testConnection: async () => ({ success: true, message: 'ok' })
    };
    context.StorageManager = {
        updateStatistics: async (type, amount = 1) => stats.push(amount === 1 ? type : `${type}:${amount}`),
        getSettings: async () => ({}),
        saveSettings: async settings => {
            storageState[context.CONFIG.STORAGE_KEYS.DASHBOARD_OPEN_MODE]
                = context.DashboardLaunchService.normalizeMode(settings.dashboardOpenMode);
            storageState[context.CONFIG.STORAGE_KEYS.SINGLE_MAIL_OPEN_MODE]
                = context.LaunchModeService.normalizeMode(settings.singleMailOpenMode);
            return true;
        },
        set: async (key, value) => {
            storageState[key] = value;
            return true;
        }
    };
    loadScript(context, 'common/utils/retry.js');
    context.RetryService.wait = async () => {};
    loadScript(context, 'common/utils/dashboard-mailbox.js');
    if (options.backgroundInitializationError) {
        context.I18n.initialize = async () => {
            throw options.backgroundInitializationError;
        };
    }
    loadScript(context, 'common/background.js');
    const initializationResult = await context.thunderbirdAIInitialization;
    return {
        actionClick: async () => {
            actionClickListener?.({ id: 4, windowId: 2 });
            await new Promise(resolve => setImmediate(resolve));
        },
        messageActionClick: async () => {
            messageActionClickListener?.({ id: 5, windowId: 2 });
            await new Promise(resolve => setImmediate(resolve));
        },
        ai: context.thunderbirdAI,
        config: context.CONFIG,
        deleteCalls,
        install: details => installedListener?.(details),
        initializationResult,
        mailboxService: context.DashboardMailboxService,
        notifications,
        openedPopups,
        openedTabs,
        messagePopupAssignments,
        popupAssignments,
        serviceCalls,
        stats,
        storageState
    };
}

test('background startup avoids cross-script lexical declarations', () => {
    const launchMode = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/shared/LaunchModeService.js'),
        'utf8'
    );
    const dashboardLaunch = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/shared/DashboardLaunchService.js'),
        'utf8'
    );
    const background = fs.readFileSync(path.join(repositoryRoot, 'common/background.js'), 'utf8');

    assert.doesNotMatch(launchMode, /const LaunchModeService\s*=/u);
    assert.doesNotMatch(dashboardLaunch, /const DashboardLaunchService\s*=/u);
    assert.match(background, /globalThis\.DashboardLaunchService/u);
});

test('failed background startup remains diagnosable without a rejected initialization promise', async () => {
    const failure = new Error('Synthetic initialization failure');
    failure.code = 'TEST_INITIALIZATION_FAILURE';
    failure.stage = 'test-initialize';
    const { ai, config, initializationResult, storageState } = await loadBackground({
        backgroundInitializationError: failure,
        console: { error() {}, log() {}, warn() {} }
    });

    assert.equal(initializationResult, false);
    const health = await ai.handleMessage({ action: config.ACTIONS.GET_BACKGROUND_HEALTH });
    assert.equal(health.success, true);
    assert.equal(health.data.state, 'failed');
    assert.equal(health.data.code, 'TEST_INITIALIZATION_FAILURE');
    const settings = await ai.handleMessage({ action: config.ACTIONS.GET_SETTINGS });
    assert.equal(settings.success, false);
    assert.equal(settings.data.code, 'TEST_INITIALIZATION_FAILURE');
    assert.equal(
        storageState[config.STORAGE_KEYS.BACKGROUND_HEALTH_DIAGNOSTIC].state,
        'failed'
    );
});

test('stalled optional Thunderbird startup API is bounded and leaves settings reachable', async () => {
    const neverSettles = new Promise(() => {});
    const { ai, config, initializationResult, storageState } = await loadBackground({
        setDashboardPopup: async () => neverSettles,
        ui: {
            BACKGROUND_STARTUP_STEP_TIMEOUT_MS: 5,
            BACKGROUND_STARTUP_WRAPPER_GRACE_MS: 5,
            BACKGROUND_INITIALIZATION_WAIT_TIMEOUT_MS: 30
        },
        console: { error() {}, log() {}, warn() {} }
    });

    assert.equal(initializationResult, true);
    const health = await ai.handleMessage({ action: config.ACTIONS.GET_BACKGROUND_HEALTH });
    assert.equal(health.data.state, 'ready');
    assert.equal(health.data.code, 'BACKGROUND_READY_DEGRADED');
    assert.deepEqual(
        Array.from(health.data.warnings, warning => warning.stage),
        ['clear-action-popup']
    );
    const settings = await ai.handleMessage({ action: config.ACTIONS.GET_SETTINGS });
    assert.notEqual(settings.success, false);
    const events = storageState[config.STORAGE_KEYS.RUNTIME_DIAGNOSTICS];
    assert.ok(events.some(event => (
        event.action === 'initialize-dashboard-action-router'
        && event.state === 'reported-failure'
        && event.stage === 'clear-action-popup'
    )));
});

test('stalled context-menu provider does not prevent background requests', async () => {
    const neverSettles = new Promise(() => {});
    const { ai, config, initializationResult } = await loadBackground({
        removeMenus: async () => neverSettles,
        ui: {
            BACKGROUND_STARTUP_STEP_TIMEOUT_MS: 5,
            BACKGROUND_STARTUP_WRAPPER_GRACE_MS: 5,
            BACKGROUND_INITIALIZATION_WAIT_TIMEOUT_MS: 30
        },
        console: { error() {}, log() {}, warn() {} }
    });

    assert.equal(initializationResult, true);
    const health = await ai.handleMessage({ action: config.ACTIONS.GET_BACKGROUND_HEALTH });
    assert.equal(health.data.code, 'BACKGROUND_READY_DEGRADED');
    assert.ok(health.data.warnings.some(warning => warning.stage === 'context-menus'));
    const settings = await ai.handleMessage({ action: config.ACTIONS.GET_SETTINGS });
    assert.notEqual(settings.success, false);
});

test('install and update events defer stale dashboard cleanup until the next launch', async () => {
    const { config, install, storageState } = await loadBackground();

    await install({ reason: 'update' });

    assert.equal(
        storageState[config.STORAGE_KEYS.DASHBOARD_TAB_CLEANUP_PENDING],
        true
    );
});

test('saved dashboard tab mode routes the toolbar click through the wake-safe background listener', async () => {
    const initialStorage = { dashboardOpenMode: 'tab' };
    const { actionClick, openedTabs, popupAssignments } = await loadBackground({ initialStorage });

    assert.deepEqual(popupAssignments, [{ popup: '' }]);
    await actionClick();

    assert.equal(openedTabs.length, 1);
    assert.equal(
        openedTabs[0].url,
        'global-dashboard.html?view=expanded&source=saved-preference'
    );
});

test('toolbar launch failure is persisted and reported without blocking a later event', async () => {
    const { ai, config, notifications, storageState } = await loadBackground({
        initialStorage: { dashboardOpenMode: 'tab' },
        createTab: async () => {
            throw new Error('Content tab unavailable');
        },
        console: { error() {}, log() {}, warn() {} }
    });

    await ai.openDashboardFromToolbar();

    const diagnostic = storageState[config.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC];
    assert.equal(diagnostic.state, 'failed');
    assert.equal(diagnostic.stage, 'create-tab');
    assert.equal(diagnostic.code, 'DASHBOARD_LAUNCH_API_FAILED');
    assert.equal(notifications.length, 1);
    assert.match(notifications[0].message, /DASHBOARD_LAUNCH_API_FAILED/u);
});

test('launch preference runtime update keeps the wake-safe click router active', async () => {
    const { ai, config, popupAssignments, storageState } = await loadBackground({
        initialStorage: { dashboardOpenMode: 'tab' }
    });

    const response = await ai.handleMessage({
        action: config.ACTIONS.SET_DASHBOARD_OPEN_MODE,
        mode: 'overlay'
    });

    assert.equal(response.success, true);
    assert.equal(storageState.dashboardOpenMode, 'overlay');
    assert.deepEqual(popupAssignments, [
        { popup: '' },
        { popup: '' }
    ]);
});

test('dashboard overlay is assigned only for one routed click and then cleared', async () => {
    const { actionClick, openedPopups, popupAssignments } = await loadBackground();

    await actionClick();

    assert.deepEqual(openedPopups, [['dashboard', { windowId: 2 }]]);
    assert.deepEqual(popupAssignments, [
        { popup: '' },
        { popup: 'global-dashboard.html', tabId: 4 },
        { popup: '', tabId: 4 }
    ]);
});

test('single-mail launch mode is independent and opens the displayed message in a tab', async () => {
    const { messageActionClick, messagePopupAssignments, openedTabs } = await loadBackground({
        initialStorage: {
            dashboardOpenMode: 'overlay',
            singleMailOpenMode: 'tab'
        }
    });

    await messageActionClick();

    assert.deepEqual(messagePopupAssignments, [{ popup: '' }]);
    assert.equal(openedTabs.length, 1);
    assert.match(openedTabs[0].url, /single-mail-ui\.html\?messageId=73&view=expanded/u);
    assert.match(openedTabs[0].url, /source=saved-preference/u);
});

test('dashboard deletion runs in the background with modern user-action options', async () => {
    const { ai, config, deleteCalls, storageState } = await loadBackground();

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_TRASH_MESSAGES,
        messageIds: [7, 8, 7]
    });

    assert.equal(response.success, true);
    assert.deepEqual(
        deleteCalls.map(([ids, options]) => [Array.from(ids), { ...options }]),
        [[[7, 8], { deletePermanently: false, isUserAction: true }]]
    );
    assert.equal(response.data.code, 'DELETE_API_COMPLETED');
    assert.equal(
        storageState[config.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC].state,
        'completed'
    );
});

test('dashboard deletion retains the Thunderbird 128 compatibility signature', async () => {
    const { ai, config, deleteCalls } = await loadBackground({
        getBrowserInfo: async () => ({ version: '128.14.0esr' })
    });

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_TRASH_MESSAGES,
        messageIds: [7]
    });

    assert.equal(response.success, true);
    assert.deepEqual(
        deleteCalls.map(([ids, options]) => [Array.from(ids), options]),
        [[[7], false]]
    );
});

test('background deletion persists a content-free failure diagnostic', async () => {
    const { ai, config, storageState } = await loadBackground({
        deleteMessages: async () => { throw new Error('Provider rejected deletion'); }
    });

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_TRASH_MESSAGES,
        messageIds: [7]
    });

    assert.equal(response.success, false);
    assert.equal(response.data.code, 'DELETE_API_FAILED');
    assert.equal(response.data.technicalError, 'Provider rejected deletion');
    assert.deepEqual(Array.from(response.data.messageIds), [7]);
    assert.equal(
        storageState[config.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC].state,
        'failed'
    );
});

test('background deletion reports and persists an explicit timeout', async () => {
    const { ai, config, mailboxService, storageState } = await loadBackground();
    mailboxService.runDeleteWithTimeout = async () => {
        const error = new Error('Timed out in test');
        error.code = 'DELETE_API_TIMEOUT';
        throw error;
    };

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_TRASH_MESSAGES,
        messageIds: [7]
    });

    assert.equal(response.success, false);
    assert.equal(response.data.code, 'DELETE_API_TIMEOUT');
    assert.equal(response.data.state, 'timed-out');
    assert.equal(
        storageState[config.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC].state,
        'timed-out'
    );
});

test('every visible email AI action returns the shared result contract', async () => {
    const { ai, config, serviceCalls } = await loadBackground();
    const actions = [
        config.ACTIONS.SUMMARIZE,
        config.ACTIONS.REPLY,
        config.ACTIONS.CATEGORIZE,
        config.ACTIONS.IMPORTANCE,
        config.ACTIONS.TRANSLATE,
        config.ACTIONS.EXTRACT_INFO,
        config.ACTIONS.CHECK_SPAM
    ];

    for (const action of actions) {
        const response = await ai.handleMessage({ action, messageId: 7, targetLanguage: 'Deutsch' });
        assert.equal(response.success, true, action);
        assert.equal(typeof response.data.title, 'string', action);
        assert.equal(typeof response.data.content, 'string', action);
        assert.ok(Array.isArray(response.data.actions), action);
    }

    assert.deepEqual(serviceCalls, ['summary', 'reply', 'categorize', 'importance', 'translate', 'extract', 'spam']);
});

test('chat, similar-message search, and API test are functional routes', async () => {
    const { ai, config } = await loadBackground();

    const chat = await ai.handleMessage({ action: config.ACTIONS.CHAT, messageId: 7, query: 'Was ist wichtig?' });
    const similar = await ai.handleMessage({ action: config.ACTIONS.FIND_SIMILAR, messageId: 7 });
    const apiTest = await ai.handleMessage({ action: config.ACTIONS.TEST });

    assert.equal(chat.data.content, 'chat result');
    assert.match(similar.data.content, /Ähnlich/);
    assert.equal(apiTest.success, true);
});

test('reply refinement uses the source message and returns an editable reply result', async () => {
    const { ai, config, serviceCalls, stats } = await loadBackground();

    const response = await ai.handleMessage({
        action: config.ACTIONS.REFINE_REPLY,
        messageId: 7,
        currentDraft: 'Hallo Ada',
        instruction: 'Bitte kürzer',
        history: []
    });

    assert.equal(response.success, true);
    assert.equal(response.data.content, 'reply-refine result');
    assert.equal(response.data.messageId, 7);
    assert.ok(response.data.actions.some(action => action.type === 'reply'));
    assert.deepEqual(serviceCalls, ['reply-refine']);
    assert.deepEqual(stats, ['email', 'api']);
});

test('dashboard bulk triage uses the shared background message loader and score contract', async () => {
    const { ai, config, serviceCalls, stats } = await loadBackground();

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_BULK_TRIAGE,
        messageIds: [7, 8, 7]
    });

    assert.equal(response.success, true);
    assert.equal(response.data.model, 'gpt-5.6-luna');
    assert.deepEqual(Array.from(response.data.results, result => ({
        messageId: result.messageId,
        importanceScore: result.importanceScore,
        spamScore: result.spamScore,
        riskScore: result.riskScore
    })), [
        { messageId: 7, importanceScore: 80, spamScore: 10, riskScore: 5 },
        { messageId: 8, importanceScore: 79, spamScore: 11, riskScore: 6 }
    ]);
    assert.deepEqual(serviceCalls, ['bulk:2']);
    assert.deepEqual(stats, ['email:2', 'api']);
});

test('bulk and single scoring enrich messages with the shared local spam precheck', async () => {
    const enrichedIds = [];
    const { ai, config } = await loadBackground({
        enrichMessages: async messages => messages.map(message => {
            enrichedIds.push(message.id);
            return {
                ...message,
                spamPrecheck: { suggestedSpamMinimum: 42 }
            };
        })
    });

    await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_BULK_TRIAGE,
        messageIds: [7, 8]
    });
    await ai.handleMessage({ action: config.ACTIONS.SCORE_MESSAGE, messageId: 9 });

    assert.deepEqual(enrichedIds, [7, 8, 9]);
});

test('dashboard score feedback is routed to the independent background archive', async () => {
    const { ai, config } = await loadBackground();

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_SAVE_FEEDBACK,
        messageId: 7,
        originalScores: { importanceScore: 20, spamScore: 80, riskScore: 40 },
        correctedScores: { importanceScore: 90, spamScore: 5, riskScore: 4 },
        reasons: {
            importance: { categories: ['sender'], text: 'Trusted sender' },
            spam: { categories: ['content'], text: 'Expected content' },
            risk: { categories: ['previousExperience'], text: 'Previously verified' }
        },
        sourceModel: 'gpt-5.6-luna'
    });

    assert.equal(response.success, true);
    assert.deepEqual(
        {
            importanceScore: response.data.importanceScore,
            spamScore: response.data.spamScore,
            riskScore: response.data.riskScore,
            correctedAt: response.data.correctedAt,
            reasons: response.data.reasons
        },
        {
            importanceScore: 90,
            spamScore: 5,
            riskScore: 4,
            correctedAt: '2026-08-10T12:00:00.000Z',
            reasons: {
                importance: { categories: ['sender'], text: 'Trusted sender' },
                spam: { categories: ['content'], text: 'Expected content' },
                risk: { categories: ['previousExperience'], text: 'Previously verified' }
            }
        }
    );
});

test('dashboard score feedback retries a transient local read before reporting failure', async () => {
    let attempts = 0;
    const { ai, config } = await loadBackground({
        getFullMessage: async id => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error('Message temporarily unavailable');
            }
            return {
                id,
                subject: 'Test',
                author: 'Ada',
                formattedDate: '10.08.2026',
                content: 'Nachrichtentext',
                attachments: []
            };
        }
    });

    const response = await ai.handleMessage({
        action: config.ACTIONS.DASHBOARD_SAVE_FEEDBACK,
        messageId: 7,
        originalScores: { importanceScore: 20, spamScore: 80, riskScore: 40 },
        correctedScores: { importanceScore: 90, spamScore: 5, riskScore: 4 },
        reason: 'Trusted sender',
        sourceModel: 'gpt-5.6-luna'
    });

    assert.equal(response.success, true);
    assert.equal(attempts, 2);
});

test('single scoring reuses archived feedback and archive management stays background-owned', async () => {
    const { ai, config, stats } = await loadBackground();

    const score = await ai.handleMessage({ action: config.ACTIONS.SCORE_MESSAGE, messageId: 7 });
    const archive = await ai.handleMessage({ action: config.ACTIONS.GET_SCORE_ARCHIVE });
    const updated = await ai.handleMessage({
        action: config.ACTIONS.UPDATE_SCORE_ARCHIVE,
        storageKey: 'known',
        correctedScores: { importanceScore: 70, spamScore: 11, riskScore: 15 },
        reasons: {
            importance: { categories: ['content'], text: 'Changed' },
            risk: { categories: ['dangerousContent'], text: 'Suspicious link' }
        }
    });
    const removed = await ai.handleMessage({
        action: config.ACTIONS.REMOVE_SCORE_ARCHIVE,
        storageKey: 'known'
    });

    assert.equal(score.data.model, 'gpt-5.6-terra');
    assert.equal(score.data.archivedFeedback.storageKey, 'known');
    assert.deepEqual(stats, ['email', 'api']);
    assert.equal(archive.data[0].storageKey, 'known');
    assert.equal(updated.data.correctedScores.importanceScore, 70);
    assert.equal(updated.data.correctedScores.riskScore, 15);
    assert.equal(removed.success, true);
});

test('API statistics count recovered physical attempts without inventing retries', async () => {
    const { ai } = await loadBackground();

    assert.equal(ai.apiAttemptCount({ retryCount: 2 }), 3);
    assert.equal(ai.apiAttemptCount({ retryCount: 0 }), 1);
    assert.equal(ai.apiAttemptCount({}), 1);
});

test('settings persist both launch modes through the restricted runtime action', async () => {
    const { ai, config, storageState } = await loadBackground({
        initialStorage: {
            dashboardOpenMode: 'overlay',
            singleMailOpenMode: 'overlay'
        }
    });

    const dashboardResponse = await ai.handleMessage({
        action: config.ACTIONS.SET_LAUNCH_MODE,
        setting: 'dashboardOpenMode',
        mode: 'tab'
    });
    const singleMailResponse = await ai.handleMessage({
        action: config.ACTIONS.SET_LAUNCH_MODE,
        setting: 'singleMailOpenMode',
        mode: 'tab'
    });
    const invalidResponse = await ai.handleMessage({
        action: config.ACTIONS.SET_LAUNCH_MODE,
        setting: 'openaiApiKey',
        mode: 'tab'
    });

    assert.equal(dashboardResponse.success, true);
    assert.equal(singleMailResponse.success, true);
    assert.equal(invalidResponse.success, false);
    assert.equal(storageState.dashboardOpenMode, 'tab');
    assert.equal(storageState.singleMailOpenMode, 'tab');
});

test('global toolbar uses its compact localized name without changing other identities', () => {
    const manifest = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/manifest.json'),
        'utf8'
    ));
    const locales = ['en', 'de'].map(language => JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, `thunderbird-ai/_locales/${language}/messages.json`),
        'utf8'
    )));

    assert.equal(manifest.name, '__MSG_extensionName__');
    assert.equal(manifest.action.default_title, '__MSG_dashboardActionTitle__');
    assert.equal(manifest.message_display_action.default_title, '__MSG_actionTitle__');
    assert.deepEqual(Object.keys(locales[0]).sort(), Object.keys(locales[1]).sort());
    for (const locale of locales) {
        assert.equal(locale.extensionName.message, 'AI Mail Assistant for Thunderbird');
        assert.equal(locale.dashboardActionTitle.message, 'AI Mail Assistant');
        assert.equal(locale.actionTitle.message, 'AI Assistant');
    }
});

test('packaged UI sources contain no unfinished actions or retired models', () => {
    const sourceRoots = ['common', 'thunderbird-ai'];
    const files = sourceRoots.flatMap(root => {
        const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
            const location = path.join(directory, entry.name);
            return entry.isDirectory() ? walk(location) : [location];
        });
        return walk(path.join(repositoryRoot, root));
    }).filter(file => /\.(js|html|json)$/u.test(file));
    const source = files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
    const manifest = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/manifest.json'),
        'utf8'
    ));

    assert.doesNotMatch(source, /TODO:|not yet implemented|wird implementiert/u);
    assert.doesNotMatch(source, /gpt-3\.5|gpt-4-turbo/u);
    assert.match(source, /ChatComponent\.js/u);
    assert.match(source, /ReplyComposerComponent\.js/u);
    assert.match(source, /messages\.getFull/u);
    assert.ok(manifest.permissions.includes('clipboardWrite'));
    assert.ok(manifest.permissions.includes('sensitiveDataUpload'));
    assert.equal(manifest.version, '3.5.1');
    assert.equal(manifest.compose_action, undefined);
    assert.ok(
        manifest.background.scripts.indexOf('RuntimeDiagnosticService.js')
            < manifest.background.scripts.indexOf('background.js')
    );
    assert.ok(
        manifest.background.scripts.indexOf('retry.js')
            < manifest.background.scripts.indexOf('openai.js')
    );
    for (const [page, entryPoint] of [
        ['global-dashboard.html', 'global-dashboard.js'],
        ['settings.html', 'settingsEntry.js'],
        ['single-mail-ui.html', 'single-mail-ui.js']
    ]) {
        const html = fs.readFileSync(path.join(repositoryRoot, 'thunderbird-ai/pages', page), 'utf8');
        assert.ok(html.indexOf('retry.js') < html.indexOf(entryPoint), page);
    }
});
