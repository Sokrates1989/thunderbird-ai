/** Initialize the global toolbar dashboard and its opt-in AI actions. */
document.addEventListener('DOMContentLoaded', async () => {
    RuntimeDiagnosticService.installGlobalHandlers('dashboard');
    try {
        await RuntimeDiagnosticService.run('dashboard', 'initialize', async () => {
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
