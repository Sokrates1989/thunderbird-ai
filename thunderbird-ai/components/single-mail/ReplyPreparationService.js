/**
 * Bridges the reply workspace with Thunderbird's native compose and message APIs.
 * Native quoting and signatures remain Thunderbird-owned; attachment failures are
 * reported without closing the compose tab that was already opened successfully.
 */
const ReplyPreparationService = {
    /** Open one native reply and apply the selected recipients, body, and attachments. */
    async prepare(messageId, draft, preferences, logError) {
        const replyType = preferences.replyToAll ? 'replyToAll' : 'replyToSender';
        const identityId = await this.findReplyIdentityId(messageId, logError);
        const composeDetails = {};
        if (identityId) {
            composeDetails.identityId = identityId;
        }
        if (!preferences.includeOriginal) {
            composeDetails.plainTextBody = draft;
        }
        const composeTab = Object.keys(composeDetails).length
            ? await browser.compose.beginReply(messageId, replyType, composeDetails)
            : await browser.compose.beginReply(messageId, replyType);
        if (preferences.includeOriginal) {
            await this.prependDraftToNativeReply(composeTab.id, draft);
        }
        return preferences.includeAttachments
            ? this.addOriginalAttachments(composeTab.id, messageId, logError)
            : { added: 0, failed: 0 };
    },

    /**
     * Prefer the identity whose address was an original recipient. If no exact
     * recipient match exists, fall back to the default identity of the owning account.
     */
    async findReplyIdentityId(messageId, logError = () => {}) {
        if (!browser.identities?.list || !browser.messages?.get) {
            return null;
        }
        try {
            const [message, identities] = await Promise.all([
                browser.messages.get(messageId),
                browser.identities.list()
            ]);
            const recipientAddresses = this.recipientAddresses(message);
            const accountId = message?.folder?.accountId || null;
            const exactMatches = identities.filter(identity => (
                recipientAddresses.has(this.normalizeAddress(identity.email))
            ));
            const accountMatch = exactMatches.find(identity => identity.accountId === accountId);
            if (accountMatch?.id) {
                return accountMatch.id;
            }
            if (exactMatches[0]?.id) {
                return exactMatches[0].id;
            }
            if (accountId && browser.identities.getDefault) {
                const defaultIdentity = await browser.identities.getDefault(accountId);
                if (defaultIdentity?.id) {
                    return defaultIdentity.id;
                }
            }
            return identities.find(identity => identity.accountId === accountId)?.id || null;
        } catch (error) {
            logError(`Could not determine the recipient identity for the reply: ${error.message}`);
            return null;
        }
    },

    recipientAddresses(message) {
        const addresses = new Set();
        for (const value of [
            ...(message?.recipients || []),
            ...(message?.ccList || []),
            ...(message?.bccList || [])
        ]) {
            const bracketed = String(value).match(/<([^<>]+)>/u)?.[1];
            const normalized = this.normalizeAddress(bracketed || value);
            if (normalized) {
                addresses.add(normalized);
            }
        }
        return addresses;
    },

    normalizeAddress(value) {
        return String(value || '').trim().toLocaleLowerCase('en-US');
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
