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
    listAccounts = async () => accounts,
    query = async () => ({ id: null, messages: [] }),
    continueList = async () => ({ id: null, messages: [] }),
    getMessageContent = async () => '',
    sendRuntimeMessage = async () => ({ success: true, data: { state: 'completed' } }),
    archiveMessages = async () => {},
    updateMessage = async () => {},
    openMessage = async () => ({})
}) {
    const aborted = [];
    const storageState = {};
    const context = createContext({
        console: { error() {}, log() {}, warn() {} },
        CONFIG: {
            ACTIONS: { DASHBOARD_TRASH_MESSAGES: 'trashDashboardMessages' },
            STORAGE_KEYS: { DASHBOARD_DELETE_DIAGNOSTIC: 'dashboardDeleteDiagnostic' }
        },
        I18n: { t: key => key },
        MessageService: { getMessageContent },
        browser: {
            runtime: { sendMessage: sendRuntimeMessage },
            storage: { local: {
                get: async key => ({ [key]: storageState[key] }),
                set: async values => Object.assign(storageState, values)
            } },
            accounts: { list: async includeFolders => {
                assert.equal(includeFolders, true);
                return listAccounts();
            } },
            messages: {
                query,
                continueList,
                abortList: async id => aborted.push(id),
                archive: archiveMessages,
                update: updateMessage
            },
            messageDisplay: { open: openMessage }
        }
    });
    loadScript(context, 'common/utils/retry.js');
    loadScript(context, 'thunderbird-ai/components/shared/MailboxActionService.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailService.js');
    return {
        aborted,
        mailboxActionService: context.MailboxActionService,
        service: context.GlobalMailService,
        storageState
    };
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

function loadViewPreferences({ local = {}, session = {} } = {}) {
    const storage = { ...local };
    const sessionStorage = { ...session };
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: {
                local: {
                    get: async keys => Object.fromEntries(
                        keys.filter(key => Object.hasOwn(storage, key)).map(key => [key, storage[key]])
                    ),
                    set: async values => Object.assign(storage, values),
                    remove: async keys => {
                        for (const key of keys) {
                            delete storage[key];
                        }
                    }
                },
                session: {
                    get: async keys => Object.fromEntries(
                        (Array.isArray(keys) ? keys : [keys])
                            .filter(key => Object.hasOwn(sessionStorage, key))
                            .map(key => [key, sessionStorage[key]])
                    ),
                    set: async values => Object.assign(sessionStorage, values)
                }
            }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailViewService.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardViewPreferences.js');
    return { context, preferences: context.DashboardViewPreferences, storage, sessionStorage };
}

function loadSenderFilterComponent() {
    const context = createContext({
        I18n: {
            getLanguage: () => 'en',
            t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}`
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardSenderFilterComponent.js');
    return context.DashboardSenderFilterComponent;
}

function loadMessageComponent() {
    const context = createContext({ I18n: { t: key => key } });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardMessageComponent.js');
    return context.DashboardMessageComponent;
}

function loadPreviewController() {
    const context = createContext({
        I18n: { t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}` }
    });
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardPreviewController.js'
    );
    return context.DashboardPreviewController;
}

function loadMessageContextMenuComponent() {
    const context = createContext({ I18n: { t: key => key } });
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardMessageContextMenuComponent.js'
    );
    return context.DashboardMessageContextMenuComponent;
}

function loadDashboardAIService(options = {}) {
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
                    return { success: true, data: options.bulkData || {
                        results: [],
                        failedCount: 0,
                        model: 'gpt-5.6-luna'
                    } };
                }
            },
            storage: {
                local: {
                    get: async key => ({ [key]: storageState[key] }),
                    set: async values => Object.assign(storageState, values)
                }
            },
            tabs: {
                query: async () => [],
                update: async (tabId, details) => ({ id: tabId, ...details }),
                create: async details => {
                    openedTabs.push(details);
                    return { id: openedTabs.length, windowId: 1, ...details };
                }
            },
            windows: { update: async (windowId, details) => ({ id: windowId, ...details }) }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/retry.js');
    context.RetryService.wait = async () => {};
    loadScript(context, 'common/utils/message.js');
    loadScript(context, 'thunderbird-ai/components/shared/SingleMailWorkspaceService.js');
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardAIService.js');
    return { context, openedTabs, sentMessages, service: context.DashboardAIService, storageState };
}

function loadAnalysisController(options = {}) {
    const loaded = loadDashboardAIService(options);
    const diagnosticActions = [];
    loaded.context.RuntimeDiagnosticService = {
        run: async (_context, action, operation) => {
            diagnosticActions.push(action);
            return operation();
        }
    };
    loadScript(
        loaded.context,
        'thunderbird-ai/components/global-dashboard/DashboardAnalysisController.js'
    );
    return {
        ...loaded,
        Controller: loaded.context.DashboardAnalysisController,
        diagnosticActions
    };
}

function loadDashboardManager(
    services,
    logger = { error() {}, log() {}, warn() {} },
    overrides = {}
) {
    const globalMailService = typeof services === 'function'
        ? { markAsRead: services }
        : services;
    const context = createContext({
        console: logger,
        GlobalMailService: globalMailService,
        DashboardViewPreferences: { saveSelection: async () => {} },
        DashboardLaunchService: { openExpanded: async () => {} },
        RuntimeDiagnosticService: {
            run: async (_context, _action, operation) => operation(),
            record: async () => {}
        },
        browser: {
            runtime: { getURL: value => `moz-extension://test/${value}` },
            tabs: { create: async () => {} }
        },
        I18n: {
            t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}`
        },
        ...overrides
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalDashboardManager.js');
    return context.GlobalDashboardManager;
}

function loadDashboardSummaryComponent(document = {}) {
    const context = createContext({
        document,
        I18n: {
            getLanguage: () => 'en',
            t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}`
        }
    });
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardSummaryComponent.js'
    );
    return context.DashboardSummaryComponent;
}

