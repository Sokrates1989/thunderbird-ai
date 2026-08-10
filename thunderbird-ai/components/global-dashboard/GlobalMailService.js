/**
 * Reads every paginated unread Inbox header for the global dashboard and performs
 * explicitly requested local mailbox actions. Message bodies are loaded only
 * when the dashboard preview preference is enabled; no AI service is involved.
 */
const GlobalMailService = {
    QUERY_PAGE_SIZE: 100,

    /** Return all unread Inbox headers per supported account for correct global ranking. */
    async listUnreadByAccount() {
        const accounts = await browser.accounts.list(true);
        const mailAccounts = accounts
            .map(account => ({ account, inbox: this.findInbox(account.rootFolder) }))
            .filter(item => item.inbox && !['nntp', 'rss'].includes(item.account.type));
        return Promise.all(mailAccounts.map(item => this.listAccount(item)));
    },

    /** Add locally extracted body previews without failing the full dashboard. */
    async loadPreviews(accounts, concurrency = 4) {
        const messages = accounts
            .flatMap(account => account.messages || [])
            .filter(message => message.preview === undefined);
        let nextIndex = 0;
        const worker = async () => {
            while (nextIndex < messages.length) {
                const message = messages[nextIndex];
                nextIndex += 1;
                try {
                    message.preview = await MessageService.getMessageContent(message.id);
                    message.previewFailed = false;
                } catch (error) {
                    console.warn(`Could not load preview for message ${message.id}:`, error);
                    message.preview = '';
                    message.previewFailed = true;
                }
            }
        };
        const workerCount = Math.min(Math.max(1, concurrency), messages.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        return accounts;
    },

    /** Move messages according to Thunderbird's account trash settings. */
    async moveToTrash(messageIds) {
        const uniqueIds = [...new Set(messageIds)].filter(id => id !== undefined && id !== null);
        if (!uniqueIds.length) {
            return;
        }
        // The boolean signature is retained for Thunderbird 128 compatibility.
        await browser.messages.delete(uniqueIds, false);
    },

    /** Mark every unique message as read while isolating individual update failures. */
    async markAsRead(messageIds) {
        const uniqueIds = [...new Set(messageIds)].filter(id => id !== undefined && id !== null);
        const results = await Promise.allSettled(
            uniqueIds.map(messageId => browser.messages.update(messageId, { read: true }))
        );
        return results.reduce((summary, result, index) => {
            const target = result.status === 'fulfilled' ? summary.updatedIds : summary.failedIds;
            target.push(uniqueIds[index]);
            return summary;
        }, { updatedIds: [], failedIds: [] });
    },

    /** Find the special-use Inbox without relying on localized folder names. */
    findInbox(folder) {
        if (!folder) {
            return null;
        }
        if (folder.specialUse?.includes('inbox') || folder.type === 'inbox') {
            return folder;
        }
        for (const child of folder.subFolders || []) {
            const inbox = this.findInbox(child);
            if (inbox) {
                return inbox;
            }
        }
        return null;
    },

    /** Isolate one account failure so the remaining accounts can still be displayed. */
    async listAccount({ account, inbox }) {
        let messageList = null;
        try {
            messageList = await browser.messages.query({
                folderId: inbox.id,
                read: false,
                messagesPerPage: this.QUERY_PAGE_SIZE
            });
            const messages = [...(messageList.messages || [])];
            while (messageList.id) {
                messageList = await browser.messages.continueList(messageList.id);
                messages.push(...(messageList.messages || []));
            }
            return {
                accountId: account.id,
                accountName: account.name,
                inboxName: inbox.name,
                messages,
                failed: false
            };
        } catch (error) {
            console.error(`Could not query unread messages for account ${account.id}:`, error);
            return {
                accountId: account.id,
                accountName: account.name,
                inboxName: inbox.name,
                messages: [],
                failed: true
            };
        } finally {
            if (messageList?.id && browser.messages.abortList) {
                await browser.messages.abortList(messageList.id).catch(error => {
                    console.warn(`Could not finalize message query ${messageList.id}:`, error);
                });
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.GlobalMailService = GlobalMailService;
}
