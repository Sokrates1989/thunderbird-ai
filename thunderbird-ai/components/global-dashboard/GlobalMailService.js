/**
 * Reads every paginated unread Inbox header with bounded account concurrency and
 * performs explicitly requested local mailbox actions. Message bodies are loaded
 * only when dashboard previews are enabled; no AI service is involved.
 */
const GlobalMailService = {
    QUERY_PAGE_SIZE: 100,
    ACCOUNT_QUERY_CONCURRENCY: 3,
    DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',

    /** Return all unread Inbox headers per supported account for correct global ranking. */
    async listUnreadByAccount() {
        const accounts = await browser.accounts.list(true);
        const mailAccounts = accounts
            .map(account => ({ account, inbox: this.findInbox(account.rootFolder) }))
            .filter(item => item.inbox && !['nntp', 'rss'].includes(item.account.type));
        const results = new Array(mailAccounts.length);
        let nextIndex = 0;
        const worker = async () => {
            while (nextIndex < mailAccounts.length) {
                const index = nextIndex;
                nextIndex += 1;
                results[index] = await this.listAccount(mailAccounts[index]);
            }
        };
        const workerCount = Math.min(this.ACCOUNT_QUERY_CONCURRENCY, mailAccounts.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        return results;
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
                await this.loadPreview(message);
            }
        };
        const workerCount = Math.min(Math.max(1, concurrency), messages.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        return accounts;
    },

    /** Load one local body preview and retain a renderable failure state on the header. */
    async loadPreview(message) {
        try {
            message.preview = await MessageService.getMessageContent(message.id);
            message.previewFailed = false;
            return true;
        } catch (error) {
            console.warn(`Could not load preview for message ${message.id}:`, error);
            message.preview = '';
            message.previewFailed = true;
            return false;
        }
    },

    /** Open one known Thunderbird message in a dedicated active message tab. */
    async openInTab(messageId) {
        return browser.messageDisplay.open({
            messageId,
            location: 'tab',
            active: true
        });
    },

    /** Delegate deletion to the shared mailbox action boundary. */
    async moveToTrash(messageIds) {
        return MailboxActionService.moveToTrash(messageIds);
    },

    async loadDeleteDiagnostic() {
        try {
            const stored = await browser.storage.local.get(
                CONFIG.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC
            );
            return stored[CONFIG.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC] || null;
        } catch (error) {
            console.warn('Could not load dashboard delete diagnostic:', error);
            return null;
        }
    },

    async saveDeleteDiagnostic(diagnostics) {
        try {
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC]: diagnostics
            });
        } catch (error) {
            console.warn('Could not persist dashboard delete diagnostic:', error);
        }
    },

    /** Archive every unique message through its Thunderbird account and identity settings. */
    async archiveMessages(messageIds) {
        return MailboxActionService.archive(messageIds);
    },

    /** Mark every unique message as read while isolating individual update failures. */
    async markAsRead(messageIds) {
        return MailboxActionService.markAsRead(messageIds);
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
