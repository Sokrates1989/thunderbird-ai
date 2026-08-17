import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadLaunchService(initial = {}, options = {}) {
    const storage = { ...initial };
    const popups = [];
    const tabs = [];
    const tabUpdates = [];
    const windowUpdates = [];
    const context = createContext({
        browser: {
            action: { setPopup: async details => popups.push({ ...details }) },
            runtime: { getURL: value => `moz-extension://test/${value}` },
            storage: { local: {
                get: async keys => {
                    const requested = Array.isArray(keys) ? keys : [keys];
                    return Object.fromEntries(requested
                        .filter(key => Object.hasOwn(storage, key))
                        .map(key => [key, storage[key]]));
                },
                set: async values => Object.assign(storage, values)
            } },
            tabs: {
                create: options.createTab || (async details => {
                    const created = { id: 99, windowId: 7, ...details };
                    tabs.push(created);
                    return created;
                }),
                query: async () => options.existingTabs || [],
                update: options.updateTab || (async (tabId, details) => {
                    tabUpdates.push([tabId, { ...details }]);
                    return { id: tabId, ...details };
                })
            },
            windows: {
                update: async (windowId, details) => {
                    windowUpdates.push([windowId, { ...details }]);
                    return { id: windowId, ...details };
                }
            }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/DashboardLaunchService.js');
    return {
        context,
        service: context.DashboardLaunchService,
        storage,
        popups,
        tabs,
        tabUpdates,
        windowUpdates
    };
}

test('fifth overlay open offers fullscreen and starts a new cycle after Later', async () => {
    const { context, service, storage } = loadLaunchService();

    for (let open = 1; open < 5; open += 1) {
        assert.equal(await service.promptForOpen(''), null);
    }
    assert.equal(await service.promptForOpen(''), service.PROMPTS.DISCOVER_TAB);
    await service.resolvePrompt(service.PROMPTS.DISCOVER_TAB, false);
    assert.equal(await service.promptForOpen(''), null);

    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_OVERLAY_OPEN_COUNT], 1);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_OVERLAY_PROMPT_SUPPRESSED], false);
});

test('third manual fullscreen use offers tab adoption and permanent dismissal is honored', async () => {
    const { context, service, storage } = loadLaunchService();
    const manual = '?view=expanded&source=manual';

    assert.equal(await service.promptForOpen(manual), null);
    assert.equal(await service.promptForOpen(manual), null);
    assert.equal(await service.promptForOpen(manual), service.PROMPTS.ADOPT_TAB);
    await service.resolvePrompt(service.PROMPTS.ADOPT_TAB, true);
    assert.equal(await service.promptForOpen(manual), null);
    assert.equal(await service.promptForOpen('?view=expanded&source=saved-preference'), null);

    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_EXPAND_USE_COUNT], 0);
    assert.equal(storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_EXPAND_PROMPT_SUPPRESSED], true);
});

test('toolbar mode switches between popup and direct tab without an intermediate overlay', async () => {
    const { service, popups, tabs } = loadLaunchService();

    await service.applyToolbarMode('overlay');
    await service.applyToolbarMode('tab');
    await service.openExpanded('saved-preference');

    assert.deepEqual(popups, [
        { popup: 'global-dashboard.html' },
        { popup: '' }
    ]);
    assert.equal(tabs.length, 1);
    assert.equal(
        tabs[0].url,
        'moz-extension://test/global-dashboard.html?view=expanded&source=saved-preference'
    );
});

test('dashboard launch focuses an existing tab and its Thunderbird window', async () => {
    const existingTabs = [{
        id: 42,
        windowId: 8,
        url: 'moz-extension://test/global-dashboard.html?view=expanded&source=manual'
    }];
    const { service, tabs, tabUpdates, windowUpdates } = loadLaunchService({}, { existingTabs });

    const focused = await service.openExpanded('saved-preference');

    assert.equal(focused.id, 42);
    assert.equal(tabs.length, 0);
    assert.deepEqual(tabUpdates, [[42, { active: true }]]);
    assert.deepEqual(windowUpdates, [[8, { focused: true }]]);
});

test('stale dashboard detection safely falls back to a new tab', async () => {
    const existingTabs = [{
        id: 42,
        windowId: 8,
        url: 'moz-extension://test/global-dashboard.html?view=expanded'
    }];
    const { service, tabs } = loadLaunchService({}, {
        existingTabs,
        updateTab: async () => {
            throw new Error('Tab closed during focus');
        }
    });

    const opened = await service.openExpanded('saved-preference');

    assert.equal(opened.id, 99);
    assert.equal(tabs.length, 1);
});

test('concurrent dashboard launches share one create request', async () => {
    let resolveCreate;
    let createCount = 0;
    const createTab = details => {
        createCount += 1;
        return new Promise(resolve => {
            resolveCreate = () => resolve({ id: 77, ...details });
        });
    };
    const { service } = loadLaunchService({}, { createTab });

    const first = service.openExpanded('saved-preference');
    const second = service.openExpanded('saved-preference');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(createCount, 1);
    resolveCreate();

    assert.equal((await first).id, 77);
    assert.equal((await second).id, 77);
});
