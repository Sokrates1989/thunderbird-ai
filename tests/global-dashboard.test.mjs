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
    deleteMessages = async () => {}
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
                delete: deleteMessages
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
            t: key => key === 'dashboardUnknownSender' ? 'Unknown sender' : key
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailViewService.js');
    return context.GlobalMailViewService;
}

function loadSenderFilterComponent() {
    const context = createContext();
    loadScript(context, 'thunderbird-ai/components/global-dashboard/DashboardSenderFilterComponent.js');
    return context.DashboardSenderFilterComponent;
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

    assert.equal(manifest.action.default_popup, 'global-dashboard.html');
    assert.equal(manifest.message_display_action.default_popup, 'single-mail-ui.html');
    assert.ok(manifest.permissions.includes('messagesDelete'));
    assert.match(dashboard, /id="dashboardSelectAll"/u);
    assert.match(dashboard, /id="dashboardTrashSelected"/u);
    assert.match(dashboard, /id="dashboardShowPreview"/u);
    assert.match(dashboard, /id="dashboardPreviewLines"/u);
    assert.match(dashboard, /id="dashboardSortOrder"/u);
    assert.match(dashboard, /id="dashboardMessageLimit"/u);
    assert.match(dashboard, /id="dashboardDateFrom"[^>]*type="date"|type="date"[^>]*id="dashboardDateFrom"/u);
    assert.match(dashboard, /id="dashboardDateTo"[^>]*type="date"|type="date"[^>]*id="dashboardDateTo"/u);
    assert.match(dashboard, /id="dashboardSenderFilter"/u);
    assert.match(dashboard, /message\.js/u);
    assert.match(dashboard, /GlobalMailService\.js/u);
    assert.match(dashboard, /GlobalMailViewService\.js/u);
    assert.match(dashboard, /DashboardSenderFilterComponent\.js/u);
    assert.match(dashboard, /GlobalDashboardManager\.js/u);
    assert.doesNotMatch(dashboard, /openai\.js|OpenAIService/u);
    assert.match(dashboardStyles, /overflow-y:\s*auto/u);
    assert.match(dashboardStyles, /--dashboard-preview-lines/u);
});
