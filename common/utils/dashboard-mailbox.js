/** Execute destructive dashboard mailbox actions in the persistent background context. */
const DashboardMailboxService = {
    /** Delete unique messages and persist content-free progress diagnostics. */
    async deleteMessages(messageIds) {
        const uniqueIds = [...new Set(messageIds)]
            .filter(messageId => messageId !== undefined && messageId !== null);
        if (!uniqueIds.length) {
            return { success: true, data: null };
        }
        const browserVersion = await this.getBrowserVersion();
        const majorVersion = Number.parseInt(browserVersion.split('.')[0], 10);
        const structuredOptions = Number.isInteger(majorVersion) && majorVersion >= 137;
        const requestOptions = structuredOptions
            ? { deletePermanently: false, isUserAction: true }
            : false;
        const diagnostics = {
            code: 'DELETE_SUBMITTED',
            state: 'started',
            timestamp: new Date().toISOString(),
            browserVersion: browserVersion || 'unknown',
            requestMode: structuredOptions ? 'structured-user-action' : 'legacy-boolean',
            messageCount: uniqueIds.length,
            messageIds: uniqueIds
        };
        await this.saveDiagnostic(diagnostics);
        console.info('Submitting dashboard delete request to Thunderbird.', this.safeDiagnostic(diagnostics));

        try {
            await this.runDeleteWithTimeout(uniqueIds, requestOptions);
            const completed = {
                ...diagnostics,
                code: 'DELETE_API_COMPLETED',
                state: 'completed',
                timestamp: new Date().toISOString()
            };
            await this.saveDiagnostic(completed);
            console.info('Thunderbird completed dashboard delete request.', this.safeDiagnostic(completed));
            return { success: true, data: completed };
        } catch (error) {
            return this.deleteFailure(diagnostics, error);
        }
    },

    /** Bound a Thunderbird API call so a stalled provider cannot remain pending forever. */
    async runDeleteWithTimeout(messageIds, requestOptions, timeoutMs = 15000) {
        let timeoutId;
        try {
            await Promise.race([
                browser.messages.delete(messageIds, requestOptions),
                new Promise((_resolve, reject) => {
                    timeoutId = setTimeout(() => {
                        const error = new Error(`Thunderbird did not finish deletion within ${timeoutMs} ms.`);
                        error.code = 'DELETE_API_TIMEOUT';
                        reject(error);
                    }, timeoutMs);
                })
            ]);
        } finally {
            clearTimeout(timeoutId);
        }
    },

    async deleteFailure(diagnostics, error) {
        const timedOut = error?.code === 'DELETE_API_TIMEOUT';
        const failed = {
            ...diagnostics,
            code: timedOut ? 'DELETE_API_TIMEOUT' : 'DELETE_API_FAILED',
            state: timedOut ? 'timed-out' : 'failed',
            timestamp: new Date().toISOString(),
            technicalError: String(error?.message || error || 'Unknown delete error')
        };
        await this.saveDiagnostic(failed);
        console.error('Dashboard delete request failed in the background.', {
            ...this.safeDiagnostic(failed),
            technicalError: failed.technicalError
        });
        return {
            success: false,
            error: I18n.t(timedOut ? 'dashboardTrashTimedOut' : 'dashboardTrashFailed'),
            data: failed
        };
    },

    async getBrowserVersion() {
        try {
            const browserInfo = await browser.runtime.getBrowserInfo();
            return String(browserInfo?.version || '');
        } catch (error) {
            console.warn('Could not determine Thunderbird version for dashboard deletion:', error);
            return '';
        }
    },

    async saveDiagnostic(diagnostics) {
        try {
            await browser.storage.local.set({
                [CONFIG.STORAGE_KEYS.DASHBOARD_DELETE_DIAGNOSTIC]: diagnostics
            });
        } catch (error) {
            console.warn('Could not persist dashboard delete diagnostic:', error);
        }
    },

    /** Exclude internal message identifiers from inspectable console output. */
    safeDiagnostic(diagnostics) {
        const { messageIds: _messageIds, ...safeDiagnostics } = diagnostics;
        return safeDiagnostics;
    }
};

globalThis.DashboardMailboxService = DashboardMailboxService;
