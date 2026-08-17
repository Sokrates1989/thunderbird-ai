import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadLaunchService(initial = {}) {
    const storage = { ...initial };
    const popups = [];
    const tabs = [];
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
            tabs: { create: async details => tabs.push({ ...details }) }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/DashboardLaunchService.js');
    return { context, service: context.DashboardLaunchService, storage, popups, tabs };
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
