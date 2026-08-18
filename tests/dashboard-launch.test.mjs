import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadLaunchService(initial = {}, options = {}) {
    const storage = { ...initial };
    const popups = [];
    const tabs = [];
    const tabUpdates = [];
    const removedTabs = [];
    const windowUpdates = [];
    const availableTabs = (options.existingTabs || []).map(tab => ({ ...tab }));
    const context = createContext({
        browser: {
            action: { setPopup: async details => popups.push({ ...details }) },
            runtime: {
                getURL: value => `moz-extension://test/${value}`
            },
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
                query: options.queryTabs || (async () => availableTabs.map(tab => ({ ...tab }))),
                remove: options.removeTabs || (async tabIds => {
                    const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
                    removedTabs.push(...ids);
                    for (const tabId of ids) {
                        const index = availableTabs.findIndex(tab => tab.id === tabId);
                        if (index >= 0) {
                            availableTabs.splice(index, 1);
                        }
                    }
                }),
                update: options.updateTab || (async (tabId, details) => {
                    tabUpdates.push([tabId, { ...details }]);
                    return { id: tabId, ...details };
                })
            },
            windows: {
                update: options.updateWindow || (async (windowId, details) => {
                    windowUpdates.push([windowId, { ...details }]);
                    return { id: windowId, ...details };
                })
            }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    Object.assign(context.CONFIG.UI, options.ui || {});
    loadScript(context, 'common/utils/retry.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(context, 'thunderbird-ai/components/shared/DashboardLaunchService.js');
    return {
        context,
        service: context.DashboardLaunchService,
        storage,
        popups,
        tabs,
        tabUpdates,
        removedTabs,
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

test('toolbar router clears legacy popup state before opening a direct tab', async () => {
    const { service, popups, tabs } = loadLaunchService();

    await service.prepareToolbarRouter();
    await service.openExpanded('saved-preference');

    assert.deepEqual(popups, [{ popup: '' }]);
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

test('first dashboard launch after an update closes prior dashboards and creates a clean tab', async () => {
    const existingTabs = [
        {
            id: 41,
            windowId: 8,
            url: 'moz-extension://test/global-dashboard.html?view=expanded&source=manual'
        },
        {
            id: 42,
            windowId: 8,
            url: 'moz-extension://test/global-dashboard.html'
        },
        { id: 7, windowId: 8, url: 'https://example.com/' }
    ];
    const { context, service, storage, tabs, tabUpdates, removedTabs } =
        loadLaunchService({}, { existingTabs });

    await service.markDashboardTabCleanupPending({ reason: 'update' });
    assert.equal(
        storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_TAB_CLEANUP_PENDING],
        true
    );

    const opened = await service.openExpanded('saved-preference');

    assert.equal(opened.id, 99);
    assert.deepEqual(removedTabs, [41, 42]);
    assert.equal(tabUpdates.length, 0);
    assert.equal(tabs.length, 1);
    assert.equal(
        storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_TAB_CLEANUP_PENDING],
        false
    );
});

test('failed post-update cleanup creates a fresh tab without focusing a stale dashboard', async () => {
    const initial = { dashboardTabCleanupPending: true };
    const existingTabs = [{
        id: 42,
        windowId: 8,
        url: 'moz-extension://test/global-dashboard.html?view=expanded'
    }];
    const { context, service, storage, tabs, tabUpdates } = loadLaunchService(initial, {
        existingTabs,
        removeTabs: async () => {
            throw new Error('Provider refused to remove stale dashboard');
        }
    });

    const opened = await service.openExpanded('saved-preference');

    assert.equal(opened.id, 99);
    assert.equal(tabs.length, 1);
    assert.equal(tabUpdates.length, 0);
    assert.equal(
        storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_TAB_CLEANUP_PENDING],
        true
    );
    assert.equal(
        storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC].fallbackCode,
        'DASHBOARD_LAUNCH_API_FAILED'
    );
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

test('a stalled tab creation times out, records diagnostics, and releases later clicks', async () => {
    let createCount = 0;
    const { context, service, storage } = loadLaunchService({}, {
        createTab: async details => {
            createCount += 1;
            if (createCount === 1) {
                return new Promise(() => {});
            }
            return { id: 88, windowId: 6, ...details };
        },
        ui: {
            DASHBOARD_LAUNCH_API_TIMEOUT_MS: 5,
            DASHBOARD_DIAGNOSTIC_TIMEOUT_MS: 20
        }
    });

    await assert.rejects(
        service.openExpanded('saved-preference'),
        error => error.code === 'DASHBOARD_LAUNCH_TIMEOUT' && error.stage === 'create-tab'
    );

    assert.equal(service.openInProgress, null);
    assert.equal(
        storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC].state,
        'timed-out'
    );
    assert.equal((await service.openExpanded('saved-preference')).id, 88);
    assert.equal(createCount, 2);
});

test('stalled best-effort window focus does not block repeated dashboard activation', async () => {
    const existingTabs = [{
        id: 42,
        windowId: 8,
        url: 'moz-extension://test/global-dashboard.html?view=expanded'
    }];
    const { context, service, storage, tabUpdates } = loadLaunchService({}, {
        existingTabs,
        updateWindow: async () => new Promise(() => {}),
        ui: {
            DASHBOARD_WINDOW_FOCUS_TIMEOUT_MS: 5,
            DASHBOARD_DIAGNOSTIC_TIMEOUT_MS: 20
        }
    });

    assert.equal((await service.openExpanded('saved-preference')).id, 42);
    assert.equal((await service.openExpanded('saved-preference')).id, 42);

    assert.equal(tabUpdates.length, 2);
    const diagnostic = storage[context.CONFIG.STORAGE_KEYS.DASHBOARD_LAUNCH_DIAGNOSTIC];
    assert.equal(diagnostic.state, 'focused');
    assert.equal(diagnostic.fallbackCode, 'DASHBOARD_LAUNCH_TIMEOUT');
});
