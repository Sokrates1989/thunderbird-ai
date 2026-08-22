/** Initialize the global toolbar dashboard and its opt-in AI actions. */
document.addEventListener('DOMContentLoaded', async () => {
    RuntimeDiagnosticService.installGlobalHandlers('dashboard');
    try {
        await RuntimeDiagnosticService.run('dashboard', 'initialize', async () => {
            let recovery = null;
            try {
                recovery = await RetryService.sendRuntimeMessage({
                    action: CONFIG.ACTIONS.PREPARE_RESTORED_DASHBOARD
                }, {
                    timeoutMs: CONFIG.UI.BACKGROUND_INITIALIZATION_WAIT_TIMEOUT_MS,
                    stage: 'prepare-restored-dashboard'
                });
            } catch (error) {
                console.warn('Could not prepare the restored dashboard; continuing in place.', error);
            }
            const currentParameters = new URLSearchParams(window.location.search);
            const needsCurrentReleaseDocument = recovery?.success === true
                && recovery.data?.recentInstall === true
                && currentParameters.get('release') !== CONFIG.ADDON_VERSION;
            if (recovery?.success === true
                && (recovery.data?.reloadRequired === true || needsCurrentReleaseDocument)) {
                const recoveryUrl = new URL(browser.runtime.getURL('global-dashboard.html'));
                if (currentParameters.get('view') === 'expanded') {
                    recoveryUrl.searchParams.set('view', 'expanded');
                }
                recoveryUrl.searchParams.set('source', 'post-install-recovery');
                recoveryUrl.searchParams.set('release', CONFIG.ADDON_VERSION);
                window.location.replace(recoveryUrl.href);
                return;
            }
            const expanded = new URLSearchParams(window.location.search).get('view') === 'expanded';
            document.body.classList.toggle('dashboard-expanded-view', expanded);
            await I18n.initialize();
            I18n.localizeDocument();
            const dashboardManager = new GlobalDashboardManager();
            await dashboardManager.initialize();
            const scrollTargets = [window];
            if (!expanded) {
                scrollTargets.push(document.getElementById('dashboardAccounts'));
            }
            const scrollToTopComponent = new ScrollToTopComponent({
                button: document.getElementById('scrollToTopButton'),
                scrollTargets
            });
            scrollToTopComponent.initialize();
            window.globalDashboardManager = dashboardManager;
            window.dashboardScrollToTopComponent = scrollToTopComponent;
        });
    } catch (error) {
        console.error('Failed to initialize the global dashboard:', error);
    }
});
