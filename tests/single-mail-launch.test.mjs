import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function loadServices(existingTabs = [], options = {}) {
    const popupAssignments = [];
    const openedPopups = [];
    const createdTabs = [];
    const updatedTabs = [];
    const removedTabs = [];
    const context = createContext({
        location: { search: options.locationSearch || '' },
        browser: {
            runtime: { getURL: value => `moz-extension://test/${value}` },
            storage: { local: {
                get: async () => ({}),
                set: async () => {}
            } },
            tabs: {
                get: async tabId => {
                    const tab = existingTabs.find(candidate => candidate.id === tabId);
                    if (!tab) {
                        throw new Error('Tab not found');
                    }
                    return { ...tab };
                },
                getCurrent: async () => {
                    const tab = existingTabs.find(candidate => candidate.current === true);
                    return tab ? { ...tab } : undefined;
                },
                query: async (queryInfo = {}) => existingTabs
                    .filter(tab => queryInfo.windowId === undefined
                        || tab.windowId === queryInfo.windowId)
                    .filter(tab => queryInfo.active !== true || tab.active === true)
                    .map(tab => ({ ...tab })),
                update: async (tabId, details) => {
                    updatedTabs.push([tabId, { ...details }]);
                    return { id: tabId, ...details };
                },
                create: async details => {
                    const created = { id: 90, windowId: 4, ...details };
                    createdTabs.push(created);
                    return created;
                },
                remove: async tabId => removedTabs.push(tabId)
            },
            messageDisplay: {
                getDisplayedMessages: async tabId => options.displayedMessages?.[tabId] || []
            },
            messageDisplayAction: {
                setPopup: async details => popupAssignments.push({ ...details }),
                openPopup: async details => {
                    openedPopups.push({ ...details });
                    return true;
                }
            },
            windows: { update: async () => {} }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/retry.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(context, 'thunderbird-ai/components/shared/SingleMailWorkspaceService.js');
    return {
        context,
        createdTabs,
        updatedTabs,
        removedTabs,
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

test('expanded workspace returns to its source message tab and opens the compact overlay', async () => {
    const existingTabs = [
        { id: 5, windowId: 2, index: 0, active: false, url: 'about:3pane' },
        {
            id: 11,
            windowId: 2,
            index: 1,
            active: true,
            current: true,
            url: 'moz-extension://test/single-mail-ui.html?messageId=42&view=expanded&returnTabId=5'
        }
    ];
    const {
        context,
        openedPopups,
        popupAssignments,
        removedTabs,
        updatedTabs
    } = loadServices(existingTabs, {
        locationSearch: '?messageId=42&view=expanded&returnTabId=5',
        displayedMessages: { 5: [{ id: 42 }] }
    });

    const result = await context.SingleMailWorkspaceService.returnToOverlay(42);

    assert.equal(result.overlayOpened, true);
    assert.equal(result.targetTabId, 5);
    assert.deepEqual(updatedTabs, [[5, { active: true }]]);
    assert.deepEqual(popupAssignments, [
        { popup: 'single-mail-ui.html', tabId: 5 },
        { popup: '', tabId: 5 }
    ]);
    assert.deepEqual(openedPopups, [{ windowId: 2 }]);
    assert.deepEqual(removedTabs, [11]);
});

test('expanded workspace closes onto a prior tab without opening an overlay for other mail', async () => {
    const existingTabs = [
        { id: 4, windowId: 2, index: 0, active: false, url: 'about:3pane' },
        {
            id: 11,
            windowId: 2,
            index: 1,
            active: true,
            current: true,
            url: 'moz-extension://test/single-mail-ui.html?messageId=42&view=expanded&returnTabId=99'
        }
    ];
    const { context, openedPopups, removedTabs, updatedTabs } = loadServices(existingTabs, {
        locationSearch: '?messageId=42&view=expanded&returnTabId=99',
        displayedMessages: { 4: [{ id: 77 }] }
    });

    const result = await context.SingleMailWorkspaceService.returnToOverlay(42);

    assert.equal(result.overlayOpened, false);
    assert.equal(result.targetTabId, 4);
    assert.deepEqual(updatedTabs, [[4, { active: true }]]);
    assert.deepEqual(openedPopups, []);
    assert.deepEqual(removedTabs, [11]);
});

test('single-mail UI exposes a localized fullscreen control backed by the shared service', () => {
    const page = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/single-mail-ui.html'),
        'utf8'
    );
    const styles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/single-mail-ui.css'),
        'utf8'
    );
    const manager = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/SingleMailManager.js'),
        'utf8'
    );

    assert.match(page, /id="singleMailExpandView"/u);
    assert.match(page, /data-i18n-title="singleMailExpandView"/u);
    assert.match(page, /id="scrollToTopButton"/u);
    assert.match(page, /ScrollToTopComponent\.js/u);
    assert.match(page, /SingleMailWorkspaceService\.js/u);
    assert.match(manager, /SingleMailWorkspaceService\.openExpanded/u);
    const returnButtonRule = styles.match(/\.single-mail-use-overlay \{[^}]+\}/u)?.[0] || '';
    assert.match(returnButtonRule, /min-height:\s*30px/u);
    assert.match(returnButtonRule, /font-size:\s*12px/u);
});

test('compact overlay return control persists the default and starts the handoff', async () => {
    class TestElement {
        constructor() {
            this.attributes = {};
            this.disabled = false;
            this.hidden = false;
            this.listeners = new Map();
            this.textContent = '';
            this.title = '';
            this.classList = { add: value => { this.addedClass = value; } };
        }

        addEventListener(name, listener) {
            this.listeners.set(name, listener);
        }

        removeEventListener(name) {
            this.listeners.delete(name);
        }

        setAttribute(name, value) {
            this.attributes[name] = String(value);
        }
    }

    const elements = new Map([
        ['emailSubject', new TestElement()],
        ['addonVersion', new TestElement()],
        ['singleMailExpandView', new TestElement()],
        ['singleMailUseOverlay', new TestElement()],
        ['singleMailUseOverlayLabel', new TestElement()]
    ]);
    const requests = [];
    const context = createContext({
        CONFIG: {
            ACTIONS: { SET_LAUNCH_MODE: 'setLaunchMode' },
            ADDON_NAME: 'AI Mail Assistant',
            ADDON_VERSION: '3.8.2'
        },
        I18n: {
            t: (key, replacements = {}) => replacements.version || key
        },
        document: {
            querySelector: () => new TestElement(),
            getElementById: id => elements.get(id),
            title: ''
        },
        location: { search: '?view=expanded' }
    });
    loadScript(context, 'thunderbird-ai/components/single-mail/HeaderComponent.js');
    let returnedToOverlay = 0;
    const manager = {
        sendToBackground: async (action, data) => {
            requests.push({ action, data });
            return { success: true };
        },
        returnToOverlay: async () => { returnedToOverlay += 1; },
        showError: () => assert.fail('Success must not show an error.')
    };
    const header = new context.HeaderComponent(manager);

    header.initialize();
    assert.equal(elements.get('singleMailExpandView').hidden, true);
    assert.equal(elements.get('singleMailUseOverlay').hidden, false);

    await header.setOverlayDefault();

    assert.equal(requests.length, 1);
    assert.equal(requests[0].action, 'setLaunchMode');
    assert.equal(requests[0].data.setting, 'singleMailOpenMode');
    assert.equal(requests[0].data.mode, 'overlay');
    assert.equal(elements.get('singleMailUseOverlay').disabled, true);
    assert.equal(elements.get('singleMailUseOverlay').addedClass, 'saved');
    assert.equal(returnedToOverlay, 1);
    assert.equal(
        elements.get('singleMailUseOverlayLabel').textContent,
        'singleMailUseOverlaySaved'
    );
});

test('overlay remains the normalized default when no single-mail preference exists', async () => {
    const { context } = loadServices();

    assert.equal(context.LaunchModeService.normalizeMode(undefined), 'overlay');
    assert.equal(await context.LaunchModeService.getMode('singleMailOpenMode'), 'overlay');
});
