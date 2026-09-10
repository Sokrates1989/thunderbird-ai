import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

class TestElement {
    constructor() {
        this.attributes = {};
        this.children = [];
        this.disabled = false;
        this.focusCount = 0;
        this.hidden = false;
        this.listeners = new Map();
        this.scrollTop = 0;
        this.value = '';
        this._className = '';
        this._textContent = '';
        this.classList = {
            add: (...names) => {
                const classes = new Set(this._className.split(/\s+/u).filter(Boolean));
                for (const name of names) {
                    classes.add(name);
                }
                this._className = [...classes].join(' ');
            }
        };
    }

    get className() {
        return this._className;
    }

    set className(value) {
        this._className = String(value || '');
    }

    get scrollHeight() {
        return this.children.length;
    }

    get textContent() {
        return this._textContent;
    }

    set textContent(value) {
        this._textContent = String(value || '');
        this.children = [];
    }

    addEventListener(name, listener) {
        this.listeners.set(name, listener);
    }

    removeEventListener(name) {
        this.listeners.delete(name);
    }

    append(...children) {
        this.children.push(...children);
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    replaceChildren(...children) {
        this.children = [...children];
        this._textContent = '';
    }

    querySelector(selector) {
        if (!selector.startsWith('.')) {
            return null;
        }
        const className = selector.slice(1);
        return this.children.find(child => child.className.split(/\s+/u).includes(className)) || null;
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    focus() {
        this.focusCount += 1;
    }
}

function createPaneManager(sendRuntimeMessage = async () => ({
    success: true,
    data: { content: 'Assistant answer' }
})) {
    const elements = new Map([
        ['assistantPaneContext', new TestElement()],
        ['assistantPaneEmpty', new TestElement()],
        ['assistantPaneMessages', new TestElement()],
        ['assistantPaneRestart', new TestElement()],
        ['assistantPaneClose', new TestElement()],
        ['assistantPaneSummarize', new TestElement()],
        ['assistantPaneInput', new TestElement()],
        ['assistantPaneSend', new TestElement()]
    ]);
    const context = createContext({
        document: {
            createElement: () => new TestElement(),
            getElementById: id => elements.get(id)
        },
        MarkdownRenderer: {
            renderInto(element, content) {
                element.textContent = content;
            }
        },
        RetryService: { sendRuntimeMessage }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'prototypes/assistant-pane/assistant-pane.js');
    context.I18n.language = 'en';
    return {
        context,
        elements,
        manager: new context.AssistantPaneManager()
    };
}

test('prototype stays out of the production manifest and builder injects its boundary', () => {
    const manifest = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/manifest.json'),
        'utf8'
    ));
    const builder = fs.readFileSync(
        path.join(repositoryRoot, 'build-assistant-pane-prototype.ps1'),
        'utf8'
    );

    assert.equal(manifest.experiment_apis, undefined);
    assert.doesNotMatch(manifest.background.scripts.join(','), /assistant-pane/u);
    assert.match(builder, /assistant-pane-bootstrap\.js/u);
    assert.match(builder, /experiment_apis/u);
    assert.match(builder, /assistant-pane-schema\.json/u);
    assert.match(builder, /thunderbird-ai-pane-prototype@felicitas-wisdom\.com/u);
    assert.match(builder, /Temporary add-on directory/u);

    const privilegedApi = fs.readFileSync(
        path.join(repositoryRoot, 'prototypes/assistant-pane/assistant-pane-api.js'),
        'utf8'
    );
    assert.doesNotMatch(privilegedApi, /Services\.sys\.mjs/u);
});

test('prototype UI strings exist in both runtime and manifest locale catalogs', () => {
    const context = createContext();
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    const requiredRuntimeKeys = [
        'assistantPaneNoEmail',
        'assistantPaneContext',
        'assistantPaneEmptyTitle',
        'assistantPaneEmptyHint',
        'assistantPaneSummarize',
        'assistantPaneSummaryPrompt'
    ];
    for (const key of requiredRuntimeKeys) {
        context.I18n.language = 'en';
        assert.notEqual(context.I18n.t(key), key);
        context.I18n.language = 'de';
        assert.notEqual(context.I18n.t(key), key);
    }

    for (const language of ['en', 'de']) {
        const messages = JSON.parse(fs.readFileSync(
            path.join(repositoryRoot, 'thunderbird-ai', '_locales', language, 'messages.json'),
            'utf8'
        ));
        assert.equal(typeof messages.assistantPaneButtonTitle.message, 'string');
        assert.equal(typeof messages.assistantPaneResizeTitle.message, 'string');
    }
});

test('pane keeps conversations scoped to the displayed email and uses the chat route', async () => {
    const requests = [];
    const { elements, manager } = createPaneManager(async request => {
        requests.push(request);
        return { success: true, data: { content: `Answer for ${request.messageId}` } };
    });

    manager.selectDisplayedMessages([{ id: 41, subject: 'First message' }]);
    elements.get('assistantPaneInput').value = 'What matters?';
    await manager.sendFromInput();

    assert.equal(requests.length, 1);
    assert.equal(requests[0].action, 'processChatQuery');
    assert.equal(requests[0].messageId, 41);
    assert.equal(requests[0].query, 'What matters?');
    assert.equal(requests[0].history.length, 0);
    assert.equal(manager.conversationFor(41).length, 2);

    manager.selectDisplayedMessages([{ id: 72, subject: 'Second message' }]);
    assert.equal(manager.conversationFor(72).length, 0);
    assert.equal(elements.get('assistantPaneMessages').children.length, 0);

    manager.selectDisplayedMessages([{ id: 41, subject: 'First message' }]);
    assert.equal(elements.get('assistantPaneMessages').children.length, 2);
    assert.match(elements.get('assistantPaneContext').textContent, /First message/u);
});

test('an in-flight answer remains attached to the originating email', async () => {
    let resolveRequest;
    const response = new Promise(resolve => { resolveRequest = resolve; });
    const { manager } = createPaneManager(async () => response);

    manager.selectDisplayedMessages([{ id: 41, subject: 'First message' }]);
    const sending = manager.sendQuestion('Summarize it');
    manager.selectDisplayedMessages([{ id: 72, subject: 'Second message' }]);
    resolveRequest({ success: true, data: { content: 'First answer' } });
    await sending;

    assert.equal(manager.currentMessageId, 72);
    assert.equal(manager.conversationFor(41)[1].content, 'First answer');
    assert.equal(manager.conversationFor(72).length, 0);
});
