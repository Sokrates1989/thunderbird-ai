/**
 * Reads bounded unread-message candidates for the global dashboard.
 * Only message headers from each account's Inbox are requested; no message body
 * is loaded and no AI or external network service is involved.
 */
const GlobalMailService = {
    QUERY_PAGE_SIZE: 100,

    /** Return up to the requested number of newest unread Inbox messages per mail account. */
    async listUnreadByAccount(limit = 10) {
        const accounts = await browser.accounts.list(true);
        const mailAccounts = accounts
            .map(account => ({ account, inbox: this.findInbox(account.rootFolder) }))
            .filter(item => item.inbox && !['nntp', 'rss'].includes(item.account.type));
        return Promise.all(mailAccounts.map(item => this.listAccount(item, limit)));
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
    async listAccount({ account, inbox }, limit) {
        let messageList = null;
        try {
            messageList = await browser.messages.query({
                folderId: inbox.id,
                read: false,
                messagesPerPage: Math.max(limit, this.QUERY_PAGE_SIZE)
            });
            const messages = [...(messageList.messages || [])]
                .sort((left, right) => this.dateValue(right.date) - this.dateValue(left.date))
                .slice(0, limit);
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
    },

    dateValue(value) {
        const date = value instanceof Date ? value : new Date(value || 0);
        const timestamp = date.getTime();
        return Number.isFinite(timestamp) ? timestamp : 0;
    }
};

if (typeof window !== 'undefined') {
    window.GlobalMailService = GlobalMailService;
}
