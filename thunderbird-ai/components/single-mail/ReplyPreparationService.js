/**
 * Bridges the reply workspace with Thunderbird's native compose and message APIs.
 * Native quoting and signatures remain Thunderbird-owned; attachment failures are
 * reported without closing the compose tab that was already opened successfully.
 */
const ReplyPreparationService = {
    /** Open one native reply and apply the selected recipients, body, and attachments. */
    async prepare(messageId, draft, preferences, logError) {
        const replyType = preferences.replyToAll ? 'replyToAll' : 'replyToSender';
        const composeTab = preferences.includeOriginal
            ? await browser.compose.beginReply(messageId, replyType)
            : await browser.compose.beginReply(messageId, replyType, {
                plainTextBody: draft
            });
        if (preferences.includeOriginal) {
            await this.prependDraftToNativeReply(composeTab.id, draft);
        }
        return preferences.includeAttachments
            ? this.addOriginalAttachments(composeTab.id, messageId, logError)
            : { added: 0, failed: 0 };
    },

    /** Prepend safely formatted AI text while retaining Thunderbird's native body. */
    async prependDraftToNativeReply(tabId, draft) {
        const details = await browser.compose.getComposeDetails(tabId);
        const usePlainText = details.isPlainText === true
            || (details.isPlainText === undefined && typeof details.plainTextBody === 'string');
        if (usePlainText) {
            const existing = String(details.plainTextBody || '');
            await browser.compose.setComposeDetails(tabId, {
                plainTextBody: [draft, existing].filter(Boolean).join('\n\n')
            });
            return;
        }

        const existing = String(details.body || '');
        const draftHtml = this.escapeHtml(draft).replace(/\r?\n/gu, '<br>');
        await browser.compose.setComposeDetails(tabId, {
            body: existing ? `<div>${draftHtml}</div><br>${existing}` : `<div>${draftHtml}</div>`
        });
    },

    /** Copy all retrievable source attachments and count individual failures. */
    async addOriginalAttachments(tabId, messageId, logError) {
        let attachments;
        try {
            attachments = await browser.messages.listAttachments(messageId);
        } catch (error) {
            logError(`Could not list original attachments: ${error.message}`);
            return { added: 0, failed: null };
        }

        let added = 0;
        let failed = 0;
        for (const attachment of attachments) {
            try {
                const file = await browser.messages.getAttachmentFile(
                    messageId,
                    attachment.partName
                );
                await browser.compose.addAttachment(tabId, {
                    file,
                    name: attachment.name || file.name
                });
                added += 1;
            } catch (error) {
                failed += 1;
                logError(`Could not reattach ${attachment.name || attachment.partName}: ${error.message}`);
            }
        }
        return { added, failed };
    },

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
};

if (typeof window !== 'undefined') {
    window.ReplyPreparationService = ReplyPreparationService;
}
