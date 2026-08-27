/**
 * Executes ordinary Thunderbird message actions for every extension surface.
 * UI components remain responsible for confirmation, progress, and result text.
 */
const MailboxActionService = {
    /** Normalize message ids once so bulk and single-message callers behave identically. */
    uniqueMessageIds(messageIds) {
        return [...new Set(messageIds)]
            .filter(messageId => messageId !== undefined && messageId !== null);
    },

    /** Set a read state while keeping an individual Thunderbird failure isolated. */
    async setReadStatus(messageIds, read) {
        const uniqueIds = this.uniqueMessageIds(messageIds);
        const results = await Promise.allSettled(
            uniqueIds.map(messageId => browser.messages.update(messageId, { read }))
        );
        return results.reduce((summary, result, index) => {
            const target = result.status === 'fulfilled' ? summary.updatedIds : summary.failedIds;
            target.push(uniqueIds[index]);
            return summary;
        }, { updatedIds: [], failedIds: [] });
    },

    /** Mark messages as read. */
    async markAsRead(messageIds) {
        return this.setReadStatus(messageIds, true);
    },

    /** Mark messages as unread. */
    async markAsUnread(messageIds) {
        return this.setReadStatus(messageIds, false);
    },

    /** Archive messages through Thunderbird so account-specific archive settings are honored. */
    async archive(messageIds) {
        const uniqueIds = this.uniqueMessageIds(messageIds);
        if (uniqueIds.length) {
            await browser.messages.archive(uniqueIds);
        }
        return { archivedIds: uniqueIds };
    },

    /** Delegate trash operations to the persistent background context. */
    async moveToTrash(messageIds) {
        const uniqueIds = this.uniqueMessageIds(messageIds);
        if (!uniqueIds.length) {
            return null;
        }
        const response = await RetryService.sendRuntimeMessage({
            action: CONFIG.ACTIONS.DASHBOARD_TRASH_MESSAGES,
            messageIds: uniqueIds
        });
        if (!response?.success) {
            const error = new Error(response?.error || I18n.t('dashboardTrashFailed'));
            error.diagnostics = response?.data || null;
            throw error;
        }
        return response.data;
    }
};

globalThis.MailboxActionService = MailboxActionService;