function loadDeleteComponent(services = {}) {
    const elements = {
        dashboardConfirmationDialog: {
            returnValue: '',
            showModalCalled: false,
            showModal() { this.showModalCalled = true; },
            addEventListener(_event, listener) { this.closeListener = listener; }
        },
        dashboardConfirmationMessage: { textContent: '' },
        dashboardResultDialog: {
            dataset: {},
            open: false,
            showModalCalled: false,
            showModal() { this.showModalCalled = true; },
            addEventListener(_event, listener) { this.closeListener = listener; }
        },
        dashboardResultSymbol: { textContent: '' },
        dashboardResultTitle: { textContent: '' },
        dashboardResultMessage: { textContent: '' },
        dashboardResultDiagnosticSection: { hidden: false },
        dashboardResultDiagnostic: { textContent: '' }
    };
    const context = createContext({
        document: { getElementById: id => elements[id] },
        GlobalMailService: services,
        I18n: { t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}` }
    });
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardDeleteComponent.js'
    );
    return { Component: context.DashboardDeleteComponent, elements };
}

test('concurrent dashboard refresh requests share one mailbox scan', async () => {
    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    let refreshCount = 0;
    let finishRefresh;
    manager.refreshPromise = null;
    manager.performRefresh = () => {
        refreshCount += 1;
        return new Promise(resolve => {
            finishRefresh = resolve;
        });
    };

    const first = manager.refresh();
    const second = manager.refresh();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(refreshCount, 1);
    finishRefresh('loaded');

    assert.equal(await first, 'loaded');
    assert.equal(await second, 'loaded');
    assert.equal(manager.refreshPromise, null);
});

test('failed startup scan clears the dashboard loading state and keeps refresh recoverable', async () => {
    const DashboardManager = loadDashboardManager(
        {
            STARTUP_MAX_ATTEMPTS: 3,
            API_TIMEOUT_MS: 5,
            listByAccount: async () => {
                const error = new Error('Mailbox API unavailable');
                error.code = 'MAILBOXES_NOT_READY';
                throw error;
            }
        },
        undefined,
        {
            DashboardAIService: { loadResults: async () => ({}) },
            RetryService: { withTimeout: operation => operation() }
        }
    );
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    let replacedChildren = 0;
    manager.sourceAccounts = [{ accountId: 'stale' }];
    manager.accounts = [{ accountId: 'stale' }];
    manager.availableSenders = ['stale'];
    manager.selectedMessageIds = new Set([7]);
    manager.elements = {
        accounts: { replaceChildren: () => { replacedChildren += 1; } }
    };
    manager.setBusy = busy => busyStates.push(busy);
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);
    manager.persistSelection = async () => {};
    manager.renderSenderOptions = () => {};

    await manager.performRefresh();

    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, [['dashboardLoadFailed:{}', 'error']]);
    assert.equal(replacedChildren, 1);
    assert.equal(manager.sourceAccounts.length, 0);
    assert.equal(manager.accounts.length, 0);
    assert.equal(manager.selectedMessageIds.size, 0);
});

test('a recent installer run gives actionable recovery advice when no unread mail appears', () => {
    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    const statuses = [];
    manager.recentInstallEvent = true;
    manager.sourceAccounts = [{ accountId: 'personal' }];
    manager.accounts = [{ sourceCount: 0, matchingCount: 0, messages: [] }];
    manager.summaryComponent = {
        viewCounts: () => ({ shown: 0, total: 0 })
    };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);

    manager.showLoadedStatus();

    assert.deepEqual(statuses, [['dashboardNoUnreadAfterInstall:{}', 'warning']]);
});

test('dashboard forwards visible and complete unread counts from one shared contract', () => {
    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    const account = {
        sourceCount: 15,
        matchingCount: 4,
        messages: Array.from({ length: 4 }, (_value, index) => ({ id: index + 1 }))
    };
    let loadedStatus = null;
    manager.recentInstallEvent = false;
    manager.sourceAccounts = Array.from({ length: 9 }, (_value, index) => ({ accountId: index }));
    manager.accounts = [account];
    manager.summaryComponent = {
        viewCounts: accounts => ({
            shown: accounts[0].messages.length,
            total: accounts[0].sourceCount
        }),
        showLoadedStatus: status => { loadedStatus = status; }
    };

    manager.showLoadedStatus();

    assert.deepEqual({ ...loadedStatus }, { accounts: 9, shown: 4, total: 15 });
});

test('loaded status counts visible rows against the complete unread source snapshot', () => {
    const appended = [];
    const SummaryComponent = loadDashboardSummaryComponent({
        createElement: tagName => ({ tagName: tagName.toUpperCase(), className: '', textContent: '' })
    });
    const state = { viewMode: 'combined', sortOrder: 'importance-desc', includeRead: false };
    const elements = {
        status: {
            textContent: '',
            dataset: {},
            append: (...values) => appended.push(...values)
        }
    };
    const summary = new SummaryComponent({
        elements,
        getState: () => state,
        setStatus: message => { elements.status.textContent = message; }
    });

    const account = {
        sourceCount: 15,
        matchingCount: 4,
        messages: Array.from({ length: 4 }, (_value, index) => ({ id: index + 1 }))
    };

    assert.deepEqual({ ...summary.viewCounts([account]) }, { shown: 4, total: 15 });
    assert.equal(
        summary.shownCount(account),
        'dashboardShownCount:{"shown":4,"total":15}'
    );

    summary.showLoadedStatus({ accounts: 9, shown: 4, total: 15 });

    assert.equal(
        elements.status.textContent,
        'dashboardLoaded:{"accounts":9,"shown":4,"total":15}'
    );
    assert.deepEqual(appended.slice(0, 2), [
        ' · ',
        'dashboardViewSummaryCombined:{} · dashboardSortingSummary:{} '
    ]);
    assert.equal(appended[2].tagName, 'EM');
    assert.equal(appended[2].className, 'dashboard-sort-summary-value');
    assert.equal(appended[2].textContent, 'dashboardSortImportanceDescending:{}');

    state.includeRead = true;
    summary.showLoadedStatus({ accounts: 9, shown: 4, total: 15 });
    assert.equal(
        elements.status.textContent,
        'dashboardLoadedAll:{"accounts":9,"shown":4,"total":15}'
    );
});

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

    const results = await service.listByAccount();

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

test('dashboard includes read Inbox messages only after explicit opt-in', async () => {
    const personalInbox = inbox('inbox-all');
    const accounts = [
        account('personal', 'Personal', 'imap', {
            id: 'root-personal',
            subFolders: [personalInbox]
        })
    ];
    const queries = [];
    const { service } = loadService({
        accounts,
        query: async options => {
            queries.push({ ...options });
            return { id: null, messages: [
                { ...message(1, 1), read: false },
                { ...message(2, 2), read: true }
            ] };
        }
    });

    const results = await service.listByAccount({ includeRead: true });

    assert.deepEqual(queries, [{ folderId: 'inbox-all', messagesPerPage: 100 }]);
    assert.deepEqual(Array.from(results[0].messages, item => item.id), [1, 2]);
});

test('mailbox scans bound concurrent account queries without changing account order', async () => {
    const accounts = Array.from({ length: 7 }, (_value, index) => account(
        `account-${index}`,
        `Account ${index}`,
        'imap',
        { id: `root-${index}`, subFolders: [inbox(`inbox-${index}`)] }
    ));
    let activeQueries = 0;
    let maximumActiveQueries = 0;
    const { service } = loadService({
        accounts,
        query: async ({ folderId }) => {
            activeQueries += 1;
            maximumActiveQueries = Math.max(maximumActiveQueries, activeQueries);
            await new Promise(resolve => setImmediate(resolve));
            activeQueries -= 1;
            return { id: null, messages: [{ id: folderId }] };
        }
    });

    const results = await service.listByAccount();

    assert.equal(maximumActiveQueries, service.ACCOUNT_QUERY_CONCURRENCY);
    assert.deepEqual(
        Array.from(results, result => result.accountId),
        accounts.map(item => item.id)
    );
});

test('dashboard startup retries a timed-out account API and then loads unread mail', async () => {
    const accounts = [
        account('personal', 'Personal', 'imap', {
            id: 'root-personal',
            subFolders: [inbox('personal-inbox')]
        })
    ];
    let accountListCalls = 0;
    const retries = [];
    const { service } = loadService({
        accounts,
        listAccounts: async () => {
            accountListCalls += 1;
            if (accountListCalls === 1) {
                return new Promise(() => {});
            }
            return accounts;
        },
        query: async () => ({ id: null, messages: [message(7, 7)] })
    });
    service.API_TIMEOUT_MS = 5;
    service.STARTUP_RETRY_DELAY_MS = 0;

    const results = await service.listByAccount({
        maxAttempts: 2,
        onRetry: (error, attempt) => retries.push([error.code, attempt])
    });

    assert.equal(accountListCalls, 2);
    assert.deepEqual(retries, [['MAIL_ACCOUNTS_UNAVAILABLE', 1]]);
    assert.equal(results[0].messages[0].id, 7);
});

test('dashboard startup stops retrying when every unread query remains unresponsive', async () => {
    const accounts = [
        account('personal', 'Personal', 'imap', {
            id: 'root-personal',
            subFolders: [inbox('personal-inbox')]
        })
    ];
    let queryCalls = 0;
    const { service } = loadService({
        accounts,
        query: async () => {
            queryCalls += 1;
            return new Promise(() => {});
        }
    });
    service.API_TIMEOUT_MS = 5;
    service.STARTUP_RETRY_DELAY_MS = 0;

    await assert.rejects(
        service.listByAccount({ maxAttempts: 2 }),
        error => error.code === 'MAILBOXES_NOT_READY'
    );

    assert.equal(queryCalls, 2);
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

test('dashboard layout persists locally while narrowing filters remain session-only', async () => {
    const { context, preferences, storage, sessionStorage } = loadViewPreferences({
        local: {
            dashboardViewMode: 'combined',
            dashboardDisplayOptionsExpanded: false,
            dashboardContextMenuStyle: 'submenus',
            dashboardRiskMinimum: 99,
            dashboardSenderFilter: ['legacy@example.test'],
            dashboardIncludeRead: true
        },
        session: {
            dashboardDateFrom: '2026-08-01',
            dashboardSenderFilter: ['session@example.test'],
            dashboardRiskMinimum: 63,
            dashboardIncludeRead: true
        }
    });

    const loaded = await preferences.load();
    assert.equal(loaded.viewMode, 'combined');
    assert.equal(loaded.displayOptionsExpanded, false);
    assert.equal(loaded.dateFrom, '2026-08-01');
    assert.equal(loaded.includeRead, true);
    assert.deepEqual([...loaded.selectedSenderKeys], ['session@example.test']);
    assert.equal(loaded.riskMinimum, 63);
    assert.equal(loaded.contextMenuStyle, 'submenus');
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_RISK_MINIMUM], undefined);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_SENDER_FILTER], undefined);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_INCLUDE_READ], undefined);
    loaded.viewMode = 'account';
    loaded.displayOptionsExpanded = true;
    loaded.riskMinimum = 71;
    loaded.contextMenuStyle = 'headings';
    await preferences.save(loaded);

    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_VIEW_MODE], 'account');
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_DISPLAY_OPTIONS_EXPANDED], true);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_CONTEXT_MENU_STYLE], 'headings');
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_RISK_MINIMUM], undefined);
    assert.equal(sessionStorage[context.CONFIG.STORAGE_KEYS.DASHBOARD_RISK_MINIMUM], 71);
    assert.equal(sessionStorage[context.CONFIG.STORAGE_KEYS.DASHBOARD_INCLUDE_READ], true);
    assert.equal(context.GlobalMailViewService.normalizeViewMode('invalid'), 'account');
    assert.equal(preferences.normalizeContextMenuStyle('invalid'), 'headings');

    const restarted = loadViewPreferences({ local: storage });
    const afterRestart = await restarted.preferences.load();
    assert.equal(afterRestart.viewMode, 'account');
    assert.equal(afterRestart.displayOptionsExpanded, true);
    assert.equal(afterRestart.dateFrom, '');
    assert.equal(afterRestart.includeRead, false);
    assert.equal(afterRestart.selectedSenderKeys, null);
    assert.equal(afterRestart.riskMinimum, 0);
});

test('message actions swap first-time analysis for correction and context-only re-analysis', () => {
    const MessageComponent = loadMessageComponent();
    const calls = [];
    const component = new MessageComponent({
        formatDate: value => value,
        onSelectionChanged() {},
        onSummarize: () => calls.push('summarize'),
        onReply: () => calls.push('reply'),
        onChat: () => calls.push('chat'),
        onAnalyze: () => calls.push('analyze'),
        onReanalyze: () => calls.push('reanalyze'),
        onCorrectScores: () => calls.push('correct'),
        onShowPreview: () => calls.push('preview'),
        onExpandPreview: () => calls.push('expand-preview'),
        onResetPreview: () => calls.push('reset-preview'),
        onHidePreview: () => calls.push('hide-preview'),
        onOpenInTab: () => calls.push('open'),
        onMarkRead: () => calls.push('read'),
        onMarkUnread: () => calls.push('unread'),
        onExportPdf: () => calls.push('pdf'),
        onArchive: () => calls.push('archive'),
        onTrash: () => calls.push('trash'),
        onContextMenu() {}
    });
    const mail = message(42, 20);

    const groups = component.actionGroups(mail, mail.subject, {
        busy: false,
        previewVisible: false
    });
    const hiddenGroups = component.actionGroups(mail, mail.subject, {
        busy: false,
        previewVisible: true
    });
    mail.aiAnalysis = { importanceScore: 80, spamScore: 5, riskScore: 12 };
    const analyzedGroups = component.actionGroups(mail, mail.subject, {
        busy: false,
        previewVisible: false
    });

    assert.deepEqual(Array.from(groups, group => group.titleKey), [
        'dashboardAIActionsGroup',
        'dashboardReadActionsGroup',
        'dashboardMailActionsGroup'
    ]);
    assert.deepEqual(Array.from(groups[1].actions, action => action.textKey), [
        'dashboardShowPreviewOne',
        'dashboardOpenInTabOne',
        'dashboardMarkReadOne'
    ]);
    assert.deepEqual(Array.from(groups[0].actions, action => action.textKey), [
        'dashboardSummarizeOne',
        'dashboardReplyOne',
        'dashboardChatOne',
        'dashboardAnalyzeOne'
    ]);
    assert.deepEqual(Array.from(analyzedGroups[0].actions, action => action.textKey), [
        'dashboardSummarizeOne',
        'dashboardReplyOne',
        'dashboardChatOne',
        'dashboardCorrectScores',
        'dashboardReanalyzeOne'
    ]);
    assert.equal(analyzedGroups[0].actions[4].contextOnly, true);
    assert.equal(groups[1].actions[0].hidden, false);
    assert.equal(hiddenGroups[1].actions[0].hidden, true);
    mail.read = true;
    const readGroups = component.actionGroups(mail, mail.subject, {
        busy: false,
        previewVisible: false
    });
    assert.equal(readGroups[1].actions[2].textKey, 'dashboardMarkUnreadOne');
    assert.equal(readGroups[1].actions[2].className, 'mark-unread');
    groups[0].actions[3].execute();
    analyzedGroups[0].actions[3].execute();
    analyzedGroups[0].actions[4].execute();
    groups[1].actions[0].execute();
    groups[1].actions[1].execute();
    groups[1].actions[2].execute();
    readGroups[1].actions[2].execute();
    assert.deepEqual(calls, ['analyze', 'correct', 'reanalyze', 'preview', 'open', 'read', 'unread']);
});

test('message context menu defaults to direct headings and removes hidden actions', () => {
    const ContextMenuComponent = loadMessageContextMenuComponent();
    const component = new ContextMenuComponent({
        onStyleChanged: async () => {},
        onError() {}
    });
    const groups = [{
        titleKey: 'read',
        actions: [
            { textKey: 'preview', hidden: true },
            { textKey: 'open', hidden: false },
            { textKey: 'reanalyze', contextOnly: true }
        ]
    }];

    assert.equal(ContextMenuComponent.normalizeStyle('unknown'), 'headings');
    assert.equal(ContextMenuComponent.normalizeStyle('submenus'), 'submenus');
    assert.deepEqual(
        Array.from(component.visibleGroups(groups)[0].actions, action => action.textKey),
        ['open', 'reanalyze']
    );
});

test('dashboard selection survives popup closure and is stored without message content', async () => {
    const { context, preferences, sessionStorage } = loadViewPreferences({
        session: { dashboardSelectedMessages: [7, '8', null, { id: 9 }] }
    });

    const loaded = await preferences.load();
    assert.deepEqual(Array.from(loaded.selectedMessageIds), [7, '8']);
    await preferences.saveSelection(new Set([11, 12]));

    assert.deepEqual(
        Array.from(sessionStorage[context.CONFIG.STORAGE_KEYS.DASHBOARD_SELECTED_MESSAGES]),
        [11, 12]
    );
});

test('expanded dashboard opens in a stable Thunderbird tab after persisting selection', async () => {
    const saved = [];
    const opened = [];
    const DashboardManager = loadDashboardManager({}, undefined, {
        DashboardViewPreferences: {
            saveSelection: async selection => saved.push([...selection])
        },
        DashboardLaunchService: {
            openExpanded: async source => opened.push(source)
        }
    });
    const manager = Object.create(DashboardManager.prototype);
    manager.selectedMessageIds = new Set([7, 8]);

    await manager.openExpandedView();

    assert.deepEqual(saved, [[7, 8]]);
    assert.deepEqual(opened, ['manual']);
});

test('dashboard view panel defaults open and persists only explicit toggle changes', async () => {
    const { preferences } = loadViewPreferences();
    assert.equal((await preferences.load()).displayOptionsExpanded, true);

    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    manager.elements = { displayOptions: { open: false } };
    manager.displayOptionsExpanded = true;
    let saveCount = 0;
    manager.savePreferences = async () => { saveCount += 1; };

    await manager.handleDisplayOptionsToggle();
    await manager.handleDisplayOptionsToggle();

    assert.equal(manager.displayOptionsExpanded, false);
    assert.equal(saveCount, 1);
});

test('dashboard counts active filter groups and resets every narrowing control together', async () => {
    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    manager.dateFrom = '2026-08-01';
    manager.dateTo = '2026-08-26';
    manager.includeRead = true;
    manager.selectedSenderKeys = new Set(['ada@example.test']);
    manager.aiStatusFilter = 'analyzed';
    manager.importanceMinimum = 20;
    manager.spamMinimum = 0;
    manager.riskMinimum = 50;
    manager.elements = { senderFilterDetails: { open: true } };
    let clearedSearch = false;
    let clearedValidity = false;
    let controlsApplied = false;
    let senderOptionsRendered = false;
    let preferencesSaved = false;
    let mailboxRefreshed = false;
    manager.senderFilterComponent = {
        clearSearch() { clearedSearch = true; }
    };
    manager.clearDateValidity = () => { clearedValidity = true; };
    manager.applyPreferenceControls = () => { controlsApplied = true; };
    manager.renderSenderOptions = () => { senderOptionsRendered = true; };
    manager.savePreferences = async () => { preferencesSaved = true; };
    manager.refresh = async () => { mailboxRefreshed = true; };

    await manager.resetFilters();

    assert.equal(manager.dateFrom, '');
    assert.equal(manager.dateTo, '');
    assert.equal(manager.includeRead, false);
    assert.equal(manager.selectedSenderKeys, null);
    assert.equal(manager.aiStatusFilter, 'all');
    assert.equal(manager.importanceMinimum, 0);
    assert.equal(manager.spamMinimum, 0);
    assert.equal(manager.riskMinimum, 0);
    assert.equal(manager.elements.senderFilterDetails.open, false);
    assert.equal(clearedSearch, true);
    assert.equal(clearedValidity, true);
    assert.equal(controlsApplied, true);
    assert.equal(senderOptionsRendered, true);
    assert.equal(preferencesSaved, true);
    assert.equal(mailboxRefreshed, true);
});

test('include-read control persists and refreshes the Thunderbird mailbox scope', async () => {
    const DashboardManager = loadDashboardManager({});
    const manager = Object.create(DashboardManager.prototype);
    manager.includeRead = false;
    manager.elements = { includeRead: { checked: true } };
    let controlsApplied = 0;
    let preferencesSaved = 0;
    let mailboxRefreshed = 0;
    manager.applyPreferenceControls = () => { controlsApplied += 1; };
    manager.savePreferences = async () => { preferencesSaved += 1; };
    manager.refresh = async () => { mailboxRefreshed += 1; };

    await manager.handleIncludeReadChange();
    await manager.handleIncludeReadChange();

    assert.equal(manager.includeRead, true);
    assert.equal(controlsApplied, 1);
    assert.equal(preferencesSaved, 1);
    assert.equal(mailboxRefreshed, 1);
});

test('dashboard filter indicator is visible only while narrowing filters are active', () => {
    const SummaryComponent = loadDashboardSummaryComponent();
    const state = {
        includeRead: true,
        dateFrom: '',
        dateTo: '',
        selectedSenderKeys: new Set(['ada@example.test']),
        aiStatusFilter: 'all',
        importanceMinimum: 0,
        spamMinimum: 52,
        riskMinimum: 0
    };
    const elements = {
        activeFilters: { textContent: '' },
        activeFilterSummary: { textContent: '' },
        filterStatus: { dataset: {}, hidden: true },
        resetFilters: { disabled: true }
    };
    const summary = new SummaryComponent({
        elements,
        getState: () => state,
        setStatus() {}
    });

    summary.updateFilterStatus(false);
    assert.equal(elements.activeFilters.textContent, 'dashboardActiveFilters:{"count":3}');
    assert.equal(
        elements.activeFilterSummary.textContent,
        'dashboardFilterSummaryIncludeRead:{} · dashboardFilterSummarySenders:{"count":1} · dashboardFilterSummarySpam:{"value":52}'
    );
    assert.equal(elements.filterStatus.dataset.active, 'true');
    assert.equal(elements.filterStatus.hidden, false);
    assert.equal(elements.resetFilters.disabled, false);

    state.selectedSenderKeys = null;
    state.spamMinimum = 0;
    state.includeRead = false;
    summary.updateFilterStatus(false);
    assert.equal(elements.activeFilters.textContent, 'dashboardActiveFilters:{"count":0}');
    assert.equal(elements.activeFilterSummary.textContent, '');
    assert.equal(elements.filterStatus.dataset.active, 'false');
    assert.equal(elements.filterStatus.hidden, true);
    assert.equal(elements.resetFilters.disabled, true);
});

test('dashboard filter summary reports only active values with localized dates and AI state', () => {
    const SummaryComponent = loadDashboardSummaryComponent();
    const state = {
        includeRead: true,
        dateFrom: '2026-08-01',
        dateTo: '2026-08-26',
        selectedSenderKeys: new Set(['ada@example.test', 'grace@example.test']),
        aiStatusFilter: 'analyzed',
        importanceMinimum: 20,
        spamMinimum: 0,
        riskMinimum: 75
    };
    const summary = new SummaryComponent({
        elements: {},
        getState: () => state,
        setStatus() {}
    });
    summary.filterDateFormatter = {
        format: date => `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
    };

    assert.deepEqual([...summary.activeFilterSummaries()], [
        'dashboardFilterSummaryIncludeRead:{}',
        'dashboardFilterSummaryDateRange:{"from":"1.8.2026","to":"26.8.2026"}',
        'dashboardFilterSummarySenders:{"count":2}',
        'dashboardFilterSummaryAIStatus:{"status":"dashboardAIStatusAnalyzed:{}"}',
        'dashboardFilterSummaryImportance:{"value":20}',
        'dashboardFilterSummaryRisk:{"value":75}'
    ]);
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
    await service.openWorkspace(42, 'chat');

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
    assert.match(openedTabs[2].url, /single-mail-ui\.html\?messageId=42&chat=1/u);
});

