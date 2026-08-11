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
        includeOriginal: { checked: true, disabled: false },
        replyToAll: { checked: true, disabled: false },
        includeAttachments: { checked: false, disabled: false },
        messages: messageList(),
        status: { dataset: {}, textContent: '' }
    };
}

function loadReplyUi({
    addAttachment = async () => {},
    beginReply = async () => ({ id: 7 }),
    getAttachmentFile = async (_messageId, partName) => ({ name: partName }),
    getComposeDetails = async () => ({ isPlainText: true, plainTextBody: '> Original' }),
    listAttachments = async () => [],
    setComposeDetails = async () => {},
    stored = {},
    writeText = async () => {}
} = {}) {
    const statusUpdates = [];
    const logs = [];
    const storageState = { ...stored };
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'de-DE' },
            compose: { addAttachment, beginReply, getComposeDetails, setComposeDetails },
            messages: { getAttachmentFile, listAttachments },
            storage: {
                local: {
                    get: async keys => Object.fromEntries(
                        keys.filter(key => Object.hasOwn(storageState, key))
                            .map(key => [key, storageState[key]])
                    ),
                    set: async values => Object.assign(storageState, values)
                }
            }
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
    loadScript(context, 'common/utils/storage.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/QuickActionsComponent.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/ReplyPreparationService.js');
    loadScript(context, 'thunderbird-ai/components/single-mail/ReplyComposerComponent.js');
    const manager = {
        emailId: 42,
        elements: { quickActionsGrid: {} },
        log: (message, level) => logs.push({ message, level }),
        showError() {},
        updateStatus: (message, level) => statusUpdates.push({ message, level })
    };
    return { context, logs, manager, statusUpdates, storageState };
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

    const pages = ['settings.html', 'single-mail-ui.html', 'help.html', 'global-dashboard.html']
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
    assert.deepEqual(defaults, { language: 'auto', version: '2.6.0' });
});

