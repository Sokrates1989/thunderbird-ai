/** Registers the prototype pane toggle in existing and newly created mail tabs. */
(function initializeAssistantPanePrototype() {
    const WIDTH_STORAGE_KEY = 'assistantPanePrototypeWidth';
    const DEFAULT_WIDTH = 380;
    const retryTimers = new Map();

    /** Retry briefly while a newly created mail tab is still constructing about:3pane. */
    async function ensureButton(tabId, attempt = 0) {
        if (tabId === undefined || tabId === null) {
            return;
        }
        const registered = await browser.aiAssistantPane.ensureButton(tabId);
        if (registered || attempt >= 4) {
            retryTimers.delete(tabId);
            return;
        }
        const timer = setTimeout(() => {
            retryTimers.delete(tabId);
            void ensureButton(tabId, attempt + 1).catch(error => {
                console.warn('Could not register the assistant pane toggle.', error);
            });
        }, 300 * (attempt + 1));
        retryTimers.set(tabId, timer);
    }

    /** Detect mail tabs without relying on a single Thunderbird tab-shape version. */
    function isMailTab(tab) {
        return tab?.type === 'mail' || tab?.mailTab === true;
    }

    /** Initialize persistence and attach the privileged UI to all available mail tabs. */
    async function start() {
        const stored = await browser.storage.local.get(WIDTH_STORAGE_KEY);
        const width = Number(stored[WIDTH_STORAGE_KEY]) || DEFAULT_WIDTH;
        await browser.aiAssistantPane.initialize(width);
        browser.aiAssistantPane.onWidthChanged.addListener((_tabId, nextWidth) => {
            void browser.storage.local.set({ [WIDTH_STORAGE_KEY]: nextWidth }).catch(error => {
                console.warn('Could not save the assistant pane width.', error);
            });
        });
        browser.tabs.onCreated.addListener(tab => {
            if (isMailTab(tab)) {
                void ensureButton(tab.id).catch(error => {
                    console.warn('Could not register a new assistant pane toggle.', error);
                });
            }
        });
        browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && isMailTab(tab)) {
                void ensureButton(tabId).catch(error => {
                    console.warn('Could not refresh the assistant pane toggle.', error);
                });
            }
        });
        browser.tabs.onRemoved.addListener(tabId => {
            const timer = retryTimers.get(tabId);
            if (timer !== undefined) {
                clearTimeout(timer);
                retryTimers.delete(tabId);
            }
        });
        const tabs = await browser.tabs.query({});
        await Promise.all(tabs.filter(isMailTab).map(tab => ensureButton(tab.id)));
    }

    void start().catch(error => {
        console.error('Could not initialize the assistant pane prototype.', error);
    });
})();