test('one message uses bulk scoring once and exposes only explicit confirmed re-analysis', async () => {
    const { Controller, diagnosticActions, sentMessages } = loadAnalysisController({
        bulkData: {
            results: [{
                messageId: 42,
                importanceScore: 83,
                spamScore: 7,
                riskScore: 16
            }],
            failedCount: 0,
            model: 'gpt-5.6-luna'
        }
    });
    const mail = {
        id: 42,
        headerMessageId: 'single-score@example.test',
        subject: 'Score only this message'
    };
    const accounts = [{ accountId: 'personal', messages: [mail] }];
    const busyStates = [];
    const statuses = [];
    const confirmations = [];
    let results = {};
    let rebuildCount = 0;
    let approveRescore = false;
    const controller = new Controller({
        getAccounts: () => accounts,
        getResults: () => results,
        setResults: value => { results = value; },
        getSelectedMessageIds: () => new Set(),
        rebuild: async () => { rebuildCount += 1; },
        setBusy: (busy, messageText) => busyStates.push([busy, messageText]),
        setStatus: (messageText, type) => statuses.push([messageText, type]),
        confirm: messageText => {
            confirmations.push(messageText);
            return approveRescore;
        }
    });

    await controller.analyzeMessage(mail);
    await controller.analyzeMessage(mail);
    await controller.rescoreMessage(mail);
    approveRescore = true;
    await controller.rescoreMessage(mail);

    assert.equal(mail.aiAnalysis.importanceScore, 83);
    assert.equal(mail.aiAnalysis.spamScore, 7);
    assert.equal(mail.aiAnalysis.riskScore, 16);
    assert.equal(sentMessages.length, 2);
    assert.deepEqual(Array.from(sentMessages[0].messageIds), [42]);
    assert.deepEqual(Array.from(sentMessages[1].messageIds), [42]);
    assert.deepEqual(diagnosticActions, ['score-message', 'rescore-message']);
    assert.equal(rebuildCount, 2);
    assert.equal(confirmations.length, 2);
    assert.match(confirmations[0], /Score only this message/u);
    assert.deepEqual(Array.from(busyStates, state => state[0]), [true, false, true, false]);
    assert.ok(statuses.some(([text]) => /already has AI scores/u.test(text)));
    assert.ok(statuses.some(([text, type]) => /was analyzed with/u.test(text) && type === 'success'));
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

test('sender filter renders an explicit selection without aborting dashboard startup', () => {
    const SenderFilter = loadSenderFilterComponent();
    const summary = { textContent: '' };
    const component = new SenderFilter({
        details: null,
        summary,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    let optionsRendered = false;
    component.renderOptions = () => {
        optionsRendered = true;
    };

    component.render(
        [
            { key: 'ada@example.test', label: 'Ada <ada@example.test>' },
            { key: 'bob@example.test', label: 'Bob <bob@example.test>' }
        ],
        new Set(['ada@example.test'])
    );

    assert.equal(
        summary.textContent,
        'dashboardSenderSelectedSummary:{"selected":1,"count":2}'
    );
    assert.equal(optionsRendered, true);
});

test('sender select-all changes only filtered matches and preserves hidden selections', () => {
    const SenderFilter = loadSenderFilterComponent();
    const component = new SenderFilter({
        details: null,
        summary: null,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    component.availableSenders = [
        { key: 'ada@example.test', label: 'Ada <ada@example.test>' },
        { key: 'bob@example.test', label: 'Bob <bob@example.test>' },
        { key: 'shop@example.com', label: 'Shop <shop@example.com>' },
        { key: 'news@example.com', label: 'News <news@example.com>' }
    ];
    component.selectedSenderKeys = new Set(['ada@example.test']);
    component.searchQuery = 'example.com';

    const selectedMatches = component.selectionForFiltered(true);
    component.selectedSenderKeys = selectedMatches;
    const clearedMatches = component.selectionForFiltered(false);

    assert.deepEqual([...selectedMatches].sort(), [
        'ada@example.test',
        'news@example.com',
        'shop@example.com'
    ]);
    assert.deepEqual([...clearedMatches], ['ada@example.test']);
});

test('sender select-all collapses to the all-senders sentinel only when everything is selected', () => {
    const SenderFilter = loadSenderFilterComponent();
    const component = new SenderFilter({
        details: null,
        summary: null,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    component.availableSenders = [
        { key: 'ada@example.test', label: 'Ada <ada@example.test>' },
        { key: 'shop@example.com', label: 'Shop <shop@example.com>' }
    ];
    component.selectedSenderKeys = new Set(['ada@example.test']);
    component.searchQuery = 'example.com';

    assert.equal(component.selectionForFiltered(true), null);
});

test('sender select-all state follows the filtered subset and disables empty searches', () => {
    const SenderFilter = loadSenderFilterComponent();
    const component = new SenderFilter({
        details: null,
        summary: null,
        options: null,
        onSelectionChanged: async () => {},
        onError: () => {}
    });
    component.availableSenders = [
        { key: 'shop@example.com', label: 'Shop <shop@example.com>' },
        { key: 'news@example.com', label: 'News <news@example.com>' },
        { key: 'ada@example.test', label: 'Ada <ada@example.test>' }
    ];
    component.selectedSenderKeys = new Set(['shop@example.com']);
    component.searchQuery = 'example.com';
    const input = {};

    component.updateAllToggle(input);
    assert.equal(input.checked, false);
    assert.equal(input.indeterminate, true);
    assert.equal(input.disabled, false);

    component.searchQuery = 'no matching sender';
    component.updateAllToggle(input);
    assert.equal(input.checked, false);
    assert.equal(input.indeterminate, false);
    assert.equal(input.disabled, true);
});

test('sender filter uses a concise bilingual all label and aligns checkbox rows', () => {
    const english = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/config/locale-en.js'),
        'utf8'
    );
    const german = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/config/locale-de.js'),
        'utf8'
    );
    const styles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/global-dashboard.css'),
        'utf8'
    );

    assert.match(english, /dashboardAllSenders:\s*'All'/u);
    assert.match(german, /dashboardAllSenders:\s*'Alle'/u);
    assert.match(styles, /\.dashboard-sender-options label\s*\{[^}]*align-items:\s*center;/su);
    assert.match(
        styles,
        /\.dashboard-sender-options input\[type="checkbox"\]\s*\{[^}]*margin:\s*0;/su
    );
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

    const result = await service.listByAccount();

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

test('one dashboard preview loads only its targeted message', async () => {
    const calls = [];
    const { service } = loadService({
        getMessageContent: async id => {
            calls.push(id);
            return `Body ${id}`;
        }
    });
    const target = message(7, 7);

    const loaded = await service.loadPreview(target);

    assert.equal(loaded, true);
    assert.deepEqual(calls, [7]);
    assert.equal(target.preview, 'Body 7');
    assert.equal(target.previewFailed, false);
});

test('one preview grows by four lines, resets, closes, and reopens without another load', async () => {
    const calls = [];
    const PreviewController = loadPreviewController();
    const target = message(7, 7);
    const busyStates = [];
    const statuses = [];
    let baselineLines = 3;
    let globalEnabled = false;
    let renderCount = 0;
    const controller = new PreviewController({
        getBaselineLines: () => baselineLines,
        isGlobalEnabled: () => globalEnabled,
        loadPreview: async mail => {
            calls.push(mail.id);
            mail.preview = 'Local body';
            return true;
        },
        render: () => { renderCount += 1; },
        setBusy: busy => busyStates.push(busy),
        setStatus: (text, type) => statuses.push([text, type])
    });

    assert.deepEqual({ ...controller.optionsFor(target) }, {
        previewVisible: false,
        previewLineCount: 3,
        previewBaselineLineCount: 3,
        previewNextLineCount: 7,
        previewCanExpand: false,
        previewCanReset: false
    });
    await controller.show(target);
    await controller.show(target);
    controller.expand(target);
    controller.expand(target);

    assert.equal(controller.optionsFor(target).previewLineCount, 11);
    assert.equal(controller.optionsFor(target).previewCanReset, true);
    controller.reset(target);
    assert.equal(controller.optionsFor(target).previewLineCount, 3);
    assert.equal(controller.optionsFor(target).previewCanReset, false);

    for (let index = 0; index < 20; index += 1) {
        controller.expand(target);
    }
    assert.equal(controller.optionsFor(target).previewLineCount, 20);
    assert.equal(controller.optionsFor(target).previewCanExpand, false);
    controller.hide(target);
    assert.equal(controller.optionsFor(target).previewVisible, false);
    assert.equal(controller.optionsFor(target).previewLineCount, 3);

    await controller.show(target);
    assert.deepEqual(calls, [7]);
    controller.hide(target);
    globalEnabled = true;
    controller.setGlobalEnabled(true);
    assert.equal(controller.optionsFor(target).previewVisible, true);
    baselineLines = 5;
    assert.equal(controller.optionsFor(target).previewLineCount, 5);

    assert.ok(renderCount >= 8);
    assert.deepEqual(busyStates, [true, false, true, false]);
    assert.equal(statuses.length, 2);
    assert.deepEqual(statuses[0], ['dashboardPreviewOneLoaded:{}', 'success']);
});

test('dashboard opens a directly targeted message in a new active Thunderbird tab', async () => {
    const calls = [];
    const { service } = loadService({
        openMessage: async details => {
            calls.push({ ...details });
            return { id: 9 };
        }
    });

    const tab = await service.openInTab(42);

    assert.deepEqual(calls, [{ messageId: 42, location: 'tab', active: true }]);
    assert.equal(tab.id, 9);
});

test('dashboard deletion delegates unique IDs to the persistent background context', async () => {
    const calls = [];
    const { service } = loadService({
        sendRuntimeMessage: async message => {
            calls.push({ ...message, messageIds: [...message.messageIds] });
            return { success: true, data: {
                browserVersion: '140.0',
                messageCount: 2,
                requestMode: 'structured-user-action',
                state: 'completed'
            } };
        }
    });

    const diagnostics = await service.moveToTrash([7, 8, 7, null, undefined]);

    assert.deepEqual(calls, [{
        action: 'trashDashboardMessages',
        messageIds: [7, 8]
    }]);
    assert.deepEqual({ ...diagnostics }, {
        browserVersion: '140.0',
        messageCount: 2,
        requestMode: 'structured-user-action',
        state: 'completed'
    });
});

test('dashboard deletion exposes a persisted background diagnostic on failure', async () => {
    const { service } = loadService({
        sendRuntimeMessage: async () => ({
            success: false,
            error: 'delete failed',
            data: { code: 'DELETE_API_FAILED', state: 'failed' }
        })
    });

    await assert.rejects(
        service.moveToTrash([7]),
        error => error.message === 'delete failed'
            && error.diagnostics.code === 'DELETE_API_FAILED'
    );
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

test('mark as unread updates each unique message with the inverse read state', async () => {
    const calls = [];
    const { service } = loadService({
        updateMessage: async (messageId, properties) => {
            calls.push([messageId, { ...properties }]);
        }
    });

    const result = await service.markAsUnread([7, 7, 8, null]);

    assert.deepEqual(calls, [
        [7, { read: false }],
        [8, { read: false }]
    ]);
    assert.deepEqual(Array.from(result.updatedIds), [7, 8]);
    assert.deepEqual(Array.from(result.failedIds), []);
});

test('read dashboard message can be marked unread and retained by the refreshed scope', async () => {
    const calls = [];
    const DashboardManager = loadDashboardManager({
        markAsUnread: async messageIds => {
            calls.push([...messageIds]);
            return { updatedIds: [...messageIds], failedIds: [] };
        }
    });
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    let refreshCount = 0;
    manager.selectedMessageIds = new Set();
    manager.setBusy = busy => busyStates.push(busy);
    manager.refresh = async () => { refreshCount += 1; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);

    await manager.markOneAsUnread({ id: 7 });

    assert.deepEqual(calls, [[7]]);
    assert.equal(refreshCount, 1);
    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, [[
        'dashboardMarkUnreadOneSuccess:{"count":1}',
        'success'
    ]]);
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

test('confirmed deletion reports success only after the refreshed dashboard no longer contains it', async () => {
    const calls = [];
    const DashboardManager = loadDashboardManager({
        DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',
        saveDeleteDiagnostic: async () => {},
        moveToTrash: async messageIds => {
            calls.push([...messageIds]);
            return { browserVersion: '140.0', requestMode: 'structured-user-action' };
        }
    });
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    manager.accounts = [{ messages: [{ id: 7 }] }];
    manager.selectedMessageIds = new Set([7]);
    manager.setBusy = busy => busyStates.push(busy);
    manager.refresh = async () => { manager.accounts = [{ messages: [] }]; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);
    const results = [];
    manager.deleteComponent = {
        persist: async () => {},
        showResult: (...parameters) => results.push(parameters)
    };

    await manager.performTrash([7], 'delete-success');

    assert.deepEqual(calls, [[7]]);
    assert.equal(manager.selectedMessageIds.size, 0);
    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, []);
    assert.equal(results.length, 1);
    assert.equal(results[0][0], 'delete-success');
    assert.equal(results[0][1], 'success');
});

test('delete no-op keeps the selection and exposes a safe diagnostic code', async () => {
    const errors = [];
    const DashboardManager = loadDashboardManager({
        DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',
        saveDeleteDiagnostic: async () => {},
        moveToTrash: async () => ({
            browserVersion: '140.0',
            requestMode: 'structured-user-action'
        })
    }, {
        error: (...parameters) => errors.push(parameters),
        log() {},
        warn() {}
    });
    const manager = Object.create(DashboardManager.prototype);
    const statuses = [];
    manager.accounts = [{ messages: [{ id: 7 }] }];
    manager.selectedMessageIds = new Set([7]);
    manager.setBusy = () => {};
    let refreshCount = 0;
    manager.refresh = async () => { refreshCount += 1; };
    manager.waitForTrashVerification = async () => {};
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);
    const results = [];
    manager.deleteComponent = {
        persist: async () => {},
        showResult: (...parameters) => results.push(parameters)
    };

    await manager.performTrash([7], 'delete-success');

    assert.deepEqual([...manager.selectedMessageIds], [7]);
    assert.deepEqual(statuses, []);
    assert.equal(errors.length, 1);
    assert.equal(refreshCount, 3);
    assert.equal(errors[0][1].diagnosticCode, 'DELETE_NOT_APPLIED');
    assert.deepEqual(Array.from(errors[0][1].remainingMessageIds), [7]);
    assert.equal(results.length, 1);
    assert.equal(results[0][1], 'error');
});

test('delete confirmation remains inside the dashboard popup', async () => {
    const { Component, elements } = loadDeleteComponent();
    const component = new Component({
        formatDate: value => value,
        remainingMessageIds: () => [],
        setStatus() {}
    });
    const dialog = elements.dashboardConfirmationDialog;

    const confirmed = component.confirm('Delete this message?');
    assert.equal(dialog.showModalCalled, true);
    assert.equal(elements.dashboardConfirmationMessage.textContent, 'Delete this message?');
    dialog.returnValue = 'confirm';
    dialog.closeListener();

    assert.equal(await confirmed, true);
});

test('reopening the dashboard reconciles a completed background deletion', async () => {
    const saved = [];
    const { Component, elements } = loadDeleteComponent({
        DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',
        loadDeleteDiagnostic: async () => ({
            code: 'DELETE_API_COMPLETED',
            state: 'completed',
            messageCount: 1,
            messageIds: [7]
        }),
        saveDeleteDiagnostic: async diagnostics => saved.push(diagnostics)
    });
    const statuses = [];
    const component = new Component({
        formatDate: value => value,
        remainingMessageIds: () => [],
        setStatus: (messageText, type) => statuses.push([messageText, type])
    });

    await component.initialize();

    assert.equal(saved[0].state, 'verified');
    assert.equal(saved[0].code, 'DELETE_VERIFIED');
    assert.deepEqual(statuses, []);
    assert.equal(elements.dashboardResultDialog.showModalCalled, true);
    assert.equal(elements.dashboardResultDialog.dataset.type, 'success');
    assert.equal(
        elements.dashboardResultMessage.textContent,
        'dashboardTrashRestoredSuccess:{"count":1}'
    );

    elements.dashboardResultDialog.closeListener();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(saved.at(-1).resultAcknowledged, true);
});

test('archive success uses the prominent result dialog without a delete diagnostic', async () => {
    const { Component, elements } = loadDeleteComponent({});
    const component = new Component({
        formatDate: value => value,
        remainingMessageIds: () => [],
        setStatus() {}
    });

    component.showArchiveSuccess('Archived messages: 2.');

    assert.equal(elements.dashboardResultDialog.showModalCalled, true);
    assert.equal(elements.dashboardResultDialog.dataset.type, 'success');
    assert.equal(elements.dashboardResultSymbol.textContent, '📦');
    assert.equal(
        elements.dashboardResultTitle.textContent,
        'dashboardArchiveResultSuccessTitle:{}'
    );
    assert.equal(elements.dashboardResultMessage.textContent, 'Archived messages: 2.');
    assert.equal(elements.dashboardResultDiagnosticSection.hidden, true);
    assert.equal(elements.dashboardResultDiagnostic.textContent, '');
});

test('selected archive refreshes the unread view and reports success in a modal', async () => {
    const calls = [];
    const DashboardManager = loadDashboardManager({
        archiveMessages: async messageIds => calls.push([...messageIds])
    });
    const manager = Object.create(DashboardManager.prototype);
    const busyStates = [];
    const statuses = [];
    const archiveResults = [];
    let refreshCount = 0;
    manager.selectedMessageIds = new Set([7, 8]);
    manager.setBusy = busy => busyStates.push(busy);
    manager.refresh = async () => { refreshCount += 1; };
    manager.setStatus = (messageText, type) => statuses.push([messageText, type]);
    manager.deleteComponent = {
        showArchiveSuccess: messageText => archiveResults.push(messageText)
    };

    await manager.archiveSelected();

    assert.deepEqual(calls, [[7, 8]]);
    assert.equal(refreshCount, 1);
    assert.equal(manager.selectedMessageIds.size, 0);
    assert.deepEqual(busyStates, [true, false]);
    assert.deepEqual(statuses, [['', 'info']]);
    assert.deepEqual(archiveResults, ['dashboardArchiveSelectedSuccess:{"count":2}']);
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

    const results = await service.listByAccount({ maxAttempts: 10 });

    assert.equal(results[0].failed, true);
    assert.equal(results[0].messages.length, 0);
    assert.equal(results[1].failed, false);
    assert.equal(results[1].messages[0].id, 30);
});

test('manifest routes both toolbar actions through the wake-safe background service', () => {
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
    const contextMenuStyles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/dashboard-context-menu.css'),
        'utf8'
    );
    const dashboardEntry = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/js/global-dashboard.js'),
        'utf8'
    );
    const dashboardManager = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/global-dashboard/GlobalDashboardManager.js'
        ),
        'utf8'
    );
    const messageComponent = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/global-dashboard/DashboardMessageComponent.js'),
        'utf8'
    );
    const messageContextMenuComponent = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/global-dashboard/DashboardMessageContextMenuComponent.js'
        ),
        'utf8'
    );
    const previewController = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/global-dashboard/DashboardPreviewController.js'
        ),
        'utf8'
    );
    const analysisController = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/global-dashboard/DashboardAnalysisController.js'
        ),
        'utf8'
    );
    const bulkActionsComponent = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/global-dashboard/DashboardBulkActionsComponent.js'
        ),
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
    const pdfIntegration = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/shared/PdfArchiverIntegrationService.js'),
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

    assert.equal(manifest.action.default_popup, undefined);
    assert.equal(manifest.message_display_action.default_popup, undefined);
    assert.ok(manifest.permissions.includes('messagesDelete'));
    assert.ok(manifest.permissions.includes('messagesUpdate'));
    assert.ok(manifest.permissions.includes('messagesMove'));
    assert.ok(manifest.background.scripts.indexOf('dashboard-training.js')
        > manifest.background.scripts.indexOf('message.js'));
    assert.ok(manifest.background.scripts.indexOf('dashboard-training.js')
        < manifest.background.scripts.indexOf('openai.js'));
    assert.ok(manifest.background.scripts.indexOf('dashboard-mailbox.js')
        < manifest.background.scripts.indexOf('background.js'));
    assert.ok(manifest.background.scripts.indexOf('DashboardLaunchService.js')
        < manifest.background.scripts.indexOf('storage.js'));
    assert.ok(manifest.background.scripts.indexOf('LaunchModeService.js')
        < manifest.background.scripts.indexOf('DashboardLaunchService.js'));
    assert.ok(manifest.background.scripts.indexOf('SingleMailWorkspaceService.js')
        < manifest.background.scripts.indexOf('background.js'));
    assert.ok(dashboard.indexOf('DashboardDeleteComponent.js')
        < dashboard.indexOf('GlobalDashboardManager.js'));
    assert.equal((dashboard.match(/data-dashboard-bulk-actions-host=/gu) || []).length, 2);
    assert.match(bulkActionsComponent, /dashboard-bulk-action-groups/u);
    assert.match(bulkActionsComponent, /className = 'dashboard-action-icon'/u);
    assert.match(dashboard, /id="dashboardShowPreview"/u);
    assert.match(dashboard, /<details id="dashboardDisplayOptions"[^>]*open>/u);
    assert.match(dashboard, /class="dashboard-display-options-summary"/u);
    assert.match(dashboard, /data-i18n="dashboardLayoutGroup"/u);
    assert.match(dashboard, /data-i18n="dashboardFilterGroup"/u);
    assert.match(dashboard, /data-i18n="dashboardPreviewGroup"/u);
    assert.match(dashboard, /data-i18n="dashboardAIFilterGroup"/u);
    assert.match(dashboard, /id="dashboardPreviewLines"/u);
    assert.match(dashboard, /id="dashboardSortOrder"/u);
    assert.match(dashboard, /id="dashboardViewMode"/u);
    assert.match(dashboard, /id="dashboardMessageLimit"/u);
    assert.match(dashboard, /id="dashboardDateFrom"[^>]*type="date"|type="date"[^>]*id="dashboardDateFrom"/u);
    assert.match(dashboard, /id="dashboardDateTo"[^>]*type="date"|type="date"[^>]*id="dashboardDateTo"/u);
    assert.match(dashboard, /id="dashboardIncludeRead"[^>]*type="checkbox"|type="checkbox"[^>]*id="dashboardIncludeRead"/u);
    assert.match(dashboard, /id="dashboardSenderFilter"/u);
    assert.match(
        dashboard,
        /id="dashboardStatus"[\s\S]*?id="dashboardFilterStatus"[^>]*data-active="false"[^>]*hidden/u
    );
    assert.match(dashboard, /id="dashboardActiveFilters"[^>]*role="status"/u);
    assert.match(dashboard, /id="dashboardActiveFilterSummary"/u);
    assert.match(dashboard, /DashboardSummaryComponent\.js[\s\S]*GlobalDashboardManager\.js/u);
    assert.match(dashboard, /id="dashboardResetFilters"[\s\S]*?data-i18n="dashboardResetFilters"/u);
    assert.match(dashboardStyles, /\.dashboard-filter-status\[data-active="true"\]/u);
    assert.match(dashboardStyles, /\.dashboard-message\.is-read \.dashboard-message-subject/u);
    assert.match(dashboard, /id="dashboardAIStatusFilter"/u);
    assert.match(dashboard, /id="dashboardImportanceMinimum"/u);
    assert.match(dashboard, /id="dashboardSpamMinimum"/u);
    assert.match(dashboard, /id="dashboardRiskMinimum"/u);
    assert.match(dashboard, /DashboardBulkActionsComponent\.js/u);
    assert.ok(dashboard.indexOf('DashboardBulkActionsComponent.js')
        < dashboard.indexOf('GlobalDashboardManager.js'));
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
    assert.match(dashboard, /DashboardAnalysisController\.js/u);
    assert.match(dashboard, /SingleMailWorkspaceService\.js/u);
    assert.match(dashboard, /DashboardMessageComponent\.js/u);
    assert.match(dashboard, /DashboardMessageContextMenuComponent\.js/u);
    assert.match(dashboard, /DashboardPreviewController\.js/u);
    assert.ok(dashboard.indexOf('DashboardMessageContextMenuComponent.js')
        < dashboard.indexOf('GlobalDashboardManager.js'));
    assert.ok(dashboard.indexOf('DashboardPreviewController.js')
        < dashboard.indexOf('GlobalDashboardManager.js'));
    assert.ok(dashboard.indexOf('DashboardAnalysisController.js')
        < dashboard.indexOf('GlobalDashboardManager.js'));
    assert.match(dashboard, /dashboard-context-menu\.css/u);
    assert.match(dashboard, /ScoreFeedbackEditor\.js/u);
    assert.match(dashboard, /DashboardFeedbackComponent\.js/u);
    assert.match(dashboard, /id="dashboardFeedbackDialog"/u);
    assert.match(dashboard, /id="dashboardConfirmationDialog"/u);
    assert.match(dashboard, /id="dashboardResultDialog"/u);
    assert.match(dashboard, /id="dashboardResultDiagnosticSection"/u);
    assert.match(dashboard, /id="dashboardResultDiagnostic"/u);
    assert.match(dashboard, /id="dashboardExpandView"/u);
    assert.match(dashboard, /id="dashboardLaunchPromptDialog"/u);
    assert.match(dashboard, /id="dashboardLaunchPromptDoNotShow"/u);
    assert.match(dashboard, /DashboardLaunchService\.js/u);
    assert.match(dashboard, /DashboardLaunchPromptComponent\.js/u);
    assert.match(dashboard, /id="dashboardPdfArchiverDialog"/u);
    assert.match(dashboard, /id="dashboardPdfArchiverInstall"/u);
    assert.match(dashboard, /PdfArchiverIntegrationService\.js/u);
    assert.match(dashboard, /PdfArchiverIntegrationComponent\.js/u);
    assert.match(dashboard, /class="dashboard-confirmation-cancel"[\s\S]*?>[\s\S]*?✕/u);
    assert.match(dashboard, /class="dashboard-confirmation-delete"[\s\S]*?>[\s\S]*?🗑️/u);
    assert.doesNotMatch(dashboard, /id="dashboardDiagnostics"/u);
    assert.doesNotMatch(dashboardStyles, /\.dashboard-diagnostics/u);
    assert.doesNotMatch(dashboardManager, /deleteComponent\.render/u);
    assert.match(dashboard, /id="dashboardFeedbackEditors"/u);
    assert.doesNotMatch(dashboard, /id="dashboardFeedbackReason"/u);
    assert.match(dashboard, /GlobalDashboardManager\.js/u);
    assert.doesNotMatch(dashboard, /openai\.js|OpenAIService/u);
    assert.match(dashboardStyles, /overflow-y:\s*auto/u);
    assert.match(dashboardStyles, /--dashboard-preview-lines/u);
    assert.match(dashboardStyles, /\.dashboard-option-groups\s*\{[^}]*grid-template-columns:\s*repeat\(2,/su);
    assert.match(dashboardStyles, /\.dashboard-display-options-summary:focus-visible/u);
    assert.match(dashboardStyles, /@keyframes dashboard-spin/u);
    assert.match(
        dashboardStyles,
        /\.dashboard-confirmation-dialog\s*\{[^}]*border-top-width:\s*8px[^}]*box-shadow:/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-confirmation-delete\s*\{[^}]*min-width:\s*178px[^}]*background:\s*#b42318/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-confirmation-cancel\s*\{[^}]*min-width:\s*112px[^}]*background:\s*#69737d/su
    );
    assert.match(dashboardStyles, /\.dashboard-result-dialog\s*\{[^}]*box-shadow:/su);
    assert.match(dashboardStyles, /\.dashboard-launch-prompt-dialog\s*\{[^}]*box-shadow:/su);
    assert.match(dashboardStyles, /\.dashboard-pdf-archiver-dialog\s*\{[^}]*box-shadow:/su);
    assert.match(dashboardStyles, /\.dashboard-expanded-view \.dashboard-accounts\s*\{[^}]*max-height:\s*none/su);
    assert.match(dashboardEntry, /URLSearchParams\(window\.location\.search\)/u);
    assert.match(dashboardEntry, /PREPARE_RESTORED_DASHBOARD/u);
    assert.match(dashboardEntry, /post-install-recovery/u);
    assert.match(dashboardEntry, /searchParams\.set\('release', CONFIG\.ADDON_VERSION\)/u);
    assert.match(
        dashboardStyles,
        /\.dashboard-message-actions\s*\{[^}]*grid-template-columns:\s*repeat\(3,/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-bulk-action-groups\s*\{[^}]*grid-template-columns:\s*repeat\(2,/su
    );
    assert.match(messageComponent, /dashboardMarkReadOne/u);
    assert.match(messageComponent, /dashboardReadActionsGroup/u);
    assert.match(messageComponent, /dashboardShowPreviewOne/u);
    assert.match(messageComponent, /dashboardOpenInTabOne/u);
    assert.match(messageComponent, /dashboardPreviewExpand/u);
    assert.match(messageComponent, /dashboardPreviewReset/u);
    assert.match(messageComponent, /dashboardPreviewClose/u);
    assert.match(previewController, /LINE_STEP = 4/u);
    assert.match(previewController, /MAX_LINES = 20/u);
    assert.match(messageComponent, /dashboardArchiveOne/u);
    assert.match(messageComponent, /dashboardExportPdfOne/u);
    assert.match(messageComponent, /dashboardChatOne/u);
    assert.match(messageComponent, /dashboardAnalyzeOne/u);
    assert.match(messageComponent, /dashboardReanalyzeOne/u);
    assert.match(messageComponent, /contextOnly: true/u);
    assert.match(analysisController, /DashboardAIService\.analyzePlan/u);
    assert.match(analysisController, /score.*-\$\{scope\}/u);
    assert.match(messageComponent, /dashboard-message-action-group/u);
    assert.match(messageComponent, /dashboard-action-icon/u);
    assert.match(messageComponent, /addEventListener\('contextmenu'/u);
    assert.match(messageComponent, /event\.shiftKey && event\.key === 'F10'/u);
    assert.match(messageContextMenuComponent, /dashboardContextMenuLayout/u);
    assert.match(messageContextMenuComponent, /role', 'menuitemradio'/u);
    assert.match(messageContextMenuComponent, /setSubmenuOpen/u);
    assert.doesNotMatch(messageContextMenuComponent, /addEventListener\('scroll'/u);
    assert.match(contextMenuStyles, /\.dashboard-message-context-menu/u);
    assert.match(contextMenuStyles, /\.dashboard-context-menu-content/u);
    assert.match(contextMenuStyles, /\.dashboard-context-submenu/u);
    assert.match(dashboardStyles, /\.dashboard-preview-controls/u);
    assert.match(dashboardStyles, /\.dashboard-preview-control\.close/u);
    assert.match(bulkActionsComponent, /this\.hosts\.map\(host => this\.renderInto\(host\)\)/u);
    assert.match(
        messageComponent,
        /createElement\('label'\)[\s\S]*dashboard-message-selection-area[\s\S]*selectionArea\.append\(checkbox, content\)[\s\S]*dashboard-message-main[\s\S]*messageMain\.appendChild\(selectionArea\)[\s\S]*item\.append\(messageMain,/u
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-message-selection-area\s*\{[^}]*align-self:\s*stretch[^}]*cursor:\s*pointer/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-message-main\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*minmax\(min-content,\s*1fr\)\s*auto;[^}]*align-self:\s*stretch;/su
    );
    assert.match(
        dashboardStyles,
        /\.dashboard-message-action\.archive,\s*\.dashboard-message-action\.export-pdf\s*\{[^}]*background:\s*#526d82/su
    );
    assert.match(pdfIntegration, /thunderbird-pdf@felicitas-wisdom\.com/u);
    assert.match(pdfIntegration, /thunderbird-pdf-archiver:open-review/u);
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
