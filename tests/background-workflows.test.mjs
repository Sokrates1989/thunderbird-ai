import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function eventTarget() {
    return { addListener() {} };
}

async function loadBackground(options = {}) {
    const stats = [];
    const serviceCalls = [];
    const deleteCalls = [];
    const storageState = { ...(options.initialStorage || {}) };
    const popupAssignments = [];
    const openedTabs = [];
    const notifications = [];
    let actionClickListener = null;
    const context = createContext({
        console: options.console || console,
        browser: {
            i18n: { getUILanguage: () => 'de-DE' },
            runtime: {
                onMessage: eventTarget(),
                getURL: value => value,
                getBrowserInfo: options.getBrowserInfo || (async () => ({ version: '140.0' }))
            },
            menus: { onClicked: eventTarget(), removeAll: async () => {}, create: async () => {} },
            action: {
                onClicked: { addListener: listener => { actionClickListener = listener; } },
                setPopup: async details => popupAssignments.push({ ...details })
            },
            messageDisplay: { onMessagesDisplayed: eventTarget() },
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
                create: options.createTab || (async details => {
                    openedTabs.push({ ...details });
                    return { id: 11, windowId: 3, ...details };
                })
            }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/RuntimeDiagnosticService.js');
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
    loadScript(context, 'common/background.js');
    await context.thunderbirdAIInitialization;
    await context.thunderbirdAI?.toolbarInitialization;
    return {
        actionClick: async () => {
            actionClickListener?.();
            await new Promise(resolve => setImmediate(resolve));
        },
        ai: context.thunderbirdAI,
        config: context.CONFIG,
        deleteCalls,
        mailboxService: context.DashboardMailboxService,
        notifications,
        openedTabs,
        popupAssignments,
        serviceCalls,
        stats,
        storageState
    };
}

test('saved tab mode disables the popup and routes the toolbar click to a content tab', async () => {
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

test('launch preference runtime update immediately restores the toolbar popup', async () => {
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
        { popup: 'global-dashboard.html' }
    ]);
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
