import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadDiagnostics() {
    const storage = {};
    const context = createContext({
        console: { log() {}, warn() {}, error() {} },
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async key => ({ [key]: storage[key] }),
                set: async values => Object.assign(storage, values)
            } }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/RuntimeDiagnosticService.js');
    return { context, service: context.RuntimeDiagnosticService, storage };
}

test('runtime diagnostics retain action boundaries without result or email content', async () => {
    const { context, service, storage } = loadDiagnostics();

    await service.run('dashboard', 'refresh-mailbox', async () => ({
        success: true,
        secret: 'mail body must never be persisted'
    }));

    const events = storage[context.CONFIG.STORAGE_KEYS.RUNTIME_DIAGNOSTICS];
    assert.deepEqual(Array.from(events, event => event.state), ['started', 'completed']);
    assert.equal(events[0].action, 'refresh-mailbox');
    assert.doesNotMatch(JSON.stringify(events), /mail body|secret/u);
});

test('runtime diagnostics sanitize failures and keep a bounded activity history', async () => {
    const { context, service, storage } = loadDiagnostics();
    service.MAX_EVENTS = 4;

    await assert.rejects(
        service.run('single mail', 'delete message', async () => {
            const error = new Error('Sensitive subject and body');
            error.code = 'DELETE FAILED!';
            throw error;
        })
    );
    await service.run('dashboard', 'refresh', async () => undefined);
    await service.run('settings', 'initialize', async () => undefined);

    const events = storage[context.CONFIG.STORAGE_KEYS.RUNTIME_DIAGNOSTICS];
    assert.equal(events.length, 4);
    assert.equal(events.at(-1).state, 'completed');
    assert.doesNotMatch(JSON.stringify(events), /Sensitive subject|body/u);
    assert.ok(events.every(event => !/[ !]/u.test(event.action)));
});
