import assert from 'node:assert/strict';
import test from 'node:test';

import { createContext, loadScript } from '../test-support/load-script.mjs';

function eventTarget(scrollTop = 0) {
    const listeners = new Map();
    return {
        scrollTop,
        scrollCalls: [],
        addEventListener(type, listener) { listeners.set(type, listener); },
        removeEventListener(type, listener) {
            if (listeners.get(type) === listener) {
                listeners.delete(type);
            }
        },
        emit(type) { listeners.get(type)?.(); },
        hasListener(type) { return listeners.has(type); },
        scrollTo(options) { this.scrollCalls.push(options); }
    };
}

function loadComponent({ reduceMotion = false } = {}) {
    const context = createContext({
        document: {
            scrollingElement: { scrollTop: 0 },
            documentElement: { scrollTop: 0 }
        }
    });
    const windowTarget = context;
    Object.assign(windowTarget, eventTarget());
    windowTarget.scrollY = 0;
    windowTarget.matchMedia = () => ({ matches: reduceMotion });
    loadScript(context, 'thunderbird-ai/components/shared/ScrollToTopComponent.js');
    return { Component: context.ScrollToTopComponent, windowTarget };
}

test('scroll-to-top observes multiple surfaces and scrolls all of them', () => {
    const { Component, windowTarget } = loadComponent();
    const accountList = eventTarget();
    const button = eventTarget();
    button.hidden = false;
    const component = new Component({
        button,
        scrollTargets: [windowTarget, accountList]
    });

    component.initialize();
    assert.equal(button.hidden, true);

    accountList.scrollTop = 25;
    accountList.emit('scroll');
    assert.equal(button.hidden, false);

    button.emit('click');
    assert.equal(windowTarget.scrollCalls.length, 1);
    assert.equal(windowTarget.scrollCalls[0].top, 0);
    assert.equal(windowTarget.scrollCalls[0].behavior, 'smooth');
    assert.equal(accountList.scrollCalls.length, 1);
    assert.equal(accountList.scrollCalls[0].top, 0);
    assert.equal(accountList.scrollCalls[0].behavior, 'smooth');

    component.destroy();
    assert.equal(button.hasListener('click'), false);
    assert.equal(accountList.hasListener('scroll'), false);
});

test('scroll-to-top respects reduced-motion preferences', () => {
    const { Component, windowTarget } = loadComponent({ reduceMotion: true });
    const button = eventTarget();
    const component = new Component({ button, scrollTargets: [windowTarget] });

    component.initialize();
    button.emit('click');

    assert.equal(windowTarget.scrollCalls.length, 1);
    assert.equal(windowTarget.scrollCalls[0].top, 0);
    assert.equal(windowTarget.scrollCalls[0].behavior, 'auto');
});