test('reply composer keeps final actions outside its scrolling content', () => {
    const componentSource = fs.readFileSync(
        path.join(
            repositoryRoot,
            'thunderbird-ai/components/single-mail/ReplyComposerComponent.js'
        ),
        'utf8'
    );
    const styles = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/styles/reply-composer.css'),
        'utf8'
    );

    assert.match(
        componentSource,
        /class="reply-composer-scroll">[\s\S]*<\/div>\s*<div class="reply-composer-actions">/u
    );
    assert.match(styles, /\.reply-composer-scroll\s*\{[\s\S]*?flex:\s*1 1 auto;/u);
    assert.match(styles, /\.reply-composer-scroll\s*\{[\s\S]*?overflow-y:\s*auto;/u);
    assert.match(styles, /\.reply-composer-actions\s*\{[\s\S]*?flex:\s*0 0 auto;/u);
    assert.match(styles, /\.reply-composer-dialog\s*\{[\s\S]*?overflow:\s*hidden;/u);
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

test('single-mail quick actions replace categorization, importance, and API test with scoring', async () => {
    const { context, manager } = loadReplyUi({
        beginReply: async () => {},
        writeText: async () => {}
    });
    let scoringOpened = 0;
    manager.scoreCurrentEmail = async () => { scoringOpened += 1; };
    const component = new context.QuickActionsComponent(manager);

    assert.deepEqual(Array.from(component.actions, action => action.id), [
        'summarizeBtn',
        'replyBtn',
        'chatBtn',
        'scoreBtn'
    ]);
    await component.executeAction('SCORE');
    assert.equal(scoringOpened, 1);
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
    assert.equal(composeCalls[0][1], 'replyToAll');
    assert.equal(composeCalls[0].length, 2);
    assert.deepEqual(clipboardWrites, ['Bearbeiteter Antworttext']);
    assert.match(component.elements.status.textContent, /Zwischenablage/u);
    assert.equal(component.elements.overlay.hidden, false);
    assert.equal(statusUpdates.at(-1).level, 'warning');
});

test('successful hand-off opens a native reply and closes the editor', async () => {
    const composeCalls = [];
    const composeUpdates = [];
    const clipboardWrites = [];
    const { context, manager, statusUpdates } = loadReplyUi({
        beginReply: async (...args) => {
            composeCalls.push(args);
            return { id: 17 };
        },
        getComposeDetails: async () => ({
            isPlainText: true,
            plainTextBody: '> Zitierte ursprüngliche Nachricht'
        }),
        setComposeDetails: async (...args) => composeUpdates.push(args),
        writeText: async value => clipboardWrites.push(value)
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Sendefertiger Antworttext');

    await component.prepare();

    assert.equal(composeCalls.length, 1);
    assert.equal(composeCalls[0][1], 'replyToAll');
    assert.equal(composeUpdates.length, 1);
    assert.equal(composeUpdates[0][0], 17);
    assert.equal(
        composeUpdates[0][1].plainTextBody,
        'Sendefertiger Antworttext\n\n> Zitierte ursprüngliche Nachricht'
    );
    assert.deepEqual(clipboardWrites, []);
    assert.equal(component.elements.overlay.hidden, true);
    assert.equal(statusUpdates.at(-1).level, 'success');
});

test('HTML replies escape the AI draft and preserve Thunderbird native content', async () => {
    const composeUpdates = [];
    const { context, manager } = loadReplyUi({
        getComposeDetails: async () => ({
            isPlainText: false,
            body: '<blockquote>Original &amp; signature</blockquote>'
        }),
        setComposeDetails: async (...args) => composeUpdates.push(args)
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Hallo <Team>\nDanke & bis bald.');

    await component.prepare();

    assert.equal(
        composeUpdates[0][1].body,
        '<div>Hallo &lt;Team&gt;<br>Danke &amp; bis bald.</div><br><blockquote>Original &amp; signature</blockquote>'
    );
});

test('reply options persist and become the defaults for the next session', async () => {
    const { context, manager, storageState } = loadReplyUi({
        stored: {
            replyIncludeOriginal: false,
            replyToAll: false,
            replyIncludeAttachments: true
        }
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Antwort');

    await component.loadReplyPreferences();
    assert.equal(component.elements.includeOriginal.checked, false);
    assert.equal(component.elements.replyToAll.checked, false);
    assert.equal(component.elements.includeAttachments.checked, true);

    component.elements.includeOriginal.checked = true;
    component.elements.replyToAll.checked = true;
    component.elements.includeAttachments.checked = false;
    await component.saveReplyPreferences();

    assert.equal(storageState.replyIncludeOriginal, true);
    assert.equal(storageState.replyToAll, true);
    assert.equal(storageState.replyIncludeAttachments, false);
});

test('sender-only reply can omit the quote and reattach every source attachment', async () => {
    const composeCalls = [];
    const composeUpdates = [];
    const attachmentAdds = [];
    const sourceAttachments = [
        { name: 'invoice.pdf', partName: '1.2' },
        { name: 'photo.jpg', partName: '1.3' }
    ];
    const { context, manager } = loadReplyUi({
        beginReply: async (...args) => {
            composeCalls.push(args);
            return { id: 23 };
        },
        getComposeDetails: async () => ({
            isPlainText: true,
            plainTextBody: '> Must not be retained'
        }),
        setComposeDetails: async (...args) => composeUpdates.push(args),
        listAttachments: async () => sourceAttachments,
        getAttachmentFile: async (_messageId, partName) => ({ name: `${partName}.bin` }),
        addAttachment: async (...args) => attachmentAdds.push(args)
    });
    const component = new context.ReplyComposerComponent(manager);
    component.elements = replyComponentElements('Nur die neue Antwort');
    component.elements.includeOriginal.checked = false;
    component.elements.replyToAll.checked = false;
    component.elements.includeAttachments.checked = true;

    await component.prepare();

    assert.equal(composeCalls[0][1], 'replyToSender');
    assert.equal(composeCalls[0][2].plainTextBody, 'Nur die neue Antwort');
    assert.equal(composeUpdates.length, 0);
    assert.equal(attachmentAdds.length, 2);
    assert.equal(attachmentAdds[0][0], 23);
    assert.equal(attachmentAdds[0][1].file.name, '1.2.bin');
    assert.equal(attachmentAdds[0][1].name, 'invoice.pdf');
    assert.equal(attachmentAdds[1][0], 23);
    assert.equal(attachmentAdds[1][1].file.name, '1.3.bin');
    assert.equal(attachmentAdds[1][1].name, 'photo.jpg');
});
