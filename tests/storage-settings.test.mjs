import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadStorage(initial = {}) {
    const values = { ...initial };
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async keys => Object.fromEntries(
                    (Array.isArray(keys) ? keys : [keys])
                        .filter(key => Object.hasOwn(values, key))
                        .map(key => [key, values[key]])
                ),
                set: async updates => Object.assign(values, updates)
            } }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/storage.js');
    return { context, service: context.StorageManager, values };
}

test('new installations receive requested task-specific model defaults', async () => {
    const { service } = loadStorage();
    const settings = await service.getSettings();

    assert.equal(settings.bulkModel, 'gpt-5.6-luna');
    assert.equal(settings.singleScoreModel, 'gpt-5.6-terra');
    assert.equal(settings.summarizeModel, 'gpt-5.6-sol');
    assert.equal(settings.replyModel, 'gpt-5.6-sol');
    assert.equal(settings.chatModel, 'gpt-5.6-sol');
});

test('legacy general model is a migration fallback and saved task choices become independent', async () => {
    const { context, service, values } = loadStorage({ model: 'gpt-5.6-terra' });
    const migrated = await service.getSettings();
    assert.equal(migrated.summarizeModel, 'gpt-5.6-terra');
    assert.equal(migrated.bulkModel, 'gpt-5.6-terra');

    await service.saveSettings({
        openaiApiKey: 'sk-example',
        uiLanguage: 'en',
        ...Object.fromEntries(context.CONFIG.OPENAI.MODEL_SETTINGS.map(definition => [
            definition.property,
            definition.defaultModel
        ]))
    });

    assert.equal(values.bulkModel, 'gpt-5.6-luna');
    assert.equal(values.singleScoreModel, 'gpt-5.6-terra');
    assert.equal(values.summarizeModel, 'gpt-5.6-sol');
});

test('concurrent token reports accumulate by model and produce a dated price estimate', async () => {
    const { service, values } = loadStorage();

    await Promise.all([
        service.recordApiUsage('gpt-5.6-luna', {
            input_tokens: 1_000_000,
            input_tokens_details: { cached_tokens: 200_000 },
            output_tokens: 100_000
        }),
        service.recordApiUsage('gpt-5.6-terra', {
            input_tokens: 500_000,
            output_tokens: 50_000
        })
    ]);

    const settings = await service.getSettings();
    assert.deepEqual(JSON.parse(JSON.stringify(values.apiUsageByModel)), {
        'gpt-5.6-luna': {
            inputTokens: 1_000_000,
            cachedInputTokens: 200_000,
            outputTokens: 100_000
        },
        'gpt-5.6-terra': {
            inputTokens: 500_000,
            cachedInputTokens: 0,
            outputTokens: 50_000
        }
    });
    assert.ok(Math.abs(settings.estimatedApiCostUsd - 1.884) < Number.EPSILON);
});
