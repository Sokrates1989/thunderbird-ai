import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadOpenAIService({ model = 'auto', fetchImplementation } = {}) {
    const requests = [];
    const context = createContext({
        browser: { i18n: { getUILanguage: () => 'de-DE' } },
        fetch: fetchImplementation || (async (_url, options) => {
            requests.push(JSON.parse(options.body));
            return {
                ok: true,
                json: async () => ({
                    output: [{
                        type: 'message',
                        content: [{ type: 'output_text', text: 'Ergebnis' }]
                    }]
                })
            };
        })
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    context.StorageManager = {
        getSettings: async () => ({ openaiApiKey: 'sk-test-key', model })
    };
    loadScript(context, 'common/utils/openai.js');
    return { service: context.OpenAIService, requests };
}

test('automatic model routing uses Terra for summaries and Luna for classification', async () => {
    const { service, requests } = loadOpenAIService();

    await service.request('summarize', { instructions: 'x', input: 'y' });
    await service.request('categorize', { instructions: 'x', input: 'y' });

    assert.equal(requests[0].model, 'gpt-5.6-terra');
    assert.equal(requests[1].model, 'gpt-5.6-luna');
    assert.equal(requests[0].store, false);
    assert.equal(requests[0].reasoning.effort, 'low');
});

test('an explicit supported model overrides task routing', async () => {
    const { service, requests } = loadOpenAIService({ model: 'gpt-5.6-sol' });

    const result = await service.request('spam', { instructions: 'x', input: 'y' });

    assert.equal(requests[0].model, 'gpt-5.6-sol');
    assert.equal(result.content, 'Ergebnis');
});

test('extractOutputText aggregates message output items safely', () => {
    const { service } = loadOpenAIService();
    const text = service.extractOutputText({
        output: [
            { type: 'reasoning', content: [] },
            { type: 'message', content: [{ type: 'output_text', text: 'Teil 1' }] },
            { type: 'message', content: [{ type: 'output_text', text: 'Teil 2' }] }
        ]
    });

    assert.equal(text, 'Teil 1\nTeil 2');
});

test('summary fallback is used only when no API key is configured', async () => {
    const { service } = loadOpenAIService();
    service.getSettings = async () => ({ apiKey: '', model: 'auto', baseUrl: 'https://api.openai.com/v1' });

    const result = await service.generateSummary({
        subject: 'Test',
        author: 'Ada',
        content: 'Erster Satz. Zweiter Satz.',
        attachments: []
    });

    assert.equal(result.usedApi, false);
    assert.match(result.content, /Erster Satz/);
});

test('reply refinement sends the current draft and only prior operator requests', async () => {
    const { service, requests } = loadOpenAIService();

    await service.refineReply(
        {
            subject: 'Termin',
            author: 'Ada',
            content: 'Passt Dienstag um zehn Uhr?',
            attachments: []
        },
        'Hallo Ada, Dienstag passt.',
        'Bitte bestätige auch die Uhrzeit.',
        [
            { role: 'user', content: 'Freundlicher formulieren' },
            { role: 'assistant', content: 'Alter vollständiger Entwurf' }
        ]
    );

    assert.equal(requests[0].model, 'gpt-5.6-terra');
    assert.match(requests[0].input, /Hallo Ada, Dienstag passt\./u);
    assert.match(requests[0].input, /Bitte bestätige auch die Uhrzeit\./u);
    assert.match(requests[0].input, /Freundlicher formulieren/u);
    assert.doesNotMatch(requests[0].input, /Alter vollständiger Entwurf/u);
    assert.equal(requests[0].store, false);
});
