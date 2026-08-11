import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadSpamPrecheckService(browser) {
    const context = createContext({ browser });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/message.js');
    loadScript(context, 'common/utils/spam-precheck.js');
    return context;
}

function daysAgo(days) {
    return new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
}

test('counts paginated sender history once and attaches only aggregate scoring data', async () => {
    const queries = [];
    let continuations = 0;
    const browser = {
        i18n: { getUILanguage: () => 'de-DE' },
        messages: {
            query: async query => {
                queries.push(query);
                return {
                    id: 'sender-list',
                    messages: [
                        { id: 1, date: daysAgo(5), junk: true },
                        { id: 2, date: daysAgo(45), junk: false }
                    ]
                };
            },
            continueList: async id => {
                continuations += 1;
                assert.equal(id, 'sender-list');
                return { id: null, messages: [{ id: 3, date: daysAgo(120), junk: false }] };
            }
        }
    };
    const { SpamPrecheckService: service } = loadSpamPrecheckService(browser);
    const messages = [
        {
            id: 10,
            author: 'Shop <news@example.test>',
            spamSignals: ['list-unsubscribe-header', 'list-id-header', 'unsubscribe-language']
        },
        { id: 11, author: 'news@example.test', spamSignals: [] }
    ];

    const enriched = await service.enrichMessages(messages);

    assert.equal(queries.length, 1);
    assert.equal(queries[0].author, 'news@example.test');
    assert.equal(queries[0].messagesPerPage, 100);
    assert.equal(queries[0].returnMessageListId, undefined);
    assert.equal(continuations, 1);
    assert.deepEqual({
        available: enriched[0].spamPrecheck.senderHistoryAvailable,
        total: enriched[0].spamPrecheck.totalFromSender,
        recent30: enriched[0].spamPrecheck.recent30DaysFromSender,
        recent90: enriched[0].spamPrecheck.recent90DaysFromSender,
        junk: enriched[0].spamPrecheck.previouslyMarkedJunkFromSender
    }, {
        available: true,
        total: 3,
        recent30: 1,
        recent90: 2,
        junk: 1
    });
    assert.equal(enriched[0].spamPrecheck.suggestedSpamMinimum, 45);
    assert.equal(enriched[1].spamPrecheck.totalFromSender, 3);
});

test('caps large histories, aborts the remaining list, and marks the count as a minimum', async () => {
    const aborted = [];
    const browser = {
        i18n: { getUILanguage: () => 'de-DE' },
        messages: {
            query: async () => ({
                id: 'large-list',
                messages: [1, 2, 3].map(id => ({ id, date: daysAgo(id) }))
            }),
            continueList: async () => {
                throw new Error('must not continue after reaching the cap');
            },
            abortList: async id => aborted.push(id)
        }
    };
    const context = loadSpamPrecheckService(browser);
    context.CONFIG.SPAM_PRECHECK.HISTORY_LIMIT = 3;

    const [enriched] = await context.SpamPrecheckService.enrichMessages([
        { id: 10, author: 'Bulk <bulk@example.test>', spamSignals: [] }
    ]);

    assert.equal(enriched.spamPrecheck.totalFromSender, 3);
    assert.equal(enriched.spamPrecheck.totalFromSenderIsMinimum, true);
    assert.deepEqual(aborted, ['large-list']);
});

test('continues scoring with structural signals when sender-history lookup fails', async () => {
    const browser = {
        i18n: { getUILanguage: () => 'de-DE' },
        messages: {
            query: async () => {
                throw new Error('mail store temporarily unavailable');
            }
        }
    };
    const { SpamPrecheckService: service } = loadSpamPrecheckService(browser);

    const [enriched] = await service.enrichMessages([{
        id: 10,
        author: 'Campaign <campaign@example.test>',
        spamSignals: ['list-unsubscribe-header']
    }]);

    assert.equal(enriched.spamPrecheck.senderHistoryAvailable, false);
    assert.equal(enriched.spamPrecheck.suggestedSpamMinimum, 18);
});
