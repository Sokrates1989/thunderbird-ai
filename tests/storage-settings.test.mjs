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
        autoProcess: false,
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
