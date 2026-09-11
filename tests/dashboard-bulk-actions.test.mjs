import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function loadComponent(options = {}) {
    const globals = {
        I18n: { t: (key, replacements = {}) => `${key}:${JSON.stringify(replacements)}` },
        document: {
            createElement: tagName => element(tagName)
        }
    };
    if (options.IntersectionObserver) {
        globals.IntersectionObserver = options.IntersectionObserver;
    }
    const context = createContext(globals);
    loadScript(
        context,
        'thunderbird-ai/components/global-dashboard/DashboardBulkActionsComponent.js'
    );
    return context.DashboardBulkActionsComponent;
}

function element(tagName = 'div') {
    const listeners = new Map();
    return {
        tagName,
        children: [],
        attributes: {},
        hidden: false,
        append(...children) { this.children.push(...children); },
        appendChild(child) { this.children.push(child); },
        replaceChildren(...children) { this.children = children; },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, listener) { listeners.set(name, listener); },
        emit(name) { listeners.get(name)?.(); }
    };
}

function component(Component, { hosts = [], floatingHost = null, callback = () => {} } = {}) {
    return new Component({
        hosts,
        floatingHost,
        onToggleAll: callback,
        onAnalyze: callback,
        onRescore: callback,
        onMarkRead: callback,
        onArchive: callback,
        onTrash: callback
    });
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
    const hosts = [{ position: 'top' }, { position: 'bottom' }];
    const instance = component(Component, { hosts });
    const rendered = [];
    instance.renderInto = host => {
        rendered.push(host);
        return { host };
    };

    instance.initialize();

    assert.deepEqual(Array.from(rendered, host => host.position), ['top', 'bottom']);
    assert.deepEqual(
        Array.from(instance.instances, renderedInstance => renderedInstance.host.position),
        ['top', 'bottom']
    );
});

test('bulk component synchronizes selection and disabled state across both toolbars', () => {
    const Component = loadComponent();
    const instance = component(Component);
    instance.instances = [controls(), controls()];

    instance.update({ busy: false, total: 5, selected: 2 });

    for (const controlsInstance of instance.instances) {
        assert.equal(controlsInstance.selectAll.checked, false);
        assert.equal(controlsInstance.selectAll.indeterminate, true);
        assert.equal(controlsInstance.selectAll.disabled, false);
        assert.equal(
            controlsInstance.selectedCount.textContent,
            'dashboardSelectedCount:{"count":2}'
        );
        assert.equal(controlsInstance.archive.disabled, false);
    }

    instance.update({ busy: true, total: 5, selected: 5 });

    for (const controlsInstance of instance.instances) {
        assert.equal(controlsInstance.selectAll.checked, true);
        assert.equal(controlsInstance.selectAll.indeterminate, false);
        assert.equal(controlsInstance.selectAll.disabled, true);
        assert.equal(controlsInstance.analyze.disabled, true);
        assert.equal(controlsInstance.rescore.disabled, true);
        assert.equal(controlsInstance.markRead.disabled, true);
        assert.equal(controlsInstance.archive.disabled, true);
        assert.equal(controlsInstance.trash.disabled, true);
    }
});

test('floating controls reuse every bulk action icon, callback, and localized tooltip', () => {
    const Component = loadComponent();
    const calls = [];
    const host = element();
    const instance = component(Component, {
        floatingHost: host,
        callback: () => calls.push('called')
    });

    const floating = instance.renderFloatingInto(host);

    assert.equal(host.attributes.role, 'group');
    assert.equal(host.children.length, 6);
    for (const action of instance.actions) {
        const button = floating[action.name];
        assert.match(button.className, /dashboard-floating-bulk-action/u);
        assert.match(button.className, new RegExp(action.className, 'u'));
        assert.equal(button.attributes['aria-label'], `${action.textKey}:{}`);
        assert.equal(button.attributes['data-tooltip'], `${action.textKey}:{}`);
        assert.equal(button.children[0].textContent, action.iconText);
        button.emit('click');
    }
    assert.equal(calls.length, instance.actions.length);
});

test('floating controls appear only for a selection while both full toolbars are off screen', () => {
    const Component = loadComponent();
    const instance = component(Component, { floatingHost: element() });
    instance.instances = [controls(), controls()];
    instance.floatingControls = controls();
    instance.toolbarVisibility = new Map([
        ['top', true],
        ['bottom', false]
    ]);
    instance.selectedCount = 0;

    instance.update({ busy: false, total: 5, selected: 2 });
    assert.equal(instance.floatingHost.hidden, true);
    assert.equal(
        instance.floatingHost.attributes['aria-label'],
        'dashboardFloatingBulkActionsLabel:{"count":2}'
    );
    assert.equal(instance.floatingControls.archive.disabled, false);

    instance.toolbarVisibility.set('top', false);
    instance.updateFloatingVisibility();
    assert.equal(instance.floatingHost.hidden, false);

    instance.update({ busy: true, total: 5, selected: 2 });
    assert.equal(instance.floatingHost.hidden, false);
    assert.equal(instance.floatingControls.analyze.disabled, true);
    assert.equal(instance.floatingControls.trash.disabled, true);

    instance.update({ busy: false, total: 5, selected: 0 });
    assert.equal(instance.floatingHost.hidden, true);
});

test('toolbar intersection changes drive floating visibility and observer cleanup', () => {
    let observer;
    class TestIntersectionObserver {
        constructor(callback) {
            this.callback = callback;
            this.observed = [];
            this.disconnected = false;
            observer = this;
        }

        observe(target) { this.observed.push(target); }
        disconnect() { this.disconnected = true; }
    }
    const Component = loadComponent({ IntersectionObserver: TestIntersectionObserver });
    const floatingHost = element();
    const instance = component(Component, {
        hosts: [element(), element()],
        floatingHost
    });

    instance.initialize();
    instance.update({ busy: false, total: 3, selected: 1 });
    assert.equal(observer.observed.length, 2);
    assert.equal(floatingHost.hidden, true);

    observer.callback(observer.observed.map(target => ({ target, isIntersecting: false })));
    assert.equal(floatingHost.hidden, false);

    observer.callback([{ target: observer.observed[1], isIntersecting: true }]);
    assert.equal(floatingHost.hidden, true);

    instance.destroy();
    assert.equal(observer.disconnected, true);
});
