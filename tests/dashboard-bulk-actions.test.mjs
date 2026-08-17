import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadComponent() {
    const context = createContext({
        I18n: { t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}` }
    });
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardBulkActionsComponent.js'
    );
    return context.DashboardBulkActionsComponent;
}

function controls() {
    return {
        selectAll: { checked: false, indeterminate: false, disabled: false },
        selectedCount: { textContent: '' },
        analyze: { disabled: false },
        rescore: { disabled: false },
        markRead: { disabled: false },
        archive: { disabled: false },
        trash: { disabled: false }
    };
}

test('bulk component renders every configured host through one method', () => {
    const Component = loadComponent();
    const component = Object.create(Component.prototype);
    const hosts = [{ position: 'top' }, { position: 'bottom' }];
    const rendered = [];
    component.hosts = hosts;
    component.renderInto = host => {
        rendered.push(host);
        return { host };
    };

    component.initialize();

    assert.deepEqual(rendered, hosts);
    assert.deepEqual(component.instances.map(instance => instance.host), hosts);
});

test('bulk component synchronizes selection and disabled state across both toolbars', () => {
    const Component = loadComponent();
    const component = Object.create(Component.prototype);
    component.instances = [controls(), controls()];

    component.update({ busy: false, total: 5, selected: 2 });

    for (const instance of component.instances) {
        assert.equal(instance.selectAll.checked, false);
        assert.equal(instance.selectAll.indeterminate, true);
        assert.equal(instance.selectAll.disabled, false);
        assert.equal(instance.selectedCount.textContent, 'dashboardSelectedCount:{"count":2}');
        assert.equal(instance.archive.disabled, false);
    }

    component.update({ busy: true, total: 5, selected: 5 });

    for (const instance of component.instances) {
        assert.equal(instance.selectAll.checked, true);
        assert.equal(instance.selectAll.indeterminate, false);
        assert.equal(instance.selectAll.disabled, true);
        assert.equal(instance.analyze.disabled, true);
        assert.equal(instance.rescore.disabled, true);
        assert.equal(instance.markRead.disabled, true);
        assert.equal(instance.archive.disabled, true);
        assert.equal(instance.trash.disabled, true);
    }
});
