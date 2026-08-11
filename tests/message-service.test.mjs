import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadMessageService(browser) {
    const context = createContext({ browser });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/message.js');
    return context.MessageService;
}

test('extracts text/plain from a multipart MIME tree instead of header metadata', async () => {
    const browser = {
        i18n: { getUILanguage: () => 'de-DE' },
        messages: {
            get: async () => ({
                id: 42,
                subject: 'Projektstatus',
                author: 'Ada <ada@example.test>',
                date: '2026-08-10T08:00:00Z',
                size: 1024,
                read: true,
                folder: { id: 'account://inbox' }
            }),
            getFull: async () => ({
                contentType: 'multipart/alternative',
                parts: [
                    { contentType: 'text/plain', body: 'Hallo\n\nDer Termin ist morgen.' },
                    { contentType: 'text/html', body: '<p>Dieser Text darf nicht doppelt erscheinen.</p>' }
                ]
            })
        }
    };

    const message = await loadMessageService(browser).getFullMessage(42);

    assert.equal(message.content, 'Hallo\n\nDer Termin ist morgen.');
    assert.equal(message.author, 'Ada <ada@example.test>');
    assert.equal(message.status, 'read');
    assert.equal(message.folderId, 'account://inbox');
});

test('converts an HTML-only message without requiring a DOM', () => {
    const service = loadMessageService({ i18n: { getUILanguage: () => 'de-DE' } });
    const content = service.extractBody({
        contentType: 'text/html',
        body: '<style>hidden</style><p>Gr&uuml;&szlig;e<br>aus K&ouml;ln &amp; Bonn</p>'
    });

    assert.equal(content, 'Grüße\naus Köln & Bonn');
});

test('extracts newsletter indicators without retaining raw MIME header values', () => {
    const service = loadMessageService({ i18n: { getUILanguage: () => 'de-DE' } });
    const signals = service.extractSpamSignals({
        headers: {
            'List-Unsubscribe': ['<https://example.test/unsubscribe?secret=1>'],
            'List-ID': ['private-campaign-id'],
            Precedence: ['bulk']
        }
    }, {
        author: 'Newsletter <no-reply@example.test>'
    }, 'Newsletter abbestellen: https://click.example.test/path?utm_campaign=summer');

    assert.deepEqual(Array.from(signals).sort(), [
        'automated-sender-address',
        'bulk-precedence-header',
        'campaign-tracking-link',
        'list-id-header',
        'list-unsubscribe-header',
        'unsubscribe-language'
    ]);
    assert.doesNotMatch(JSON.stringify(signals), /secret|private-campaign-id/u);
});

test('ranks similar messages locally by subject overlap and sender', async () => {
    const pages = [{
        id: null,
        messages: [
            { id: 1, subject: 'Re: Projekt Alpha Termin', author: 'Ada', date: '2026-08-09' },
            { id: 2, subject: 'Projekt Alpha Unterlagen', author: 'Ada', date: '2026-08-08' },
            { id: 3, subject: 'Newsletter August', author: 'Shop', date: '2026-08-10' }
        ]
    }];
    const browser = {
        i18n: { getUILanguage: () => 'de-DE' },
        messages: {
            get: async () => ({ id: 1, subject: 'Projekt Alpha Termin', author: 'Ada', folder: { id: 'inbox' } }),
            query: async () => pages[0],
            continueList: async () => ({ id: null, messages: [] })
        }
    };

    const similar = await loadMessageService(browser).findSimilarMessages(1);

    assert.deepEqual(Array.from(similar, item => item.id), [2]);
});
