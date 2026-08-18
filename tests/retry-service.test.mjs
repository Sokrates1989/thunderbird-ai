import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadRetryService(sendMessage) {
    const context = createContext({ browser: { runtime: { sendMessage } } });
    loadScript(context, 'common/utils/retry.js');
    const delays = [];
    context.RetryService.wait = async delayMs => delays.push(delayMs);
    return { delays, service: context.RetryService };
}

test('runtime startup delivery failures are retried before reaching the operator', async () => {
    let attempts = 0;
    const { delays, service } = loadRetryService(async message => {
        attempts += 1;
        if (attempts === 1) {
            throw new Error('Could not establish connection. Receiving end does not exist.');
        }
        return { success: true, message };
    });

    const response = await service.sendRuntimeMessage({ action: 'test' });

    assert.equal(response.success, true);
    assert.equal(attempts, 2);
    assert.equal(delays.length, 1);
});

test('ambiguous closed-port failures are not retried to avoid duplicate side effects', async () => {
    let attempts = 0;
    const { delays, service } = loadRetryService(async () => {
        attempts += 1;
        throw new Error('The message port closed before a response was received.');
    });

    await assert.rejects(
        service.sendRuntimeMessage({ action: 'test' }),
        /message port closed/u
    );
    assert.equal(attempts, 1);
    assert.equal(delays.length, 0);
});

test('bounded runtime reads surface a stable timeout without retrying an ambiguous request', async () => {
    let attempts = 0;
    const { service } = loadRetryService(async () => {
        attempts += 1;
        return new Promise(() => {});
    });

    await assert.rejects(
        service.sendRuntimeMessage(
            { action: 'getSettings' },
            { timeoutMs: 5, stage: 'settings-read-getSettings' }
        ),
        error => (
            error.code === 'RUNTIME_MESSAGE_TIMEOUT'
            && error.stage === 'settings-read-getSettings'
        )
    );
    assert.equal(attempts, 1);
});
