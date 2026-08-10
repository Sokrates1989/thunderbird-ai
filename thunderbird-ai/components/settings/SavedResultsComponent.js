/** Displays, copies, and removes results explicitly saved by the user. */
const SavedResultsComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('saved-results-section');
        this.initialize();
    }

    async initialize() {
        await this.loadResults();
    }

    async loadResults() {
        const results = await StorageManager.get(CONFIG.STORAGE_KEYS.SAVED_RESULTS, []);
        this.container.replaceChildren();

        const heading = document.createElement('h2');
        heading.textContent = `💾 ${I18n.t('savedResults')}`;
        this.container.appendChild(heading);
        if (!results.length) {
            const empty = document.createElement('p');
            empty.className = 'help-text';
            empty.textContent = I18n.t('noSavedResults');
            this.container.appendChild(empty);
            return;
        }

        for (const [index, result] of results.entries()) {
            const item = document.createElement('details');
            item.className = 'saved-result';
            const summary = document.createElement('summary');
            const date = result.savedAt
                ? new Date(result.savedAt).toLocaleString(I18n.getLanguage())
                : '';
            summary.textContent = `${result.title || 'Ergebnis'} · ${date}`;
            const content = document.createElement('pre');
            content.textContent = result.content || '';
            const actions = document.createElement('div');
            actions.className = 'saved-result-actions';
            actions.append(
                this.createButton(I18n.t('copy'), async () => {
                    await navigator.clipboard.writeText(result.content || '');
                    this.settingsManager.showStatus(I18n.t('copied'), 'success');
                }),
                this.createButton(I18n.t('delete'), async () => {
                    results.splice(index, 1);
                    await StorageManager.set(CONFIG.STORAGE_KEYS.SAVED_RESULTS, results);
                    await this.loadResults();
                })
            );
            item.append(summary, content, actions);
            this.container.appendChild(item);
        }
    }

    createButton(label, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn secondary saved-result-button';
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    }

    cleanup() {}
};

if (typeof window !== 'undefined') {
    window.SavedResultsComponent = SavedResultsComponent;
}
