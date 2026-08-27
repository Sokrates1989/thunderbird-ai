import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.attributes = {};
        this.children = [];
        this.dataset = {};
        this.textContent = '';
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    replaceChildren(...children) {
        this.children = [...children];
        this.textContent = '';
    }

    setAttribute(name, value) {
        this.attributes[name] = String(value);
    }
}

function javascriptFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            return javascriptFiles(absolutePath);
        }
        return entry.isFile() && entry.name.endsWith('.js') ? [absolutePath] : [];
    });
}

test('safe DOM builder preserves dynamic values as literal text nodes', () => {
    const context = createContext({
        document: { createElement: tagName => new FakeElement(tagName) }
    });
    loadScript(context, 'thunderbird-ai/components/shared/SafeDom.js');

    const payload = '<img src=x onerror=alert(1)>';
    const element = context.SafeDom.create('button', {
        className: 'action',
        text: payload,
        attributes: { 'aria-label': payload },
        properties: { type: 'button' },
        dataset: { action: payload }
    });

    assert.equal(element.textContent, payload);
    assert.equal(element.children.length, 0);
    assert.equal(element.attributes['aria-label'], payload);
    assert.equal(element.dataset.action, payload);
    assert.equal(element.type, 'button');

    context.SafeDom.setIconLabel(element, '🔍', payload);
    assert.equal(element.children.length, 2);
    assert.equal(element.children[1].textContent, payload);
});

test('packaged JavaScript contains no HTML-parsing assignment sinks', () => {
    const sourceRoots = [
        path.join(repositoryRoot, 'thunderbird-ai'),
        path.join(repositoryRoot, 'common')
    ];
    for (const file of sourceRoots.flatMap(javascriptFiles)) {
        const source = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(source, /\.(?:innerHTML|outerHTML)\s*=/u, file);
        assert.doesNotMatch(source, /\.insertAdjacentHTML\s*\(/u, file);
    }
});

test('safe DOM helper loads before every component that uses it', () => {
    const settings = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/settings.html'),
        'utf8'
    );
    const singleMail = fs.readFileSync(
        path.join(repositoryRoot, 'thunderbird-ai/pages/single-mail-ui.html'),
        'utf8'
    );

    assert.ok(settings.indexOf('SafeDom.js') < settings.indexOf('LanguageComponent.js'));
    assert.ok(singleMail.indexOf('SafeDom.js') < singleMail.indexOf('ChatComponent.js'));
});
