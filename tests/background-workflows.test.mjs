import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function eventTarget() {
    return { addListener() {} };
}

function loadBackground() {
    const stats = [];
    const serviceCalls = [];
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'de-DE' },
            runtime: { onMessage: eventTarget(), getURL: value => value },
            menus: { onClicked: eventTarget(), removeAll: async () => {}, create: async () => {} },
            messageDisplay: { onMessagesDisplayed: eventTarget() },
            notifications: { create: async () => {} },
            tabs: { create: async () => {} }
        }
    });
    loadScript(context, 'thunderbird-ai/config/constants.js');
    context.MessageService = {
        getFullMessage: async id => ({
            id,
            subject: 'Test',
            author: 'Ada',
            formattedDate: '10.08.2026',
            content: 'Nachrichtentext',
            attachments: []
        }),
        findSimilarMessages: async () => [{
            id: 8,
            subject: 'Ähnlich',
            author: 'Ada',
            date: '2026-08-09'
        }]
    };
    const result = method => async () => {
        serviceCalls.push(method);
        return { content: `${method} result`, usedApi: true, model: 'gpt-5.6-luna' };
    };
    context.OpenAIService = {
        generateSummary: result('summary'),
        generateReply: result('reply'),
        categorizeEmail: result('categorize'),
        checkImportance: result('importance'),
        translateMessage: result('translate'),
        extractInfo: result('extract'),
        checkSpam: result('spam'),
        processChat: result('chat'),
        improveText: result('improve'),
        testConnection: async () => ({ success: true, message: 'ok' })
    };
    context.StorageManager = {
        updateStatistics: async type => stats.push(type),
        getSettings: async () => ({ autoProcess: false }),
        saveSettings: async () => true,
        getAutomaticResult: async () => null,
        saveAutomaticResult: async () => true
    };
    loadScript(context, 'common/background.js');
    return { ai: context.thunderbirdAI, config: context.CONFIG, serviceCalls, stats };
}

test('every visible email AI action returns the shared result contract', async () => {
    const { ai, config, serviceCalls } = loadBackground();
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
    const { ai, config } = loadBackground();

    const chat = await ai.handleMessage({ action: config.ACTIONS.CHAT, messageId: 7, query: 'Was ist wichtig?' });
    const similar = await ai.handleMessage({ action: config.ACTIONS.FIND_SIMILAR, messageId: 7 });
    const apiTest = await ai.handleMessage({ action: config.ACTIONS.TEST });

    assert.equal(chat.data.content, 'chat result');
    assert.match(similar.data.content, /Ähnlich/);
    assert.equal(apiTest.success, true);
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
    assert.match(source, /messages\.getFull/u);
    assert.equal(manifest.compose_action, undefined);
});
