import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function account(id, name, type, rootFolder) {
    return { id, name, type, rootFolder };
}

function inbox(id, name = 'Inbox') {
    return { id, name, specialUse: ['inbox'], subFolders: [] };
}

function message(id, day) {
    return {
        id,
        subject: `Message ${id}`,
        author: `sender${id}@example.com`,
        date: new Date(Date.UTC(2026, 7, day))
    };
}

function loadService({
    accounts = [],
    query = async () => ({ id: null, messages: [] }),
    continueList = async () => ({ id: null, messages: [] }),
    getMessageContent = async () => '',
    deleteMessages = async () => {},
    archiveMessages = async () => {},
    updateMessage = async () => {}
}) {
    const aborted = [];
    const context = createContext({
        console: { error() {}, log() {}, warn() {} },
        MessageService: { getMessageContent },
        browser: {
            accounts: { list: async includeFolders => {
                assert.equal(includeFolders, true);
                return accounts;
            } },
            messages: {
                query,
                continueList,
                abortList: async id => aborted.push(id),
                delete: deleteMessages,
                archive: archiveMessages,
                update: updateMessage
            }
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailService.js');
    return { aborted, service: context.GlobalMailService };
}

function loadViewService() {
    const context = createContext({
        I18n: {
            getLanguage: () => 'en',
            t: key => ({
                dashboardUnknownSender: 'Unknown sender',
                dashboardAllAccounts: 'All accounts'
            }[key] || key)
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailViewService.js');
    return context.GlobalMailViewService;
}

function loadViewPreferences(initial = {}) {
    const storage = { ...initial };
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async keys => Object.fromEntries(
                    keys.filter(key => Object.hasOwn(storage, key)).map(key => [key, storage[key]])
                ),
                set: async values => Object.assign(storage, values)
            } }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailViewService.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardViewPreferences.js');
    return { context, preferences: context.DashboardViewPreferences, storage };
}

function loadSenderFilterComponent() {
    const context = createContext({ I18n: { getLanguage: () => 'en' } });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardSenderFilterComponent.js');
    return context.DashboardSenderFilterComponent;
}

function loadDashboardAIService() {
    const storageState = {};
    const openedTabs = [];
    const sentMessages = [];
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            runtime: {
                getURL: value => `moz-extension://test/${value}`,
                sendMessage: async message => {
                    sentMessages.push(message);
                    if (message.action === 'saveDashboardScoreFeedback') {
                        return { success: true, data: {
                            importanceScore: message.correctedScores.importanceScore,
                            spamScore: message.correctedScores.spamScore,
                            riskScore: message.correctedScores.riskScore,
                            correctedAt: '2026-08-10T12:00:00.000Z',
                            reasons: message.reasons
                        } };
                    }
                    return { success: true, data: { results: [], failedCount: 0, model: 'gpt-5.6-luna' } };
                }
            },
            storage: {
                local: {
                    get: async key => ({ [key]: storageState[key] }),
                    set: async values => Object.assign(storageState, values)
                }
            },
            tabs: { create: async details => openedTabs.push(details) }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/retry.js');
    context.RetryService.wait = async () => {};
    loadScript(context, 'common/utils/message.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardAIService.js');
    return { context, openedTabs, sentMessages, service: context.DashboardAIService, storageState };
}

function loadDashboardManager(services) {
    const globalMailService = typeof services === 'function'
        ? { markAsRead: services }
        : services;
    const context = createContext({
        console: { error() {}, log() {}, warn() {} },
        GlobalMailService: globalMailService,
        I18n: {
            t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}`
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalDashboardManager.js');
    return context.GlobalDashboardManager;
}

test('global dashboard reads every unread-header page for each Inbox', async () => {
    const firstInbox = inbox('inbox-a', 'Posteingang');
    const nestedInbox = inbox('inbox-b');
    const accounts = [
        account('a', 'Personal', 'imap', { id: 'root-a', subFolders: [firstInbox] }),
        account('b', 'Work', 'pop3', {
            id: 'root-b',
            subFolders: [{ id: 'container', subFolders: [nestedInbox] }]
        }),
        account('feed', 'Feeds', 'rss', { id: 'root-feed', subFolders: [inbox('feed-inbox')] }),
        account('empty', 'No Inbox', 'imap', { id: 'root-empty', subFolders: [] })
    ];
    const queries = [];
    const query = async options => {
        queries.push({ ...options });
        if (options.folderId === 'inbox-a') {
            return { id: 'list-a', messages: [message(1, 1), message(2, 2)] };
        }
        return { id: null, messages: [message(20, 2), message(21, 5)] };
    };
    const continued = [];
    const continueList = async id => {
        continued.push(id);
        return { id: null, messages: [message(12, 12), message(11, 11)] };
    };
    const { aborted, service } = loadService({ accounts, query, continueList });

    const results = await service.listUnreadByAccount();

    assert.equal(results.length, 2);
    assert.equal(results[0].accountName, 'Personal');
    assert.deepEqual(Array.from(results[0].messages, item => item.id), [1, 2, 12, 11]);
    assert.equal(results[1].accountName, 'Work');
    assert.deepEqual(Array.from(results[1].messages, item => item.id), [20, 21]);
    assert.deepEqual(queries, [
        { folderId: 'inbox-a', read: false, messagesPerPage: 100 },
        { folderId: 'inbox-b', read: false, messagesPerPage: 100 }
    ]);
    assert.deepEqual(continued, ['list-a']);
    assert.deepEqual(aborted, []);
});

test('newest-first default sorts later pages before applying the display limit', () => {
    const service = loadViewService();
    const accounts = [{
        accountId: 'a',
        accountName: 'Account',
        messages: [
            { ...message(1, 1), date: new Date('2025-08-01T10:00:00Z') },
            { ...message(2, 2), date: new Date('2026-08-09T10:00:00Z') },
            { ...message(3, 3), date: new Date('2026-08-10T10:00:00Z') }
        ]
    }];

    const result = service.apply(accounts, { limit: 2 });

    assert.deepEqual(Array.from(result[0].messages, item => item.id), [3, 2]);
    assert.equal(result[0].sourceCount, 3);
    assert.equal(result[0].matchingCount, 3);
});

test('combined view retains exactly the newest fifty matching messages across every account', () => {
    const service = loadViewService();
    const oldAccount = {
        accountId: 'old',
        accountName: 'Old account',
        messages: Array.from({ length: 4 }, (_value, index) => ({
            ...message(index + 1, 1),
            date: new Date(Date.UTC(2020, 0, index + 1))
        }))
    };
    const busyAccount = {
        accountId: 'busy',
        accountName: 'Busy account',
        messages: Array.from({ length: 55 }, (_value, index) => ({
            ...message(index + 100, 1),
            date: new Date(Date.UTC(2026, 6, index + 1))
        }))
    };

    const [combined] = service.apply([oldAccount, busyAccount], {
        viewMode: 'combined',
        sortOrder: 'date-desc',
        limit: 3
    });

    assert.equal(combined.accountName, 'All accounts');
    assert.equal(combined.combined, true);
    assert.equal(combined.messages.length, 50);
    assert.ok(combined.messages.every(item => item.id >= 105));
    assert.equal(combined.messages[0].id, 154);
    assert.equal(combined.messages[0].dashboardAccountName, 'Busy account');
    assert.equal(combined.matchingCount, 59);
});

test('combined display sorting never expands its newest-fifty global candidate set', () => {
    const service = loadViewService();
    const messages = Array.from({ length: 51 }, (_value, index) => ({
        ...message(index + 1, 1),
        author: index === 0 ? 'AAA oldest' : `Sender ${index}`,
        date: new Date(Date.UTC(2026, 0, index + 1))
    }));

    const [combined] = service.apply([{
        accountId: 'one',
        accountName: 'One',
        messages
    }], {
        viewMode: 'combined',
        sortOrder: 'sender-asc'
    });

    assert.equal(combined.messages.length, 50);
    assert.ok(combined.messages.every(item => item.id !== 1));
});

test('sender and inclusive date filters run before participant sorting and limits', () => {
    const service = loadViewService();
    const accounts = [{ messages: [
        { ...message(1, 1), author: 'Zoe <zoe@example.test>', date: new Date('2026-08-09T08:00:00') },
        { ...message(2, 2), author: 'Ada <ada@example.test>', date: new Date('2026-08-10T09:00:00') },
        { ...message(3, 3), author: 'Bob <bob@example.test>', date: new Date('2026-08-10T10:00:00') },
        { ...message(4, 4), author: 'Ada <ada@example.test>', date: new Date('2026-08-11T11:00:00') }
    ] }];

    const result = service.apply(accounts, {
        fromDate: '2026-08-10',
        toDate: '2026-08-10',
        selectedSenders: ['ada <ada@example.test>', 'bob <bob@example.test>'],
        sortOrder: 'sender-desc',
        limit: 10
    });

    assert.deepEqual(Array.from(result[0].messages, item => item.id), [3, 2]);
    assert.equal(result[0].matchingCount, 2);

    const ascending = service.apply(accounts, {
        fromDate: '2026-08-10',
        toDate: '2026-08-10',
        sortOrder: 'sender-asc',
        limit: 10
    });
    assert.deepEqual(Array.from(ascending[0].messages, item => item.id), [2, 3]);
});

test('AI scores support importance, spam, and risk sorting plus analyzed-state filters', () => {
    const service = loadViewService();
    const accounts = [{ messages: [
        { ...message(1, 1), aiAnalysis: { importanceScore: 25, spamScore: 92, riskScore: 75 } },
        { ...message(2, 2), aiAnalysis: { importanceScore: 88, spamScore: 12, riskScore: 10 } },
        { ...message(3, 3) }
    ] }];

    const important = service.apply(accounts, { sortOrder: 'importance-desc', limit: 10 });
    const leastImportant = service.apply(accounts, { sortOrder: 'importance-asc', limit: 10 });
    const leastSpam = service.apply(accounts, { sortOrder: 'spam-asc', limit: 10 });
    const highestRisk = service.apply(accounts, { sortOrder: 'risk-desc', limit: 10 });
    const lowestRisk = service.apply(accounts, { sortOrder: 'risk-asc', limit: 10 });
    const spam = service.apply(accounts, {
        sortOrder: 'spam-desc',
        aiStatusFilter: 'probably-spam',
        importanceMinimum: 20,
        limit: 10
    });
    const unanalyzed = service.apply(accounts, { aiStatusFilter: 'unanalyzed', limit: 10 });
    const risky = service.apply(accounts, { aiStatusFilter: 'probably-risky', limit: 10 });
    const lowRisk = service.apply(accounts, { aiStatusFilter: 'probably-low-risk', limit: 10 });

    assert.deepEqual(Array.from(important[0].messages, item => item.id), [2, 1, 3]);
    assert.deepEqual(Array.from(leastImportant[0].messages, item => item.id), [1, 2, 3]);
    assert.deepEqual(Array.from(leastSpam[0].messages, item => item.id), [2, 1, 3]);
    assert.deepEqual(Array.from(highestRisk[0].messages, item => item.id), [1, 2, 3]);
    assert.deepEqual(Array.from(lowestRisk[0].messages, item => item.id), [2, 1, 3]);
    assert.deepEqual(Array.from(spam[0].messages, item => item.id), [1]);
    assert.deepEqual(Array.from(unanalyzed[0].messages, item => item.id), [3]);
    assert.deepEqual(Array.from(risky[0].messages, item => item.id), [1]);
    assert.deepEqual(Array.from(lowRisk[0].messages, item => item.id), [2]);
});

test('explicit global AI sorts flatten scored messages across account boundaries', () => {
    const service = loadViewService();
    const accounts = [
        {
            accountId: 'personal',
            accountName: 'Personal',
            messages: [
                { ...message(1, 1), aiAnalysis: { importanceScore: 20, spamScore: 90, riskScore: 85 } },
                { ...message(2, 2), aiAnalysis: { importanceScore: 95, spamScore: 5, riskScore: 4 } }
            ]
        },
        {
            accountId: 'work',
            accountName: 'Work',
            messages: [
                { ...message(3, 3), aiAnalysis: { importanceScore: 70, spamScore: 40, riskScore: 35 } }
            ]
        }
    ];

    const [combined] = service.apply(accounts, {
        viewMode: 'account',
        sortOrder: 'importance-global-desc',
        limit: 1
    });

    assert.equal(combined.combined, true);
    assert.deepEqual(Array.from(combined.messages, item => item.id), [2, 3, 1]);
    assert.deepEqual(
        Array.from(combined.messages, item => item.dashboardAccountName),
        ['Personal', 'Work', 'Personal']
    );
});

test('dashboard grouping mode is normalized and persisted independently', async () => {
    const { context, preferences, storage } = loadViewPreferences({
        dashboardViewMode: 'combined',
        dashboardRiskMinimum: 63
    });

    const loaded = await preferences.load();
    assert.equal(loaded.viewMode, 'combined');
    assert.equal(loaded.riskMinimum, 63);
    loaded.viewMode = 'account';
    loaded.riskMinimum = 71;
    await preferences.save(loaded);

    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_VIEW_MODE], 'account');
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_RISK_MINIMUM], 71);
    assert.equal(context.GlobalMailViewService.normalizeViewMode('invalid'), 'account');
});

test('dashboard AI scores persist without mail content and direct actions open shared workspaces', async () => {
    const { context, openedTabs, sentMessages, service, storageState } = loadDashboardAIService();

    const accounts = [{ accountId: 'personal', messages: [{
        id: 42,
        headerMessageId: 'stable@example.test',
        subject: 'Private body stays out of storage'
    }] }];
    const scores = service.addStorageKeys(accounts, [{
        messageId: 42,
        importanceScore: 81,
        spamScore: 9,
        riskScore: 14
    }]);
    const saved = await service.saveResults({}, scores, 'gpt-5.6-luna');
    const restartedAccounts = [{ accountId: 'personal', messages: [{
        id: 999,
        headerMessageId: 'stable@example.test',
        subject: 'Private body stays out of storage'
    }] }];
    service.attachResults(restartedAccounts, saved);
    await service.analyze([42]);
    restartedAccounts[0].messages[0].correctedImportanceScore = 94;
    restartedAccounts[0].messages[0].correctedSpamScore = 2;
    restartedAccounts[0].messages[0].correctedRiskScore = 3;
    const reasons = {
        importance: { categories: ['sender'], text: 'Known supplier' },
        spam: { categories: ['content'], text: 'Expected invoice' },
        risk: { categories: ['previousExperience'], text: 'Verified supplier' }
    };
    const correction = await service.submitFeedback(
        restartedAccounts[0].messages[0],
        reasons
    );
    const corrected = await service.saveCorrection(
        saved,
        restartedAccounts[0],
        restartedAccounts[0].messages[0],
        correction
    );
    await service.openWorkspace(42, 'summarize');
    await service.openWorkspace(42, 'reply');

    const [persisted] = Object.values(
        storageState[context.CONFIG.STORAGE_KEYS.DASHBOARD_AI_RESULTS]
    );
    assert.deepEqual(
        {
            importanceScore: persisted.importanceScore,
            spamScore: persisted.spamScore,
            riskScore: persisted.riskScore,
            model: persisted.model,
            corrected: persisted.corrected
        },
        { importanceScore: 94, spamScore: 2, riskScore: 3, model: 'gpt-5.6-luna', corrected: true }
    );
    assert.doesNotMatch(JSON.stringify(storageState), /Private body/u);
    assert.equal(restartedAccounts[0].messages[0].aiAnalysis.importanceScore, 81);
    assert.equal(restartedAccounts[0].messages[0].aiAnalysis.riskScore, 14);
    assert.equal(sentMessages[0].action, context.CONFIG.ACTIONS.DASHBOARD_BULK_TRIAGE);
    assert.equal(sentMessages[1].action, context.CONFIG.ACTIONS.DASHBOARD_SAVE_FEEDBACK);
    assert.deepEqual(sentMessages[1].reasons, reasons);
    assert.equal(Object.values(corrected)[0].importanceScore, 94);
    assert.equal(Object.values(corrected)[0].riskScore, 3);
    assert.equal(Object.values(corrected)[0].corrected, true);
    assert.deepEqual(
        JSON.parse(JSON.stringify(Object.values(corrected)[0].reasons)),
        reasons
    );
    assert.match(openedTabs[0].url, /single-mail-ui\.html\?messageId=42&summarize=1/u);
    assert.match(openedTabs[1].url, /single-mail-ui\.html\?messageId=42&reply=1/u);
});

test('ordinary bulk scoring skips persisted results and protects them from replacement', async () => {
    const { service, sentMessages } = loadDashboardAIService();
    const analyzed = {
        id: 1,
        headerMessageId: 'scored@example.test',
        aiAnalysis: { importanceScore: 91, spamScore: 4, riskScore: null, corrected: true }
    };
    const unscored = { id: 2, headerMessageId: 'new@example.test', aiAnalysis: null };
    const accounts = [{ accountId: 'personal', messages: [analyzed, unscored] }];

    const ordinaryPlan = service.createAnalysisPlan(accounts, new Set([1, 2]), false);
    const rescorePlan = service.createAnalysisPlan(accounts, new Set([1, 2]), true);
    const allScoredPlan = service.createAnalysisPlan(accounts, new Set([1]), false);

    assert.deepEqual(Array.from(ordinaryPlan.messageIds), [2]);
    assert.equal(ordinaryPlan.selectedCount, 2);
    assert.equal(ordinaryPlan.skippedCount, 1);
    assert.deepEqual(Array.from(rescorePlan.messageIds), [1, 2]);
    assert.equal(rescorePlan.selectedCount, 2);
    assert.equal(rescorePlan.skippedCount, 0);
    assert.deepEqual(Array.from(allScoredPlan.messageIds), []);
    assert.equal(allScoredPlan.selectedCount, 1);
    assert.equal(allScoredPlan.skippedCount, 1);
    assert.equal(await service.analyzePlan(allScoredPlan), null);
    assert.equal(sentMessages.length, 0);
    await service.analyzePlan(ordinaryPlan);
    assert.deepEqual(Array.from(sentMessages[0].messageIds), [2]);

    const storageKey = service.messageKey(accounts[0], analyzed);
    const existing = {
        [storageKey]: {
            importanceScore: 91,
            spamScore: 4,
            riskScore: null,
            analyzedAt: '2026-08-10T10:00:00.000Z',
            model: 'gpt-5.6-luna',
            corrected: true,
            correctedAt: '2026-08-10T10:30:00.000Z'
        }
    };
    const replacement = [{
        storageKey,
        messageId: 1,
        importanceScore: 10,
        spamScore: 80,
        riskScore: 65
    }];
    const protectedResults = await service.saveResults(
        existing,
        replacement,
        'gpt-5.6-luna',
        { preserveExisting: true }
    );
    const replacedResults = await service.saveResults(
        existing,
        replacement,
        'gpt-5.6-luna',
        { preserveExisting: false }
    );

    assert.equal(protectedResults[storageKey].importanceScore, 91);
    assert.equal(protectedResults[storageKey].riskScore, null);
    assert.equal(protectedResults[storageKey].corrected, true);
    assert.equal(replacedResults[storageKey].importanceScore, 10);
    assert.equal(replacedResults[storageKey].riskScore, 65);
    assert.equal(replacedResults[storageKey].corrected, false);
});

test('only the limited visible slice requests content previews', async () => {
    const requested = [];
    const viewService = loadViewService();
    const { service } = loadService({
        getMessageContent: async id => {
            requested.push(id);
            return `Body ${id}`;
        }
    });
    const source = [{ messages: [message(1, 1), message(2, 2), message(3, 3)] }];
    const visible = viewService.apply(source, { limit: 1 });

    await service.loadPreviews(visible);

    assert.deepEqual(requested, [3]);
    assert.equal(source[0].messages[2].preview, 'Body 3');
    assert.equal(source[0].messages[1].preview, undefined);
});

test('display limits are clamped to a reasonable one-to-fifty range', () => {
    const service = loadViewService();

    assert.equal(service.normalizeLimit(0), 1);
    assert.equal(service.normalizeLimit(10), 10);
    assert.equal(service.normalizeLimit(500), 50);
    assert.equal(service.normalizeLimit('invalid'), 10);
});

test('sender choices are unique and alphabetically ordered', () => {
    const service = loadViewService();
    const accounts = [{ messages: [
        { author: 'Zoe <zoe@example.test>' },
        { author: 'ada <ada@example.test>' },
        { author: 'Zoe <zoe@example.test>' },
        { author: '' }
    ] }];

    const senders = service.availableSenders(accounts, 'en');

    assert.deepEqual(
        Array.from(senders, sender => ({ key: sender.key, label: sender.label })),
        [
            { key: 'ada <ada@example.test>', label: 'ada <ada@example.test>' },
            { key: '__unknown_sender__', label: 'Unknown sender' },
            { key: 'zoe <zoe@example.test>', label: 'Zoe <zoe@example.test>' }
        ]
    );
});

test('sender dropdown collapses a complete checkbox selection to the all-senders sentinel', () => {
    const SenderFilter = loadSenderFilterComponent();
    const component = new SenderFilter({
        details: null,
        summary: null,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    component.availableSenders = [{ key: 'ada' }, { key: 'bob' }];
    component.selectedSenderKeys = null;

    const onlyAda = component.selectionAfterToggle('bob', false);
    component.selectedSenderKeys = onlyAda;
    const allAgain = component.selectionAfterToggle('bob', true);

    assert.deepEqual(Array.from(onlyAda), ['ada']);
    assert.equal(allAgain, null);
});

test('sender search filters only visible options and preserves selections across queries', () => {
    const SenderFilter = loadSenderFilterComponent();
    const component = new SenderFilter({
        details: null,
        summary: null,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    component.availableSenders = [
        { key: 'ada <ada@example.test>', label: 'Ada <ada@example.test>' },
        { key: 'bob <bob@example.test>', label: 'Bob <bob@example.test>' },
        { key: 'shop <orders@amazon.com>', label: 'Amazon Shop <orders@amazon.com>' }
    ];
    component.selectedSenderKeys = new Set();

    assert.deepEqual(
        Array.from(component.filteredSenders('AMAZON.COM'), sender => sender.key),
        ['shop <orders@amazon.com>']
    );
    let selection = component.selectionAfterToggle('ada <ada@example.test>', true);
    component.selectedSenderKeys = selection;
    assert.deepEqual(
        Array.from(component.filteredSenders('bob'), sender => sender.key),
        ['bob <bob@example.test>']
    );
    selection = component.selectionAfterToggle('bob <bob@example.test>', true);

    assert.deepEqual([...selection].sort(), [
        'ada <ada@example.test>',
        'bob <bob@example.test>'
    ]);
});

test('an interrupted continuation is aborted and isolated to its account', async () => {
    const accounts = [
        account('broken', 'Broken', 'imap', { id: 'root-broken', subFolders: [inbox('broken-inbox')] })
    ];
    const { aborted, service } = loadService({
        accounts,
        query: async () => ({ id: 'broken-list', messages: [message(1, 1)] }),
        continueList: async () => {
            throw new Error('Continuation failed');
        }
    });

    const result = await service.listUnreadByAccount();

    assert.equal(result[0].failed, true);
    assert.deepEqual(aborted, ['broken-list']);
});

test('dashboard previews are loaded locally and one MIME failure stays isolated', async () => {
    const calls = [];
    const getMessageContent = async id => {
        calls.push(id);
        if (id === 2) {
            throw new Error('Body unavailable');
        }
        return `Body ${id}`;
    };
    const { service } = loadService({ getMessageContent });
    const accounts = [{ messages: [message(1, 1), message(2, 2), message(3, 3)] }];

    const result = await service.loadPreviews(accounts, 2);

    assert.equal(result, accounts);
    assert.deepEqual(calls.sort(), [1, 2, 3]);
    assert.equal(accounts[0].messages[0].preview, 'Body 1');
    assert.equal(accounts[0].messages[0].previewFailed, false);
    assert.equal(accounts[0].messages[1].preview, '');
    assert.equal(accounts[0].messages[1].previewFailed, true);
    assert.equal(accounts[0].messages[2].preview, 'Body 3');
});

test('dashboard deletion uses the Thunderbird 128 non-permanent signature', async () => {
    const calls = [];
    const { service } = loadService({
        deleteMessages: async (...parameters) => calls.push(parameters)
    });

    await service.moveToTrash([7, 8, 7, null, undefined]);

    assert.deepEqual(calls.map(([ids, permanent]) => [Array.from(ids), permanent]), [[[7, 8], false]]);
});

test('dashboard archiving delegates unique messages to the native Thunderbird archive action', async () => {
    const calls = [];
    const { service } = loadService({
        archiveMessages: async messageIds => calls.push([...messageIds])
    });

    await service.archiveMessages([7, 8, 7, null, undefined]);

    assert.deepEqual(calls, [[7, 8]]);
});

test('mark as read updates each unique message and isolates partial failures', async () => {
    const calls = [];
    const { service } = loadService({
        updateMessage: async (messageId, properties) => {
            calls.push([messageId, { ...properties }]);
            if (messageId === 8) {
                throw new Error('Message unavailable');
            }
        }
    });

    const result = await service.markAsRead([7, 8, 7, null, undefined]);

    assert.deepEqual(calls, [
        [7, { read: true }],
        [8, { read: true }]
    ]);
    assert.deepEqual(Array.from(result.updatedIds), [7]);
    assert.deepEqual(Array.from(result.failedIds), [8]);
});

test('selected mark-as-read refreshes the unread view and reports partial success', async () => {
    const calls = [];
    const DashboardManager = loadDashboardManager(async messageIds => {
        calls.push([...messageIds]);
        return { updatedIds: [7], failedIds: [8] };
    });
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    let refreshCount = 0;
    manager.selectedMessageIds = new Set([7, 8]);
    manager.setBusy = busy => busyStates.push(busy);
    manager.refresh = async () => { refreshCount += 1; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);

    await manager.markSelectedAsRead();

    assert.deepEqual(calls, [[7, 8]]);
    assert.equal(refreshCount, 1);
    assert.equal(manager.selectedMessageIds.size, 0);
    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, [[
        'dashboardMarkReadPartial:{"updated":1,"failed":1}',
        'warning'
    ]]);
});

test('selected archive refreshes the unread view and reports the archived count', async () => {
    const calls = [];
    const DashboardManager = loadDashboardManager({
        archiveMessages: async messageIds => calls.push([...messageIds])
    });
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    let refreshCount = 0;
    manager.selectedMessageIds = new Set([7, 8]);
    manager.setBusy = busy => busyStates.push(busy);
    manager.refresh = async () => { refreshCount += 1; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);

    await manager.archiveSelected();

    assert.deepEqual(calls, [[7, 8]]);
    assert.equal(refreshCount, 1);
    assert.equal(manager.selectedMessageIds.size, 0);
    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, [[
        'dashboardArchiveSelectedSuccess:{"count":2}',
        'success'
    ]]);
});

test('failed archive keeps the selection and reports the Thunderbird archive setup error', async () => {
    const DashboardManager = loadDashboardManager({
        archiveMessages: async () => { throw new Error('Archive is not configured'); }
    });
    const manager = Object.create(DashboardManager.prototype);
    const statuses = [];
    let refreshCount = 0;
    manager.selectedMessageIds = new Set([7]);
    manager.setBusy = () => {};
    manager.refresh = async () => { refreshCount += 1; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);

    await manager.archiveSelected();

    assert.equal(refreshCount, 0);
    assert.deepEqual([...manager.selectedMessageIds], [7]);
    assert.deepEqual(statuses, [[
        'dashboardArchiveFailed:{}',
        'error'
    ]]);
});

test('one unread query failure does not hide the remaining accounts', async () => {
    const accounts = [
        account('broken', 'Broken', 'imap', { id: 'root-broken', subFolders: [inbox('broken-inbox')] }),
        account('working', 'Working', 'imap', { id: 'root-working', subFolders: [inbox('working-inbox')] })
    ];
    const query = async ({ folderId }) => {
        if (folderId === 'broken-inbox') {
            throw new Error('Mailbox unavailable');
        }
        return { id: 'working-list', messages: [message(30, 6)] };
    };
    const { service } = loadService({ accounts, query });

    const results = await service.listUnreadByAccount(10);

    assert.equal(results[0].failed, true);
    assert.equal(results[0].messages.length, 0);
    assert.equal(results[1].failed, false);
    assert.equal(results[1].messages[0].id, 30);
});

test('manifest routes global and message toolbar actions to separate popup pages', () => {
    const manifest = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/manifest.json'),
        'utf8'
    ));
    const dashboard = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/global-dashboard.html'),
        'utf8'
    );
    const dashboardStyles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/global-dashboard.css'),
        'utf8'
    );
    const messageComponent = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/global-dashboard/DashboardMessageComponent.js'),
        'utf8'
    );
    const singleMailManager = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/SingleMailManager.js'),
        'utf8'
    );
    const singleMailPage = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/single-mail-ui.html'),
        'utf8'
    );
    const settingsPage = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/settings.html'),
        'utf8'
    );
    const feedbackEditor = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/shared/ScoreFeedbackEditor.js'),
        'utf8'
    );
    const dashboardFeedback = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/global-dashboard/DashboardFeedbackComponent.js'),
        'utf8'
    );
    const singleResults = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/ResultsComponent.js'),
        'utf8'
    );
    const scoringArchive = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/settings/ScoringArchiveComponent.js'),
        'utf8'
    );

    assert.equal(manifest.action.default_popup, 'global-dashboard.html');
    assert.equal(manifest.message_display_action.default_popup, 'single-mail-ui.html');
    assert.ok(manifest.permissions.includes('messagesDelete'));
    assert.ok(manifest.permissions.includes('messagesUpdate'));
    assert.ok(manifest.permissions.includes('messagesMove'));
    assert.ok(manifest.background.scripts.indexOf('dashboard-training.js')
        > manifest.background.scripts.indexOf('message.js'));
    assert.ok(manifest.background.scripts.indexOf('dashboard-training.js')
        < manifest.background.scripts.indexOf('openai.js'));
    assert.match(dashboard, /id="dashboardSelectAll"/u);
    assert.match(dashboard, /id="dashboardTrashSelected"/u);
    assert.match(dashboard, /id="dashboardMarkReadSelected"/u);
    assert.match(dashboard, /id="dashboardArchiveSelected"/u);
    assert.match(dashboard, /class="dashboard-bulk-action-groups"/u);
    assert.match(dashboard, /class="dashboard-action-icon" aria-hidden="true"/u);
    assert.match(dashboard, /id="dashboardShowPreview"/u);
    assert.match(dashboard, /id="dashboardPreviewLines"/u);
    assert.match(dashboard, /id="dashboardSortOrder"/u);
    assert.match(dashboard, /id="dashboardViewMode"/u);
    assert.match(dashboard, /id="dashboardMessageLimit"/u);
    assert.match(dashboard, /id="dashboardDateFrom"[^>]*type="date"|type="date"[^>]*id="dashboardDateFrom"/u);
    assert.match(dashboard, /id="dashboardDateTo"[^>]*type="date"|type="date"[^>]*id="dashboardDateTo"/u);
    assert.match(dashboard, /id="dashboardSenderFilter"/u);
    assert.match(dashboard, /id="dashboardAIStatusFilter"/u);
    assert.match(dashboard, /id="dashboardImportanceMinimum"/u);
    assert.match(dashboard, /id="dashboardSpamMinimum"/u);
    assert.match(dashboard, /id="dashboardRiskMinimum"/u);
    assert.match(dashboard, /id="dashboardAnalyzeSelected"/u);
    assert.match(dashboard, /id="dashboardRescoreSelected"/u);
    assert.match(dashboard, /value="importance-global-desc"/u);
    assert.match(dashboard, /value="spam-global-desc"/u);
    assert.match(dashboard, /value="risk-global-desc"/u);
    assert.match(dashboard, /id="dashboardLoadingIndicator"/u);
    assert.match(dashboard, /message\.js/u);
    assert.match(dashboard, /GlobalMailService\.js/u);
    assert.match(dashboard, /GlobalMailViewService\.js/u);
    assert.match(dashboard, /DashboardSenderFilterComponent\.js/u);
    assert.match(dashboard, /DashboardViewPreferences\.js/u);
    assert.match(dashboard, /DashboardAIService\.js/u);
    assert.match(dashboard, /DashboardMessageComponent\.js/u);
    assert.match(dashboard, /ScoreFeedbackEditor\.js/u);
    assert.match(dashboard, /DashboardFeedbackComponent\.js/u);
    assert.match(dashboard, /id="dashboardFeedbackDialog"/u);
    assert.match(dashboard, /id="dashboardFeedbackEditors"/u);
    assert.doesNotMatch(dashboard, /id="dashboardFeedbackReason"/u);
    assert.match(dashboard, /GlobalDashboardManager\.js/u);
    assert.doesNotMatch(dashboard, /openai\.js|OpenAIService/u);
    assert.match(dashboardStyles, /overflow-y:\s*auto/u);
    assert.match(dashboardStyles, /--dashboard-preview-lines/u);
    assert.match(dashboardStyles, /@keyframes dashboard-spin/u);
    assert.match(
        dashboardStyles,
        /\.dashboard-message-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-bulk-action-groups\s*\{[^}]*grid-template-columns:\s*repeat\(2,/su
    );
    assert.match(messageComponent, /dashboardMarkReadOne/u);
    assert.match(messageComponent, /dashboardArchiveOne/u);
    assert.match(messageComponent, /dashboard-message-action-group/u);
    assert.match(messageComponent, /dashboard-action-icon/u);
    assert.match(singleMailManager, /parameters\.get\('summarize'\) === '1'[\s\S]*executeAIAction\('SUMMARIZE_EMAIL'\)/u);
    assert.match(singleMailPage, /ScoreFeedbackEditor\.js/u);
    assert.match(settingsPage, /ScoreFeedbackEditor\.js/u);
    assert.match(feedbackEditor, /SCORE_FEEDBACK_CATEGORIES/u);
    assert.match(feedbackEditor, /readReasons\(editor\)/u);
    assert.equal((dashboardFeedback.match(/ScoreFeedbackEditor\.create/gu) || []).length, 3);
    assert.equal((singleResults.match(/ScoreFeedbackEditor\.create/gu) || []).length, 3);
    assert.equal((scoringArchive.match(/ScoreFeedbackEditor\.create/gu) || []).length, 3);
    assert.match(dashboardFeedback, /importance:\s*ScoreFeedbackEditor\.readReasons/u);
    assert.match(dashboardFeedback, /spam:\s*ScoreFeedbackEditor\.readReasons/u);
    assert.match(dashboardFeedback, /risk:\s*ScoreFeedbackEditor\.readReasons/u);
});
