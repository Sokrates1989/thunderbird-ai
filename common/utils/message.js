/** Thunderbird message retrieval and MIME-body extraction helpers. */
const MessageService = {
    async getCurrentMessage(tabId) {
        try {
            const displayed = await browser.messageDisplay.getDisplayedMessages(tabId);
            const messages = Array.isArray(displayed) ? displayed : displayed?.messages;
            return messages?.[0] || null;
        } catch (error) {
            console.error('Could not get the displayed message:', error);
            return null;
        }
    },

    /** Retrieve the header and decoded MIME tree and expose one normalized object. */
    async getFullMessage(messageId) {
        if (messageId === undefined || messageId === null) {
            throw new Error(I18n.t('messageNotFound'));
        }

        try {
            const [header, mimeMessage] = await Promise.all([
                browser.messages.get(messageId),
                browser.messages.getFull(messageId)
            ]);
            if (!header || !mimeMessage) {
                throw new Error(I18n.t('messageNotFound'));
            }

            const content = this.extractBody(mimeMessage);
            const attachments = this.extractAttachments(mimeMessage);
            const date = header.date ? new Date(header.date) : null;
            const spamSignals = this.extractSpamSignals(mimeMessage, header, content);

            return {
                id: header.id,
                headerMessageId: header.headerMessageId || '',
                accountId: header.folder?.accountId || '',
                subject: header.subject || I18n.t('noSubject'),
                author: header.author || I18n.t('unknownSender'),
                from: header.author || I18n.t('unknownSender'),
                recipients: header.recipients || [],
                ccList: header.ccList || [],
                date,
                formattedDate: date && !Number.isNaN(date.getTime())
                    ? date.toLocaleString(I18n.getLanguage())
                    : I18n.t('unknownValue'),
                content,
                spamSignals,
                wordCount: content ? content.split(/\s+/u).filter(Boolean).length : 0,
                attachments,
                hasAttachments: Boolean(header.hasAttachments || attachments.length),
                flagged: Boolean(header.flagged),
                read: Boolean(header.read),
                status: header.flagged ? 'flagged' : (header.read ? 'read' : 'unread'),
                tags: header.tags || [],
                size: header.size || 0,
                folderId: header.folder?.id || null
            };
        } catch (error) {
            console.error('Could not retrieve the full email:', error);
            throw new Error(I18n.t('messageLoadFailed'));
        }
    },

    async getMessageContent(messageId) {
        const mimeMessage = await browser.messages.getFull(messageId);
        return this.extractBody(mimeMessage);
    },

    /** Prefer text/plain MIME parts and use HTML only when no plain part exists. */
    extractBody(rootPart) {
        const plainParts = [];
        const htmlParts = [];

        this.walkParts(rootPart, part => {
            if (!part.body || this.isAttachment(part)) {
                return;
            }
            const contentType = String(part.contentType || '').split(';')[0].trim().toLowerCase();
            if (contentType === 'text/plain') {
                plainParts.push(part.body);
            } else if (contentType === 'text/html') {
                htmlParts.push(part.body);
            }
        });

        const content = plainParts.length
            ? plainParts.join('\n\n')
            : htmlParts.map(html => this.htmlToText(html)).join('\n\n');
        return this.normalizeWhitespace(content);
    },

    extractAttachments(rootPart) {
        const attachments = [];
        this.walkParts(rootPart, part => {
            if (!this.isAttachment(part)) {
                return;
            }
            attachments.push({
                name: part.name || I18n.t('attachmentDefaultName'),
                contentType: part.contentType || 'application/octet-stream',
                partName: part.partName || null,
                size: part.size || 0
            });
        });
        return attachments;
    },

    walkParts(part, visitor) {
        if (!part) {
            return;
        }
        visitor(part);
        for (const child of part.parts || []) {
            this.walkParts(child, visitor);
        }
    },

    isAttachment(part) {
        if (part.name) {
            return true;
        }
        const disposition = part.headers?.['content-disposition'];
        const value = Array.isArray(disposition) ? disposition.join(';') : disposition;
        return String(value || '').toLowerCase().includes('attachment');
    },

    /** Convert HTML without relying on a DOM, because background scripts have none. */
    htmlToText(html) {
        if (!html) {
            return '';
        }
        const withoutUnsafeBlocks = String(html)
            .replace(/<\s*(script|style|head)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu, ' ')
            .replace(/<\s*br\s*\/?>/giu, '\n')
            .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/giu, '\n')
            .replace(/<\s*li[^>]*>/giu, '• ')
            .replace(/<[^>]+>/gu, ' ');
        return this.decodeHtmlEntities(withoutUnsafeBlocks);
    },

    decodeHtmlEntities(text) {
        const named = {
            amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
            auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß'
        };
        const decodeCodePoint = (match, value, radix) => {
            const codePoint = parseInt(value, radix);
            return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10FFFF
                ? String.fromCodePoint(codePoint)
                : match;
        };
        return String(text)
            .replace(/&#(\d+);/gu, (match, decimal) => decodeCodePoint(match, decimal, 10))
            .replace(/&#x([0-9a-f]+);/giu, (match, hex) => decodeCodePoint(match, hex, 16))
            .replace(/&([a-z]+);/giu, (match, name) => named[name] ?? match);
    },

    normalizeWhitespace(text) {
        return String(text || '')
            .replace(/\r\n?/gu, '\n')
            .replace(/[\t\f\v ]+/gu, ' ')
            .replace(/ *\n */gu, '\n')
            .replace(/\n{3,}/gu, '\n\n')
            .trim();
    },

    /** Extract bounded structural newsletter indicators without retaining header values. */
    extractSpamSignals(mimeMessage, header, content) {
        const normalizedHeaders = Object.fromEntries(
            Object.entries(mimeMessage?.headers || {}).map(([name, value]) => [
                String(name).toLowerCase(),
                Array.isArray(value) ? value.join(' ') : String(value || '')
            ])
        );
        const signals = new Set();
        if (normalizedHeaders['list-unsubscribe']) {
            signals.add('list-unsubscribe-header');
        }
        if (normalizedHeaders['list-id']) {
            signals.add('list-id-header');
        }
        if (/\b(?:bulk|list|junk)\b/iu.test(normalizedHeaders.precedence || '')) {
            signals.add('bulk-precedence-header');
        }
        if (normalizedHeaders['list-post']) {
            signals.add('list-post-header');
        }
        const autoSubmitted = normalizedHeaders['auto-submitted'] || '';
        if (autoSubmitted && !/^\s*no\s*$/iu.test(autoSubmitted)) {
            signals.add('auto-submitted-header');
        }

        const senderAddress = this.extractEmailAddress(header?.author);
        const localPart = senderAddress.split('@')[0] || '';
        if (/(?:^|[._+-])(?:no-?reply|newsletter|marketing|updates?|invitations?)(?:$|[._+-])/iu.test(localPart)) {
            signals.add('automated-sender-address');
        }
        const text = String(content || '').slice(0, 50000);
        if (/\b(?:unsubscribe|opt[ -]?out|abmelden|abbestellen|newsletter abbestellen|afmelden)\b/iu.test(text)) {
            signals.add('unsubscribe-language');
        }
        if (/\b(?:utm_(?:source|medium|campaign)|list-manage\.com|mailchi\.mp|sendgrid\.net|click\.[^\s/]+|tracking\.)/iu.test(text)) {
            signals.add('campaign-tracking-link');
        }
        return [...signals];
    },

    /** Normalize the address portion Thunderbird accepts for an exact author query. */
    extractEmailAddress(author) {
        const value = String(author || '').trim();
        const bracketed = value.match(/<([^<>\s]+@[^<>\s]+)>/u);
        const plain = value.match(/([^\s<>,;]+@[^\s<>,;]+)/u);
        return String(bracketed?.[1] || plain?.[1] || '')
            .replace(/[)>\].,;:]+$/u, '')
            .toLowerCase();
    },

    /** Find related messages locally, without sending mailbox contents to an AI provider. */
    async findSimilarMessages(messageId, limit = 5) {
        const source = await browser.messages.get(messageId);
        const folderId = source?.folder?.id;
        if (!source || !folderId) {
            return [];
        }

        let page = await browser.messages.query({
            folderId,
            messagesPerPage: 100,
            returnMessageListId: true
        });
        const candidates = [...(page.messages || [])];
        while (page.id && candidates.length < 300) {
            page = await browser.messages.continueList(page.id);
            candidates.push(...(page.messages || []));
        }

        const sourceTokens = this.subjectTokens(source.subject);
        const sourceAuthor = String(source.author || '').toLowerCase();
        return candidates
            .filter(candidate => candidate.id !== source.id)
            .map(candidate => {
                const candidateTokens = this.subjectTokens(candidate.subject);
                const overlap = [...sourceTokens].filter(token => candidateTokens.has(token)).length;
                const sameAuthor = String(candidate.author || '').toLowerCase() === sourceAuthor;
                return {
                    id: candidate.id,
                    subject: candidate.subject || I18n.t('noSubject'),
                    author: candidate.author || I18n.t('unknownSender'),
                    date: candidate.date,
                    score: overlap + (sameAuthor ? 2 : 0)
                };
            })
            .filter(candidate => candidate.score > 0)
            .sort((left, right) => right.score - left.score || new Date(right.date) - new Date(left.date))
            .slice(0, limit);
    },

    subjectTokens(subject) {
        const stopWords = new Set(['re', 'fw', 'fwd', 'aw', 'wg', 'und', 'oder', 'the', 'and', 'für', 'von']);
        return new Set(
            String(subject || '')
                .toLocaleLowerCase()
                .normalize('NFKD')
                .replace(/[^\p{L}\p{N}]+/gu, ' ')
                .split(/\s+/u)
                .filter(token => token.length > 2 && !stopWords.has(token))
        );
    },

    /** Build a restart-stable identity without retaining a Thunderbird numeric ID. */
    messageIdentity(message, accountIdOverride = '') {
        const accountId = String(accountIdOverride || message?.accountId || '');
        const headerMessageId = String(message?.headerMessageId || '').trim();
        if (headerMessageId) {
            return JSON.stringify(['header', accountId, headerMessageId]);
        }
        const timestamp = new Date(message?.date || '').getTime();
        const date = Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
        return JSON.stringify([
            'fallback',
            accountId,
            date,
            String(message?.author || ''),
            String(message?.subject || ''),
            Number(message?.size) || 0
        ]);
    },

    async updateMessageTags(messageId, tags) {
        await browser.messages.update(messageId, { tags });
        return true;
    },

    async markAsImportant(messageId) {
        await browser.messages.update(messageId, { flagged: true });
        return true;
    },

    async getAttachments(messageId) {
        const mimeMessage = await browser.messages.getFull(messageId);
        return this.extractAttachments(mimeMessage);
    }
};

if (typeof window !== 'undefined') {
    window.MessageService = MessageService;
}
if (typeof globalThis !== 'undefined') {
    globalThis.MessageService = MessageService;
}
