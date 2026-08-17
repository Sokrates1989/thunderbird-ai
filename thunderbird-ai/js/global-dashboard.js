/** Initialize the global toolbar dashboard and its opt-in AI actions. */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const expanded = new URLSearchParams(window.location.search).get('view') === 'expanded';
        document.body.classList.toggle('dashboard-expanded-view', expanded);
        await I18n.initialize();
        I18n.localizeDocument();
        const dashboardManager = new GlobalDashboardManager();
        await dashboardManager.initialize();
        window.globalDashboardManager = dashboardManager;
    } catch (error) {
        console.error('Failed to initialize the global dashboard:', error);
    }
});
