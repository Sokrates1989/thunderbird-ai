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

function loadService({ accounts, query }) {
    const aborted = [];
    const context = createContext({
        console: { error() {}, log() {}, warn() {} },
        browser: {
            accounts: { list: async includeFolders => {
                assert.equal(includeFolders, true);
                return accounts;
            } },
            messages: {
                query,
                abortList: async id => aborted.push(id)
            }
        }
    });
    loadScript(context, 'thunderbird-ai/components/global-dashboard/GlobalMailService.js');
    return { aborted, service: context.GlobalMailService };
}

test('global dashboard returns the newest ten unread Inbox headers per mail account', async () => {
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
            const messages = Array.from({ length: 12 }, (_, index) => message(index + 1, index + 1));
            return { id: 'list-a', messages: messages.reverse() };
        }
        return { id: 'list-b', messages: [message(20, 2), message(21, 5)] };
    };
    const { aborted, service } = loadService({ accounts, query });

    const results = await service.listUnreadByAccount(10);

    assert.equal(results.length, 2);
    assert.equal(results[0].accountName, 'Personal');
    assert.equal(results[0].messages.length, 10);
    assert.deepEqual(Array.from(results[0].messages, item => item.id), [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]);
    assert.equal(results[1].accountName, 'Work');
    assert.deepEqual(Array.from(results[1].messages, item => item.id), [21, 20]);
    assert.deepEqual(queries, [
        { folderId: 'inbox-a', read: false, messagesPerPage: 100 },
        { folderId: 'inbox-b', read: false, messagesPerPage: 100 }
    ]);
    assert.deepEqual(aborted.sort(), ['list-a', 'list-b']);
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

    assert.equal(manifest.action.default_popup, 'global-dashboard.html');
    assert.equal(manifest.message_display_action.default_popup, 'single-mail-ui.html');
    assert.match(dashboard, /GlobalMailService\.js/u);
    assert.match(dashboard, /GlobalDashboardManager\.js/u);
    assert.doesNotMatch(dashboard, /openai\.js|OpenAIService/u);
});
