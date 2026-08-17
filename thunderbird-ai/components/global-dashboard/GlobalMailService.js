/**
 * Reads every paginated unread Inbox header for the global dashboard and performs
 * explicitly requested local mailbox actions. Message bodies are loaded only
 * when the dashboard preview preference is enabled; no AI service is involved.
 */
const GlobalMailService = {
    QUERY_PAGE_SIZE: 100,
    STRUCTURED_DELETE_OPTIONS_MIN_VERSION: 137,
    DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',

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

    /** Delete messages according to account settings and preserve user-action semantics. */
    async moveToTrash(messageIds) {
        const uniqueIds = [...new Set(messageIds)].filter(id => id !== undefined && id !== null);
        if (!uniqueIds.length) {
            return null;
        }
        const browserVersion = await this.getBrowserVersion();
        const supportsStructuredOptions = this.supportsStructuredDeleteOptions(browserVersion);
        const requestOptions = supportsStructuredOptions
            ? { deletePermanently: false, isUserAction: true }
            : false;
        const diagnostics = {
            browserVersion: browserVersion || 'unknown',
            messageCount: uniqueIds.length,
            requestMode: supportsStructuredOptions ? 'structured-user-action' : 'legacy-boolean'
        };

        console.log('Submitting dashboard delete request to Thunderbird.', diagnostics);
        await browser.messages.delete(uniqueIds, requestOptions);
        console.log('Thunderbird completed dashboard delete request.', diagnostics);
        return diagnostics;
    },

    /** Read Thunderbird's version without preventing deletion when runtime metadata is unavailable. */
    async getBrowserVersion() {
        if (typeof browser.runtime?.getBrowserInfo !== 'function') {
            return '';
        }
        try {
            const browserInfo = await browser.runtime.getBrowserInfo();
            return String(browserInfo?.version || '');
        } catch (error) {
            console.warn('Could not determine Thunderbird version for dashboard deletion:', error);
            return '';
        }
    },

    /** Use the user-action option only where Thunderbird's API schema accepts it. */
    supportsStructuredDeleteOptions(version) {
        const majorVersion = Number.parseInt(String(version || '').split('.')[0], 10);
        return Number.isInteger(majorVersion)
            && majorVersion >= this.STRUCTURED_DELETE_OPTIONS_MIN_VERSION;
    },

    /** Archive every unique message through its Thunderbird account and identity settings. */
    async archiveMessages(messageIds) {
        const uniqueIds = [...new Set(messageIds)].filter(id => id !== undefined && id !== null);
        if (!uniqueIds.length) {
            return;
        }
        await browser.messages.archive(uniqueIds);
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
