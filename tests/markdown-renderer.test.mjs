import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

/** Provide the DOM operations used by the renderer without a browser dependency. */
function createTestDocument() {
    class TestNode {
        constructor(nodeName, ownerDocument, data = '') {
            this.nodeName = nodeName;
            this.ownerDocument = ownerDocument;
            this.data = data;
            this.childNodes = [];
            this.className = '';
            this.style = {};
        }

        appendChild(child) {
            if (child.nodeName === '#fragment') {
                this.childNodes.push(...child.childNodes);
                child.childNodes = [];
            } else {
                this.childNodes.push(child);
            }
            return child;
        }

        append(...children) {
            for (const child of children) {
                this.appendChild(typeof child === 'string'
                    ? this.ownerDocument.createTextNode(child)
                    : child);
            }
        }

        replaceChildren(...children) {
            this.childNodes = [];
            this.append(...children);
        }

        setAttribute(name, value) {
            this[name] = String(value);
        }

        get textContent() {
            if (this.nodeName === '#text') {
                return this.data;
            }
            return this.childNodes.map(child => child.textContent).join('');
        }

        set textContent(value) {
            if (this.nodeName === '#text') {
                this.data = String(value);
            } else {
                this.childNodes = [this.ownerDocument.createTextNode(String(value))];
            }
        }
    }

    const documentRef = {
        createDocumentFragment() {
            return new TestNode('#fragment', documentRef);
        },
        createElement(tagName) {
            return new TestNode(tagName.toLowerCase(), documentRef);
        },
        createTextNode(value) {
            return new TestNode('#text', documentRef, String(value));
        }
    };
    return documentRef;
}

/** Serialize the test DOM so semantic structure and unsafe attributes are inspectable. */
function serialize(node) {
    if (node.nodeName === '#text') {
        return node.data
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;');
    }
    if (node.nodeName === '#fragment') {
        return node.childNodes.map(serialize).join('');
    }
    const attributes = [];
    for (const name of ['className', 'href', 'target', 'rel', 'type']) {
        if (node[name]) {
            const attributeName = name === 'className' ? 'class' : name;
            attributes.push(`${attributeName}="${node[name]}"`);
        }
    }
    if (node.disabled) {
        attributes.push('disabled');
    }
    if (node.checked) {
        attributes.push('checked');
    }
    if (node.style.textAlign) {
        attributes.push(`style="text-align:${node.style.textAlign}"`);
    }
    const attributeText = attributes.length ? ` ${attributes.join(' ')}` : '';
    const content = node.childNodes.map(serialize).join('');
    return `<${node.nodeName}${attributeText}>${content}</${node.nodeName}>`;
}

function loadRenderer() {
    const documentRef = createTestDocument();
    const context = createContext({ document: documentRef });
    loadScript(context, 'thunderbird-ai/components/shared/MarkdownInlineRenderer.js');
    loadScript(context, 'thunderbird-ai/components/shared/MarkdownRenderer.js');
    return { context, documentRef };
}

test('AI Markdown renders headings, emphasis, nested lists, code, and safe links', () => {
    const { context, documentRef } = loadRenderer();
    const target = documentRef.createElement('div');

    context.MarkdownRenderer.renderInto(target, [
        '# Price reduction',
        '',
        '- **Input tokens**: 20% discount',
        '  - [Pricing](https://example.test/pricing)',
        '- Use `gpt-5.6-sol`'
    ].join('\n'));

    const html = serialize(target);
    assert.match(html, /<h1>Price reduction<\/h1>/u);
    assert.match(html, /<strong>Input tokens<\/strong>/u);
    assert.match(html, /<ul><li>.*<ul><li>/u);
    assert.match(html, /href="https:\/\/example\.test\/pricing"/u);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/u);
    assert.match(html, /<code>gpt-5\.6-sol<\/code>/u);
});

test('tables, tasks, blockquotes, and fenced code retain readable structure', () => {
    const { context, documentRef } = loadRenderer();
    const fragment = context.MarkdownRenderer.createFragment([
        '| Model | Discount |',
        '| :--- | ---: |',
        '| Sol | **20%** |',
        '',
        '- [x] Verify release',
        '',
        '> **Note:** temporary pricing',
        '',
        '```js',
        'const price = "<safe>";',
        '```'
    ].join('\n'), documentRef);

    const html = serialize(fragment);
    assert.match(html, /<table><thead>/u);
    assert.match(html, /style="text-align:right"/u);
    assert.match(html, /class="markdown-task-item"/u);
    assert.match(html, /type="checkbox" disabled checked/u);
    assert.match(html, /<blockquote><p><strong>Note:<\/strong>/u);
    assert.match(html, /<pre><code class="language-js">const price = "&lt;safe&gt;";<\/code><\/pre>/u);
});

test('raw HTML and unsafe links never become executable content or remote images', () => {
    const { context, documentRef } = loadRenderer();
    const target = documentRef.createElement('div');

    context.MarkdownRenderer.renderInto(target, [
        '<script>alert("xss")</script>',
        '',
        '[unsafe](javascript:alert(1))',
        '',
        '![tracking pixel](https://example.test/pixel.png)'
    ].join('\n'));

    const html = serialize(target);
    assert.doesNotMatch(html, /<script>/u);
    assert.match(html, /&lt;script&gt;alert\("xss"\)&lt;\/script&gt;/u);
    assert.doesNotMatch(html, /href="javascript:/u);
    assert.doesNotMatch(html, /<img/u);
    assert.match(html, /class="markdown-image-link"/u);
});

test('every free-form AI output surface uses the shared renderer', () => {
    const source = relativePath => fs.readFileSync(
        path.join(repositoryRoot, relativePath),
        'utf8'
    );
    const singleMailPage = source('thunderbird-ai/pages/single-mail-ui.html');
    const settingsPage = source('thunderbird-ai/pages/settings.html');

    for (const component of [
        'thunderbird-ai/components/single-mail/ResultsComponent.js',
        'thunderbird-ai/components/single-mail/ChatComponent.js',
        'thunderbird-ai/components/single-mail/ReplyComposerComponent.js',
        'thunderbird-ai/components/settings/SavedResultsComponent.js'
    ]) {
        assert.match(source(component), /MarkdownRenderer\.renderInto/u, component);
    }
    assert.match(singleMailPage, /markdown-content\.css/u);
    assert.match(singleMailPage, /MarkdownInlineRenderer\.js/u);
    assert.match(singleMailPage, /MarkdownRenderer\.js/u);
    assert.match(settingsPage, /markdown-content\.css/u);
    assert.match(settingsPage, /MarkdownInlineRenderer\.js/u);
    assert.match(settingsPage, /MarkdownRenderer\.js/u);
    assert.doesNotMatch(source('common/utils/ui.js'), /formatSummaryText/u);
});
