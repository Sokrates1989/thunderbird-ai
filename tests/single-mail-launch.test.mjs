import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function loadServices(existingTabs = []) {
    const popupAssignments = [];
    const openedPopups = [];
    const createdTabs = [];
    const updatedTabs = [];
    const context = createContext({
        browser: {
            runtime: { getURL: value => `moz-extension://test/${value}` },
            storage: { local: {
                get: async () => ({}),
                set: async () => {}
            } },
            tabs: {
                query: async () => existingTabs.map(tab => ({ ...tab })),
                update: async (tabId, details) => {
                    updatedTabs.push([tabId, { ...details }]);
                    return { id: tabId, ...details };
                },
                create: async details => {
                    const created = { id: 90, windowId: 4, ...details };
                    createdTabs.push(created);
                    return created;
                }
            },
            windows: { update: async () => {} }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(context, 'thunderbird-ai/components/shared/SingleMailWorkspaceService.js');
    return {
        context,
        createdTabs,
        updatedTabs,
        popupAssignments,
        openedPopups
    };
}

test('temporary overlay routing clears the popup after the user click', async () => {
    const { context, popupAssignments, openedPopups } = loadServices();
    const actionApi = {
        setPopup: async details => popupAssignments.push({ ...details }),
        openPopup: async details => {
            openedPopups.push({ ...details });
            return true;
        }
    };

    await context.LaunchModeService.openOverlay(
        actionApi,
        'single-mail-ui.html',
        { tabId: 7, windowId: 3 }
    );

    assert.deepEqual(popupAssignments, [
        { popup: 'single-mail-ui.html', tabId: 7 },
        { popup: '', tabId: 7 }
    ]);
    assert.deepEqual(openedPopups, [{ windowId: 3 }]);
});

test('single-mail workspaces focus an existing matching AI mode and isolate other modes', async () => {
    const existingTabs = [{
        id: 12,
        windowId: 2,
        url: 'moz-extension://test/single-mail-ui.html?messageId=42&chat=1&view=expanded'
    }];
    const { context, createdTabs, updatedTabs } = loadServices(existingTabs);

    const focused = await context.SingleMailWorkspaceService.openExpanded(42, 'chat', 'dashboard');
    const created = await context.SingleMailWorkspaceService.openExpanded(42, 'reply', 'dashboard');

    assert.equal(focused.id, 12);
    assert.deepEqual(updatedTabs, [[12, { active: true }]]);
    assert.equal(created.id, 90);
    assert.equal(createdTabs.length, 1);
    assert.match(createdTabs[0].url, /messageId=42&reply=1&view=expanded/u);
});

test('single-mail UI exposes a localized fullscreen control backed by the shared service', () => {
    const page = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/single-mail-ui.html'),
        'utf8'
    );
    const manager = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/SingleMailManager.js'),
        'utf8'
    );

    assert.match(page, /id="singleMailExpandView"/u);
    assert.match(page, /data-i18n-title="singleMailExpandView"/u);
    assert.match(page, /SingleMailWorkspaceService\.js/u);
    assert.match(manager, /SingleMailWorkspaceService\.openExpanded/u);
});
