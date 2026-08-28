/**
 * Reads paginated Inbox headers with bounded account concurrency and
 * performs explicitly requested local mailbox actions. Message bodies are loaded
 * only when dashboard previews are enabled; no AI service is involved.
 */
const GlobalMailService = {
    QUERY_PAGE_SIZE: 100,
    ACCOUNT_QUERY_CONCURRENCY: 3,
    API_TIMEOUT_MS: 15000,
    ABORT_TIMEOUT_MS: 2000,
    STARTUP_MAX_ATTEMPTS: 3,
    STARTUP_RETRY_DELAY_MS: 500,
    DELETE_DIAGNOSTIC_CODE: 'DELETE_NOT_APPLIED',

    /** Return requested Inbox headers after bounded startup retries. */
    async listByAccount(options = {}) {
        const settings = options && typeof options === 'object' ? options : {};
        const requestedAttempts = Number(settings.maxAttempts);
        const maxAttempts = Number.isInteger(requestedAttempts) && requestedAttempts > 0
            ? requestedAttempts
            : this.STARTUP_MAX_ATTEMPTS;
        return RetryService.run(
            attempt => this.scanByAccount({
                acceptEmptyAccounts: attempt === maxAttempts,
                includeRead: settings.includeRead === true
            }),
            {
                maxAttempts,
                shouldRetry: error => this.isStartupFailure(error),
                delayMs: (_error, attempt) => this.STARTUP_RETRY_DELAY_MS * attempt,
                onRetry: settings.onRetry
            }
        );
    },

    /** Execute one bounded account scan and reject a completely unavailable mail API. */
    async scanByAccount(options = {}) {
        let accounts;
        try {
            accounts = await this.mailApiCall(
                () => browser.accounts.list(true),
                'accounts-list'
            );
        } catch (error) {
            throw this.startupError('MAIL_ACCOUNTS_UNAVAILABLE', error);
        }
        if (!accounts.length && !options.acceptEmptyAccounts) {
            throw this.startupError('MAIL_ACCOUNTS_NOT_READY');
        }
        const mailAccounts = accounts
            .map(account => ({ account, inbox: this.findInbox(account.rootFolder) }))
            .filter(item => item.inbox && !['nntp', 'rss'].includes(item.account.type));
        const results = new Array(mailAccounts.length);
        let nextIndex = 0;
        const worker = async () => {
            while (nextIndex < mailAccounts.length) {
                const index = nextIndex;
                nextIndex += 1;
                results[index] = await this.listAccount(mailAccounts[index], options);
            }
        };
        const workerCount = Math.min(this.ACCOUNT_QUERY_CONCURRENCY, mailAccounts.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
        if (results.length && results.every(result => result.startupUnavailable)) {
            throw this.startupError('MAILBOXES_NOT_READY');
        }
        return results;
    },

    /** Bound one Thunderbird mail API read so a restored dashboard can always recover. */
    mailApiCall(operation, stage, timeoutMs = this.API_TIMEOUT_MS) {
        return RetryService.withTimeout(operation, {
            timeoutMs,
            code: 'THUNDERBIRD_MAIL_API_TIMEOUT',
            stage
        });
    },

    /** Create a stable diagnostic error for a Thunderbird startup readiness failure. */
    startupError(code, cause = null) {
        const error = new Error(code);
        error.code = code;
        if (cause) {
            error.cause = cause;
        }
        return error;
    },

    /** Limit automatic retries to expected Thunderbird startup readiness failures. */
    isStartupFailure(error) {
        return [
            'MAIL_ACCOUNTS_NOT_READY',
            'MAIL_ACCOUNTS_UNAVAILABLE',
            'MAILBOXES_NOT_READY'
        ].includes(error?.code);
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

    /** Mark every unique message as unread while isolating individual update failures. */
    async markAsUnread(messageIds) {
        return MailboxActionService.markAsUnread(messageIds);
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
    async listAccount({ account, inbox }, options = {}) {
        let messageList = null;
        let initialQueryCompleted = false;
        try {
            const query = {
                folderId: inbox.id,
                messagesPerPage: this.QUERY_PAGE_SIZE
            };
            if (options.includeRead !== true) {
                query.read = false;
            }
            messageList = await this.mailApiCall(
                () => browser.messages.query(query),
                `messages-query:${account.id}`
            );
            initialQueryCompleted = true;
            const messages = [...(messageList.messages || [])];
            while (messageList.id) {
                const listId = messageList.id;
                messageList = await this.mailApiCall(
                    () => browser.messages.continueList(listId),
                    `messages-continue:${account.id}`
                );
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
            console.error(`Could not query Inbox messages for account ${account.id}:`, error);
            return {
                accountId: account.id,
                accountName: account.name,
                inboxName: inbox.name,
                messages: [],
                failed: true,
                startupUnavailable: !initialQueryCompleted
            };
        } finally {
            if (messageList?.id && browser.messages.abortList) {
                const listId = messageList.id;
                await this.mailApiCall(
                    () => browser.messages.abortList(listId),
                    `messages-abort:${account.id}`,
                    this.ABORT_TIMEOUT_MS
                ).catch(error => {
                    console.warn(`Could not finalize message query ${listId}:`, error);
                });
            }
        }
    }
};

if (typeof window !== 'undefined') {
    window.GlobalMailService = GlobalMailService;
}
