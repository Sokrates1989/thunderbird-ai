/** Initialize the help page using the persisted extension language. */
document.addEventListener('DOMContentLoaded', async () => {
    await I18n.initialize();
    I18n.localizeDocument();
});
