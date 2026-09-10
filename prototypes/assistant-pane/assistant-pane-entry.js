/** Initialize the embedded assistant pane after its localized document is ready. */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await I18n.initialize();
        I18n.localizeDocument();
        const manager = new AssistantPaneManager();
        await manager.initialize();
        globalThis.assistantPaneManager = manager;
        window.addEventListener('unload', () => manager.cleanup(), { once: true });
    } catch (error) {
        console.error('Could not initialize the assistant pane.', error);
    }
});
