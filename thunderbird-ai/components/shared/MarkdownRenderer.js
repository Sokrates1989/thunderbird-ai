/**
 * Renders untrusted AI Markdown through DOM nodes without accepting raw HTML.
 * Remote images remain links so displaying an AI response cannot initiate a request.
 */
const MarkdownRenderer = {
    /** Replace an element's contents with safely rendered Markdown. */
    renderInto(element, markdown) {
        const documentRef = element.ownerDocument || document;
        element.replaceChildren(this.createFragment(markdown, documentRef));
    },

    /** Build a reusable fragment containing the supported Markdown blocks. */
    createFragment(markdown, documentRef = document) {
        const fragment = documentRef.createDocumentFragment();
        const lines = String(markdown ?? '').replace(/\r\n?/gu, '\n').split('\n');
        this.appendBlocks(fragment, lines, documentRef);
        return fragment;
    },

    /** Parse block-level Markdown constructs into the supplied parent. */
    appendBlocks(parent, lines, documentRef) {
        let index = 0;
        while (index < lines.length) {
            if (!lines[index].trim()) {
                index += 1;
                continue;
            }

            const fence = lines[index].match(/^\s{0,3}(`{3,}|~{3,})\s*([\w-]*)\s*$/u);
            if (fence) {
                index = this.appendCodeFence(parent, lines, index, fence, documentRef);
                continue;
            }

            const heading = lines[index].match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/u);
            if (heading) {
                const element = documentRef.createElement(`h${heading[1].length}`);
                MarkdownInlineRenderer.append(element, heading[2], documentRef);
                parent.appendChild(element);
                index += 1;
                continue;
            }

            if (/^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/u.test(lines[index])) {
                parent.appendChild(documentRef.createElement('hr'));
                index += 1;
                continue;
            }

            if (/^\s{0,3}>/u.test(lines[index])) {
                index = this.appendBlockquote(parent, lines, index, documentRef);
                continue;
            }

            if (this.isTableStart(lines, index)) {
                index = this.appendTable(parent, lines, index, documentRef);
                continue;
            }

            if (this.matchListItem(lines[index])) {
                index = this.appendList(parent, lines, index, documentRef).index;
                continue;
            }

            index = this.appendParagraph(parent, lines, index, documentRef);
        }
    },

    /** Render one fenced code block, preserving all source characters. */
    appendCodeFence(parent, lines, startIndex, fence, documentRef) {
        const closingPattern = new RegExp(`^\\s{0,3}${fence[1][0]}{${fence[1].length},}\\s*$`, 'u');
        const codeLines = [];
        let index = startIndex + 1;
        while (index < lines.length && !closingPattern.test(lines[index])) {
            codeLines.push(lines[index]);
            index += 1;
        }
        if (index < lines.length) {
            index += 1;
        }
        const pre = documentRef.createElement('pre');
        const code = documentRef.createElement('code');
        if (fence[2]) {
            code.className = `language-${fence[2].toLowerCase()}`;
        }
        code.textContent = codeLines.join('\n');
        pre.appendChild(code);
        parent.appendChild(pre);
        return index;
    },

    /** Render consecutive quoted lines recursively so nested Markdown remains available. */
    appendBlockquote(parent, lines, startIndex, documentRef) {
        const quotedLines = [];
        let index = startIndex;
        while (index < lines.length && /^\s{0,3}>/u.test(lines[index])) {
            quotedLines.push(lines[index].replace(/^\s{0,3}> ?/u, ''));
            index += 1;
        }
        const quote = documentRef.createElement('blockquote');
        this.appendBlocks(quote, quotedLines, documentRef);
        parent.appendChild(quote);
        return index;
    },

    /** Identify a GFM-style table header followed by its separator row. */
    isTableStart(lines, index) {
        if (index + 1 >= lines.length || !lines[index].includes('|')) {
            return false;
        }
        const separators = this.splitTableRow(lines[index + 1]);
        return separators.length > 0
            && separators.every(cell => /^:?-{3,}:?$/u.test(cell.trim()));
    },

    /** Render a compact table and preserve column alignment markers. */
    appendTable(parent, lines, startIndex, documentRef) {
        const headers = this.splitTableRow(lines[startIndex]);
        const separators = this.splitTableRow(lines[startIndex + 1]);
        const table = documentRef.createElement('table');
        const head = documentRef.createElement('thead');
        const headRow = documentRef.createElement('tr');
        headers.forEach((header, column) => {
            const cell = documentRef.createElement('th');
            this.setTableAlignment(cell, separators[column] || '');
            MarkdownInlineRenderer.append(cell, header.trim(), documentRef);
            headRow.appendChild(cell);
        });
        head.appendChild(headRow);
        table.appendChild(head);

        const body = documentRef.createElement('tbody');
        let index = startIndex + 2;
        while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
            const row = documentRef.createElement('tr');
            const cells = this.splitTableRow(lines[index]);
            headers.forEach((_header, column) => {
                const cell = documentRef.createElement('td');
                this.setTableAlignment(cell, separators[column] || '');
                MarkdownInlineRenderer.append(cell, (cells[column] || '').trim(), documentRef);
                row.appendChild(cell);
            });
            body.appendChild(row);
            index += 1;
        }
        table.appendChild(body);
        parent.appendChild(table);
        return index;
    },

    /** Split a simple pipe table row while retaining escaped pipe characters. */
    splitTableRow(line) {
        let source = line.trim();
        if (source.startsWith('|')) {
            source = source.slice(1);
        }
        if (source.endsWith('|') && !source.endsWith('\\|')) {
            source = source.slice(0, -1);
        }
        const cells = [];
        let current = '';
        for (let index = 0; index < source.length; index += 1) {
            if (source[index] === '\\' && source[index + 1] === '|') {
                current += '|';
                index += 1;
            } else if (source[index] === '|') {
                cells.push(current);
                current = '';
            } else {
                current += source[index];
            }
        }
        cells.push(current);
        return cells;
    },

    /** Apply the separator row's left, right, or centered alignment. */
    setTableAlignment(cell, separator) {
        const marker = separator.trim();
        if (marker.startsWith(':') && marker.endsWith(':')) {
            cell.style.textAlign = 'center';
        } else if (marker.endsWith(':')) {
            cell.style.textAlign = 'right';
        } else if (marker.startsWith(':')) {
            cell.style.textAlign = 'left';
        }
    },

    /** Read a list marker together with its indentation and item body. */
    matchListItem(line) {
        const match = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/u);
        if (!match) {
            return null;
        }
        return {
            indent: match[1].replace(/\t/gu, '    ').length,
            ordered: /^\d/u.test(match[2]),
            text: match[3]
        };
    },

    /** Render one possibly nested ordered or unordered list. */
    appendList(parent, lines, startIndex, documentRef, requiredIndent = null) {
        const first = this.matchListItem(lines[startIndex]);
        const baseIndent = requiredIndent ?? first.indent;
        const ordered = first.ordered;
        const list = documentRef.createElement(ordered ? 'ol' : 'ul');
        let index = startIndex;
        let currentItem = null;

        while (index < lines.length) {
            const item = this.matchListItem(lines[index]);
            if (!item || item.indent < baseIndent) {
                break;
            }
            if (item.indent > baseIndent) {
                if (!currentItem) {
                    break;
                }
                const nested = this.appendList(currentItem, lines, index, documentRef, item.indent);
                index = nested.index;
                continue;
            }
            if (item.ordered !== ordered) {
                break;
            }

            currentItem = documentRef.createElement('li');
            const task = item.text.match(/^\[([ xX])\]\s+(.+)$/u);
            if (task) {
                currentItem.className = 'markdown-task-item';
                const checkbox = documentRef.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.disabled = true;
                checkbox.checked = task[1].toLowerCase() === 'x';
                currentItem.appendChild(checkbox);
                MarkdownInlineRenderer.append(currentItem, task[2], documentRef);
            } else {
                MarkdownInlineRenderer.append(currentItem, item.text, documentRef);
            }
            list.appendChild(currentItem);
            index += 1;

            while (index < lines.length && lines[index].trim()) {
                const nestedItem = this.matchListItem(lines[index]);
                if (nestedItem) {
                    break;
                }
                const continuationIndent = lines[index].match(/^\s*/u)[0]
                    .replace(/\t/gu, '    ').length;
                if (continuationIndent <= baseIndent) {
                    break;
                }
                currentItem.appendChild(documentRef.createElement('br'));
                MarkdownInlineRenderer.append(currentItem, lines[index].trim(), documentRef);
                index += 1;
            }
        }
        parent.appendChild(list);
        return { index, list };
    },

    /** Render ordinary consecutive lines as a paragraph with readable line breaks. */
    appendParagraph(parent, lines, startIndex, documentRef) {
        const paragraphLines = [];
        let index = startIndex;
        while (index < lines.length && lines[index].trim()) {
            if (index > startIndex && this.isBlockStart(lines, index)) {
                break;
            }
            paragraphLines.push(lines[index].trim());
            index += 1;
        }
        const paragraph = documentRef.createElement('p');
        paragraphLines.forEach((line, lineIndex) => {
            if (lineIndex > 0) {
                paragraph.appendChild(documentRef.createElement('br'));
            }
            MarkdownInlineRenderer.append(paragraph, line, documentRef);
        });
        parent.appendChild(paragraph);
        return index;
    },

    /** Determine whether a line begins a block that should end the current paragraph. */
    isBlockStart(lines, index) {
        const line = lines[index];
        return /^\s{0,3}(`{3,}|~{3,})/u.test(line)
            || /^\s{0,3}#{1,6}\s+/u.test(line)
            || /^\s{0,3}>/u.test(line)
            || /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/u.test(line)
            || Boolean(this.matchListItem(line))
            || this.isTableStart(lines, index);
    },

    // Inline parsing is isolated in MarkdownInlineRenderer so both modules stay focused.
};

if (typeof window !== 'undefined') {
    window.MarkdownRenderer = MarkdownRenderer;
}
if (typeof globalThis !== 'undefined') {
    globalThis.MarkdownRenderer = MarkdownRenderer;
}
