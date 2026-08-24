/** Safely renders inline Markdown without interpreting raw HTML. */
const MarkdownInlineRenderer = {
    /** Append supported inline Markdown tokens to an existing DOM node. */
    append(parent, source, documentRef) {
        let text = String(source ?? '');
        let buffer = '';
        const flush = () => {
            if (buffer) {
                parent.appendChild(documentRef.createTextNode(buffer));
                buffer = '';
            }
        };

        while (text) {
            const escaped = this.matchEscape(text);
            if (escaped) {
                buffer += escaped.character;
                text = text.slice(escaped.length);
                continue;
            }

            const code = text.match(/^(`+)([\s\S]*?)\1/u);
            if (code) {
                flush();
                this.appendCode(parent, code[2], documentRef);
                text = text.slice(code[0].length);
                continue;
            }

            const link = this.matchInlineLink(text);
            if (link) {
                flush();
                this.appendLink(parent, link, documentRef);
                text = text.slice(link.length);
                continue;
            }

            const emphasis = this.matchEmphasis(text);
            if (emphasis) {
                flush();
                const element = documentRef.createElement(emphasis.tag);
                this.append(element, emphasis.content, documentRef);
                parent.appendChild(element);
                text = text.slice(emphasis.length);
                continue;
            }

            const automaticLink = this.matchAutomaticLink(text);
            if (automaticLink) {
                flush();
                this.appendSafeAnchor(
                    parent,
                    automaticLink.label,
                    automaticLink.url,
                    documentRef
                );
                text = text.slice(automaticLink.length);
                continue;
            }

            buffer += text[0];
            text = text.slice(1);
        }
        flush();
    },

    /** Match one escaped Markdown punctuation character. */
    matchEscape(text) {
        if (text[0] === '\\' && text.length > 1 && /[\\`*_[\]{}()#+\-.!>~|]/u.test(text[1])) {
            return { character: text[1], length: 2 };
        }
        return null;
    },

    /** Append a code span while preserving its literal content. */
    appendCode(parent, source, documentRef) {
        const element = documentRef.createElement('code');
        element.textContent = source.replace(/^ | $/gu, '');
        parent.appendChild(element);
    },

    /** Match strong, emphasized, or struck text at the current position. */
    matchEmphasis(text) {
        const tokens = [
            { marker: '**', tag: 'strong' },
            { marker: '__', tag: 'strong' },
            { marker: '~~', tag: 'del' },
            { marker: '*', tag: 'em' },
            { marker: '_', tag: 'em' }
        ];
        for (const token of tokens) {
            if (!text.startsWith(token.marker)) {
                continue;
            }
            const closing = text.indexOf(token.marker, token.marker.length);
            if (closing <= token.marker.length) {
                continue;
            }
            return {
                tag: token.tag,
                content: text.slice(token.marker.length, closing),
                length: closing + token.marker.length
            };
        }
        return null;
    },

    /** Parse a Markdown link or image without loading remote image content. */
    matchInlineLink(text) {
        const image = text.startsWith('![');
        if (!image && !text.startsWith('[')) {
            return null;
        }
        const labelStart = image ? 2 : 1;
        const labelEnd = text.indexOf(']', labelStart);
        if (labelEnd < labelStart || text[labelEnd + 1] !== '(') {
            return null;
        }
        const destinationEnd = this.findDestinationEnd(text, labelEnd + 2);
        if (destinationEnd === null) {
            return null;
        }
        const destination = text.slice(labelEnd + 2, destinationEnd - 1).trim()
            .replace(/^<|>$/gu, '');
        return {
            image,
            label: text.slice(labelStart, labelEnd),
            url: destination.split(/\s+/u)[0],
            length: destinationEnd
        };
    },

    /** Locate the balanced closing parenthesis for a link destination. */
    findDestinationEnd(text, startIndex) {
        let depth = 1;
        let index = startIndex;
        while (index < text.length && depth > 0) {
            if (text[index] === '(') {
                depth += 1;
            } else if (text[index] === ')') {
                depth -= 1;
            }
            index += 1;
        }
        return depth === 0 ? index : null;
    },

    /** Render links with a safe protocol and degrade unsafe destinations to visible text. */
    appendLink(parent, link, documentRef) {
        if (this.isSafeUrl(link.url)) {
            const label = link.image ? `🖼 ${link.label || link.url}` : link.label;
            this.appendSafeAnchor(parent, label, link.url, documentRef, link.image);
            return;
        }
        this.append(parent, link.label, documentRef);
        parent.appendChild(documentRef.createTextNode(` (${link.url})`));
    },

    /** Recognize angle-bracket and bare HTTP(S) links. */
    matchAutomaticLink(text) {
        const angle = text.match(/^<(https?:\/\/[^\s<>]+|mailto:[^\s<>]+|[^\s<>@]+@[^\s<>@]+)>/iu);
        if (angle) {
            const email = !angle[1].includes(':') && angle[1].includes('@');
            return {
                label: angle[1].replace(/^mailto:/iu, ''),
                url: email ? `mailto:${angle[1]}` : angle[1],
                length: angle[0].length
            };
        }
        const bare = text.match(/^https?:\/\/[^\s<>]+/iu);
        if (!bare) {
            return null;
        }
        const url = bare[0].replace(/[.,;:!?)}\]]+$/u, '');
        return { label: url, url, length: url.length };
    },

    /** Append one trusted anchor configuration after protocol validation. */
    appendSafeAnchor(parent, label, url, documentRef, imageLink = false) {
        const anchor = documentRef.createElement('a');
        anchor.href = url;
        anchor.textContent = label;
        if (/^https?:/iu.test(url)) {
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
        }
        if (imageLink) {
            anchor.className = 'markdown-image-link';
        }
        parent.appendChild(anchor);
    },

    /** Accept only destinations that cannot execute extension-page script. */
    isSafeUrl(url) {
        return /^(https?:\/\/|mailto:)/iu.test(String(url || ''));
    }
};

if (typeof window !== 'undefined') {
    window.MarkdownInlineRenderer = MarkdownInlineRenderer;
}
if (typeof globalThis !== 'undefined') {
    globalThis.MarkdownInlineRenderer = MarkdownInlineRenderer;
}
