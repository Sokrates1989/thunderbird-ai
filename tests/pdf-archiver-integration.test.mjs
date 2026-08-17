import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadIntegration(sendMessage = async () => undefined) {
    const tabs = [];
    const context = createContext({
        browser: {
            runtime: { sendMessage },
            tabs: { create: async details => tabs.push({ ...details }) }
        }
    });
    loadScript(
        context,
        'thunderbird-ai/components/shared/PdfArchiverIntegrationService.js'
    );
    return { service: context.PdfArchiverIntegrationService, tabs };
}

test('installed PDF Archiver receives the selected message through the versioned protocol', async () => {
    const calls = [];
    const { service } = loadIntegration(async (...parameters) => {
        calls.push(parameters);
        return { protocolVersion: 1, success: true };
    });

    const result = await service.openReview(42);

    assert.equal(result.status, 'opened');
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'thunderbird-pdf-archiver@sokrates1989.de');
    assert.equal(calls[0][1].messageId, 42);
    assert.equal(calls[0][1].protocolVersion, 1);
    assert.equal(calls[0][1].type, 'thunderbird-pdf-archiver:open-review');
});

test('missing and incompatible PDF Archiver versions produce distinct safe fallbacks', async () => {
    const missing = loadIntegration(async () => {
        throw new Error('Could not establish connection. Receiving end does not exist.');
    });
    const incompatible = loadIntegration(async () => ({
        code: 'unsupported_protocol',
        protocolVersion: 2,
        success: false
    }));

    assert.equal((await missing.service.openReview(42)).status, 'unavailable');
    assert.equal((await incompatible.service.openReview(42)).status, 'incompatible');
    assert.equal((await missing.service.openReview(-1)).status, 'failed');
});

test('installation fallback opens the official PDF Archiver GitHub page', async () => {
    const { service, tabs } = loadIntegration();

    await service.openInstallPage();

    assert.deepEqual(tabs, [{
        url: 'https://github.com/Sokrates1989/thunderbird-pdf-extractor-plugin#install-on-windows'
    }]);
});
