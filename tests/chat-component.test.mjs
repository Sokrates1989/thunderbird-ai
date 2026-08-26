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

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }

    focus() {
        this.focusCount += 1;
    }
}

function loadChatComponent(sendToBackground = async () => ({
    success: true,
    data: { content: 'Antwort' }
})) {
    const intervalCallbacks = new Map();
    let nextIntervalId = 1;
    const context = createContext({
        clearInterval: intervalId => intervalCallbacks.delete(intervalId),
        document: { createElement: () => new TestElement() },
        MarkdownRenderer: {
            renderInto(element, content) {
                element.replaceChildren();
                element.textContent = content;
            }
        },
        setInterval: callback => {
            const intervalId = nextIntervalId;
            nextIntervalId += 1;
            intervalCallbacks.set(intervalId, callback);
            return intervalId;
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/ChatComponent.js');
    context.I18n.language = 'de';
    const manager = { emailId: 42, sendToBackground };
    const component = new context.ChatComponent(manager);
    component.elements = {
        overlay: new TestElement(),
        input: new TestElement(),
        messages: new TestElement(),
        send: new TestElement(),
        restart: new TestElement()
    };
    return { component, intervalCallbacks };
}

test('Enter sends chat while Shift+Enter and IME composition retain text editing', () => {
    const { component } = loadChatComponent();
    let sends = 0;
    component.send = () => { sends += 1; };
    let prevented = 0;
    const event = overrides => ({
        key: 'Enter',
        shiftKey: false,
        isComposing: false,
        preventDefault: () => { prevented += 1; },
        ...overrides
    });

    component.handleInputKeydown(event({}));
    component.handleInputKeydown(event({ shiftKey: true }));
    component.handleInputKeydown(event({ isComposing: true }));
    component.handleInputKeydown(event({ key: 'a' }));

    assert.equal(sends, 1);
    assert.equal(prevented, 1);
});

test('pending assistant bubble animates in place and becomes the Markdown answer', async () => {
    let resolveResponse;
    const response = new Promise(resolve => { resolveResponse = resolve; });
    const { component, intervalCallbacks } = loadChatComponent(async () => response);
    component.elements.input.value = 'Warum geht es in dieser E-Mail?';

    const sending = component.send();
    assert.equal(component.elements.messages.children.length, 2);
    assert.equal(component.elements.input.disabled, true);
    assert.equal(component.elements.send.disabled, true);
    assert.equal(component.elements.restart.disabled, true);

    const [userRow, assistantRow] = component.elements.messages.children;
    assert.match(userRow.className, /user/u);
    assert.equal(userRow.children[0].textContent, '👤');
    assert.equal(userRow.children[0].attributes['aria-label'], 'Ihre Nachricht');
    assert.equal(userRow.children[1].textContent, 'Warum geht es in dieser E-Mail?');
    assert.match(assistantRow.className, /pending/u);
    assert.equal(assistantRow.children[0].textContent, '🤖');
    assert.equal(
        assistantRow.children[0].attributes['aria-label'],
        'Der AI-Assistent bereitet eine Antwort vor'
    );
    const progress = assistantRow.children[1].children[0];
    assert.equal(progress.textContent, '.');

    const [advanceProgress] = intervalCallbacks.values();
    advanceProgress();
    assert.equal(progress.textContent, '..');
    advanceProgress();
    assert.equal(progress.textContent, '...');
    advanceProgress();
    assert.equal(progress.textContent, '....');
    advanceProgress();
    assert.equal(progress.textContent, '.');

    resolveResponse({ success: true, data: { content: '**Antwort**' } });
    await sending;

    assert.equal(component.elements.messages.children.length, 2);
    assert.equal(assistantRow.children[1].textContent, '**Antwort**');
    assert.match(assistantRow.children[1].className, /markdown-content/u);
    assert.equal(
        assistantRow.children[0].attributes['aria-label'],
        'Nachricht des AI-Assistenten'
    );
    assert.equal(component.elements.input.disabled, false);
    assert.equal(component.elements.send.disabled, false);
    assert.equal(component.elements.restart.disabled, false);
    assert.equal(intervalCallbacks.size, 0);
    assert.deepEqual(Array.from(component.history, entry => ({ ...entry })), [
        { role: 'user', content: 'Warum geht es in dieser E-Mail?' },
        { role: 'assistant', content: '**Antwort**' }
    ]);
});

test('reopening preserves chat until a confirmed restart clears the conversation', () => {
    const { component } = loadChatComponent();
    component.history = [
        { role: 'user', content: 'Was ist offen?' },
        { role: 'assistant', content: 'Drei Entscheidungen.' }
    ];
    component.appendMessage('user', 'Was ist offen?');
    component.appendMessage('assistant', 'Drei Entscheidungen.');
    component.elements.input.value = 'Nicht gesendeter Entwurf';
    const confirmations = [];
    let confirmed = false;
    component.confirm = message => {
        confirmations.push(message);
        return confirmed;
    };

    component.close();
    component.open();

    assert.equal(component.elements.overlay.hidden, false);
    assert.equal(component.history.length, 2);
    assert.equal(component.elements.messages.children.length, 2);

    component.restartChat();

    assert.equal(component.history.length, 2);
    assert.equal(component.elements.messages.children.length, 2);
    assert.equal(component.elements.input.value, 'Nicht gesendeter Entwurf');

    confirmed = true;
    component.restartChat();

    assert.equal(confirmations.length, 2);
    assert.equal(confirmations[0], 'Möchten Sie einen neuen Chat beginnen? Der bisherige Chatverlauf wird gelöscht.');
    assert.equal(component.history.length, 0);
    assert.equal(component.elements.messages.children.length, 0);
    assert.equal(component.elements.input.value, '');
    assert.equal(component.elements.restart.disabled, true);
    assert.equal(component.elements.input.focusCount, 2);
});

test('chat opens in an expanded tab and keeps a responsive roomy bubble layout', () => {
    const managerSource = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/SingleMailManager.js'),
        'utf8'
    );
    const componentSource = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/components/single-mail/ChatComponent.js'),
        'utf8'
    );
    const styles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/single-mail-ui.css'),
        'utf8'
    );

    assert.match(
        managerSource,
        /SingleMailWorkspaceService\.openExpanded\(\s*this\.emailId,\s*'chat'/u
    );
    assert.match(componentSource, /className = 'chat-avatar'/u);
    assert.match(componentSource, /className = 'chat-progress'/u);
    assert.match(componentSource, /class="chat-restart"/u);
    assert.match(styles, /\.chat-dialog\s*\{[^}]*width:\s*min\(760px, 100%\)/su);
    assert.match(styles, /\.chat-header-actions\s*\{[^}]*display:\s*flex/su);
    assert.match(styles, /\.chat-message-row\.user\s*\{[^}]*row-reverse/su);
    assert.match(styles, /@media \(max-width: 560px\), \(max-height: 520px\)/u);
});
