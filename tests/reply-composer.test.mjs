import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function interactiveElement(value = '') {
    return {
        disabled: false,
        focus() {},
        value
    };
}

function messageList() {
    return {
        children: [],
        scrollHeight: 0,
        scrollTop: 0,
        appendChild(message) {
            this.children.push(message);
            this.scrollHeight = this.children.length;
        },
        replaceChildren() {
            this.children = [];
        }
    };
}

function replyComponentElements(draft) {
    return {
        overlay: { hidden: false },
        draft: interactiveElement(draft),
        instruction: interactiveElement(),
        refine: interactiveElement(),
        prepare: interactiveElement(),
        copy: interactiveElement(),
        messages: messageList(),
        status: { dataset: {}, textContent: '' }
    };
}

function loadReplyUi({ beginReply, writeText }) {
    const statusUpdates = [];
    const logs = [];
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'de-DE' },
            compose: { beginReply }
        },
        document: {
            createElement: () => ({
                className: '',
                textContent: '',
                setAttribute() {}
            })
        },
        navigator: { clipboard: { writeText } }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/QuickActionsComponent.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/ReplyComposerComponent.js');
    const manager = {
        emailId: 42,
        elements: { quickActionsGrid: {} },
        log: (message, level) => logs.push({ message, level }),
        showError() {},
        updateStatus: (message, level) => statusUpdates.push({ message, level })
    };
    return { context, logs, manager, statusUpdates };
}

test('German and English UI catalogs expose the same keys', () => {
    const { context } = loadReplyUi({
        beginReply: async () => {},
        writeText: async () => {}
    });

    const germanKeys = Object.keys(context.LOCALE_MESSAGES.de).sort();
    const englishKeys = Object.keys(context.LOCALE_MESSAGES.en).sort();

    assert.deepEqual(germanKeys, englishKeys);
    for (const key of germanKeys) {
        const germanPlaceholders = [...context.LOCALE_MESSAGES.de[key].matchAll(/\{([^}]+)\}/gu)]
            .map(match => match[1]).sort();
        const englishPlaceholders = [...context.LOCALE_MESSAGES.en[key].matchAll(/\{([^}]+)\}/gu)]
            .map(match => match[1]).sort();
        assert.deepEqual(germanPlaceholders, englishPlaceholders, key);
    }
});

test('explicit language selection changes text and every static page key resolves', () => {
    const { context } = loadReplyUi({
        beginReply: async () => {},
        writeText: async () => {}
    });
    context.I18n.language = 'de';
    assert.equal(context.I18n.t('close'), 'Schließen');
    context.I18n.language = 'en';
    assert.equal(context.I18n.t('close'), 'Close');

    const pages = ['settings.html', 'single-mail-ui.html', 'help.html']
        .map(file => fs.readFileSync(path.join(repositoryRoot, 'thunderbird-ai/pages', file), 'utf8'))
        .join('\n');
    const keys = [...pages.matchAll(/data-i18n(?:-placeholder|-title|-aria-label)?="([A-Za-z0-9_]+)"/gu)]
        .map(match => match[1]);
    for (const key of keys) {
        assert.ok(context.LOCALE_MESSAGES.de[key], `missing German key ${key}`);
        assert.ok(context.LOCALE_MESSAGES.en[key], `missing English key ${key}`);
    }

    const defaults = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/install-defaults.json'),
        'utf8'
    ));
    assert.deepEqual(defaults, { language: 'auto', version: '1.3.0' });
});

test('Thunderbird manifest localization has German and English key parity', () => {
    const manifest = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/manifest.json'),
        'utf8'
    ));
    const german = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/_locales/de/messages.json'),
        'utf8'
    ));
    const english = JSON.parse(fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/_locales/en/messages.json'),
        'utf8'
    ));

    assert.deepEqual(Object.keys(german).sort(), Object.keys(english).sort());
    const manifestText = JSON.stringify(manifest);
    const referencedKeys = [...manifestText.matchAll(/__MSG_([A-Za-z0-9_]+)__/gu)]
        .map(match => match[1]);
    for (const key of referencedKeys) {
        assert.ok(german[key]?.message, `missing German manifest key ${key}`);
        assert.ok(english[key]?.message, `missing English manifest key ${key}`);
    }
});

test('suggest reply quick action opens the dedicated reply composer', async () => {
    const { context, manager } = loadReplyUi({
        beginReply: async () => {},
        writeText: async () => {}
    });
    let composerOpened = 0;
    manager.openReplyComposer = async () => {
        composerOpened += 1;
    };
    manager.executeAIAction = async () => {
        throw new Error('generic result route must not be used');
    };

    const component = new context.QuickActionsComponent(manager);
    await component.executeAction('SUGGEST_REPLY');

    assert.equal(composerOpened, 1);
});

test('reply workspace loads an initial proposal and refines the edited draft', async () => {
    const requests = [];
    const { context, manager } = loadReplyUi({
        beginReply: async () => {},
        writeText: async () => {}
    });
    manager.sendToBackground = async (action, data) => {
        requests.push({ action, data });
        return {
            success: true,
            data: {
                content: requests.length === 1
                    ? 'Erster Antwortvorschlag'
                    : 'Kürzerer Antwortvorschlag'
            }
        };
    };
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('');

    await component.open();
    component.elements.draft.value = 'Manuell bearbeiteter Entwurf';
    component.elements.instruction.value = 'Bitte kürzer.';
    await component.refine();

    assert.equal(requests[0].action, context.CONFIG.ACTIONS.REPLY);
    assert.equal(requests[1].action, context.CONFIG.ACTIONS.REFINE_REPLY);
    assert.equal(requests[1].data.currentDraft, 'Manuell bearbeiteter Entwurf');
    assert.equal(requests[1].data.instruction, 'Bitte kürzer.');
    assert.equal(component.elements.draft.value, 'Kürzerer Antwortvorschlag');
    assert.equal(component.elements.messages.children.length, 3);
});

test('compose failure copies the edited draft and keeps it visible', async () => {
    const composeCalls = [];
    const clipboardWrites = [];
    const { context, manager, statusUpdates } = loadReplyUi({
        beginReply: async (...args) => {
            composeCalls.push(args);
            throw new Error('compose unavailable');
        },
        writeText: async value => clipboardWrites.push(value)
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Bearbeiteter Antworttext');

    await component.prepare();

    assert.equal(composeCalls.length, 1);
    assert.equal(composeCalls[0][0], 42);
    assert.equal(composeCalls[0][1], 'replyToSender');
    assert.equal(composeCalls[0][2].plainTextBody, 'Bearbeiteter Antworttext');
    assert.deepEqual(clipboardWrites, ['Bearbeiteter Antworttext']);
    assert.match(component.elements.status.textContent, /Zwischenablage/u);
    assert.equal(component.elements.overlay.hidden, false);
    assert.equal(statusUpdates.at(-1).level, 'warning');
});

test('successful hand-off opens a native reply and closes the editor', async () => {
    const composeCalls = [];
    const clipboardWrites = [];
    const { context, manager, statusUpdates } = loadReplyUi({
        beginReply: async (...args) => composeCalls.push(args),
        writeText: async value => clipboardWrites.push(value)
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Sendefertiger Antworttext');

    await component.prepare();

    assert.equal(composeCalls.length, 1);
    assert.equal(composeCalls[0][2].plainTextBody, 'Sendefertiger Antworttext');
    assert.deepEqual(clipboardWrites, []);
    assert.equal(component.elements.overlay.hidden, true);
    assert.equal(statusUpdates.at(-1).level, 'success');
});
