import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadStorage(initial = {}, options = {}) {
    const values = { ...initial };
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async keys => {
                    if (options.failReads) {
                        throw new Error('Storage unavailable');
                    }
                    return Object.fromEntries(
                        (Array.isArray(keys) ? keys : [keys])
                            .filter(key => Object.hasOwn(values, key))
                            .map(key => [key, values[key]])
                    );
                },
                set: async updates => Object.assign(values, updates)
            } }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(context, 'common/utils/storage.js');
    return { context, service: context.StorageManager, values };
}

test('new installations receive requested task-specific model defaults', async () => {
    const { service } = loadStorage();
    const settings = await service.getSettings();

    assert.equal(settings.aiProvider, 'openai');
    assert.equal(settings.providerConfig.baseUrl, 'https://api.openai.com/v1');
    assert.equal(settings.bulkModel, 'gpt-5.6-luna');
    assert.equal(settings.singleScoreModel, 'gpt-5.6-terra');
    assert.equal(settings.summarizeModel, 'gpt-5.6-sol');
    assert.equal(settings.replyModel, 'gpt-5.6-sol');
    assert.equal(settings.chatModel, 'gpt-5.6-sol');
    assert.equal(settings.dashboardOpenMode, 'overlay');
    assert.equal(settings.singleMailOpenMode, 'overlay');
});

test('legacy OpenAI credentials migrate without blocking independent provider profiles', async () => {
    const { service, values } = loadStorage({
        openaiApiKey: 'sk-existing-openai',
        summarizeModel: 'gpt-5.6-terra'
    });

    const migrated = await service.getSettings();
    assert.equal(migrated.aiProvider, 'openai');
    assert.equal(migrated.providerConfig.apiKey, 'sk-existing-openai');
    assert.equal(migrated.providerConfig.taskModels.summarize, 'gpt-5.6-terra');
    assert.equal(values.aiProvider, 'openai');
    assert.equal(values.aiProviderConfigurations.openai.apiKey, 'sk-existing-openai');

    const configurations = migrated.aiProviderConfigurations;
    configurations.anthropic.apiKey = 'anthropic-example';
    configurations.anthropic.taskModels.summarize = 'claude-opus-5';
    await service.saveSettings({
        aiProvider: 'anthropic',
        aiProviderConfigurations: configurations,
        uiLanguage: 'en'
    });

    const selected = await service.getSettings();
    assert.equal(selected.aiProvider, 'anthropic');
    assert.equal(selected.providerConfig.apiKey, 'anthropic-example');
    assert.equal(selected.summarizeModel, 'claude-opus-5');
    assert.equal(selected.aiProviderConfigurations.openai.apiKey, 'sk-existing-openai');
    assert.equal(values.openaiApiKey, 'sk-existing-openai');
});

test('settings reads surface storage failures instead of inventing empty defaults', async () => {
    const { service } = loadStorage({}, { failReads: true });

    await assert.rejects(service.getSettings(), /Storage unavailable/u);
});

test('settings writes abort when existing launch preferences cannot be preserved', async () => {
    const { context, service, values } = loadStorage({}, { failReads: true });
    const settings = {
        openaiApiKey: 'sk-must-not-be-written',
        uiLanguage: 'en',
        ...Object.fromEntries(context.CONFIG.AI.MODEL_SETTINGS.map(definition => [
            definition.property,
            definition.defaultModel
        ]))
    };

    await assert.rejects(service.saveSettings(settings), /Storage unavailable/u);
    assert.deepEqual(values, {});
});

test('legacy general model is a migration fallback and saved task choices become independent', async () => {
    const { context, service, values } = loadStorage({ model: 'gpt-5.6-terra' });
    const migrated = await service.getSettings();
    assert.equal(migrated.summarizeModel, 'gpt-5.6-terra');
    assert.equal(migrated.bulkModel, 'gpt-5.6-terra');

    await service.saveSettings({
        openaiApiKey: 'sk-example',
        uiLanguage: 'en',
        dashboardOpenMode: 'tab',
        singleMailOpenMode: 'overlay',
        ...Object.fromEntries(context.CONFIG.AI.MODEL_SETTINGS.map(definition => [
            definition.property,
            definition.defaultModel
        ]))
    });

    assert.equal(values.bulkModel, 'gpt-5.6-luna');
    assert.equal(values.singleScoreModel, 'gpt-5.6-terra');
    assert.equal(values.summarizeModel, 'gpt-5.6-sol');
    assert.equal(values.dashboardOpenMode, 'tab');
    assert.equal(values.singleMailOpenMode, 'overlay');
});

test('saving a partial settings payload preserves both existing launch preferences', async () => {
    const { context, service, values } = loadStorage({
        dashboardOpenMode: 'tab',
        singleMailOpenMode: 'tab'
    });

    await service.saveSettings({
        openaiApiKey: 'sk-example',
        uiLanguage: 'en',
        ...Object.fromEntries(context.CONFIG.AI.MODEL_SETTINGS.map(definition => [
            definition.property,
            definition.defaultModel
        ]))
    });

    assert.equal(values.dashboardOpenMode, 'tab');
    assert.equal(values.singleMailOpenMode, 'tab');
});

test('concurrent token reports accumulate by model and produce a dated price estimate', async () => {
    const { service, values } = loadStorage();

    await Promise.all([
        service.recordApiUsage('openai', 'gpt-5.6-luna', {
            input_tokens: 1_000_000,
            input_tokens_details: { cached_tokens: 200_000 },
            output_tokens: 100_000
        }),
        service.recordApiUsage('openai', 'gpt-5.6-terra', {
            input_tokens: 500_000,
            output_tokens: 50_000
        })
    ]);

    const settings = await service.getSettings();
    assert.deepEqual(JSON.parse(JSON.stringify(values.apiUsageByModel)), {
        'openai:gpt-5.6-luna': {
            inputTokens: 1_000_000,
            cachedInputTokens: 200_000,
            outputTokens: 100_000
        },
        'openai:gpt-5.6-terra': {
            inputTokens: 500_000,
            cachedInputTokens: 0,
            outputTokens: 50_000
        }
    });
    assert.ok(Math.abs(settings.estimatedApiCostUsd - 1.884) < Number.EPSILON);
});

test('non-OpenAI provider usage is counted but excluded from the OpenAI price estimate', async () => {
    const { service } = loadStorage();

    await service.recordApiUsage('anthropic', 'claude-sonnet-5', {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000
    });
    await service.recordApiUsage('openai', 'gpt-5.6-luna', {
        input_tokens: 1_000_000,
        output_tokens: 0
    });

    const settings = await service.getSettings();
    assert.equal(settings.apiUsageByModel['anthropic:claude-sonnet-5'].inputTokens, 1_000_000);
    assert.ok(Math.abs(settings.estimatedApiCostUsd - 0.2) < Number.EPSILON);
});
