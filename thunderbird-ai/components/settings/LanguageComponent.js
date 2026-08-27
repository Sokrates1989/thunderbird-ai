/** Explicit extension-language setting shared by every Assistant surface. */
const LanguageComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('language-section');
        this.elements = {};
        this.initialize();
    }

    initialize() {
        const heading = SafeDom.create('h2', { text: I18n.t('languageSectionTitle') });
        const group = SafeDom.create('div', { className: 'setting-group' });
        const label = SafeDom.create('label', {
            text: I18n.t('languageLabel'),
            attributes: { for: 'uiLanguage' }
        });
        this.elements.languageSelect = SafeDom.create('select', { id: 'uiLanguage' });
        for (const [value, key] of [
            ['de', 'languageGerman'],
            ['en', 'languageEnglish']
        ]) {
            this.elements.languageSelect.appendChild(SafeDom.create('option', {
                text: I18n.t(key),
                properties: { value }
            }));
        }
        const help = SafeDom.create('div', {
            className: 'help-text',
            text: I18n.t('languageHint')
        });
        group.append(label, this.elements.languageSelect, help);
        this.container.replaceChildren(heading, group);
        this.elements.languageSelect.value = I18n.getLanguage();
        this.elements.languageSelect.addEventListener('change', event => {
            this.settingsManager.notifySettingChanged('uiLanguage', event.target.value);
        });
    }

    getCurrentValues() {
        return { uiLanguage: this.elements.languageSelect.value };
    }

    updateDisplay(settings) {
        this.elements.languageSelect.value = settings.uiLanguage || I18n.getLanguage();
    }
};

if (typeof window !== 'undefined') {
    window.LanguageComponent = LanguageComponent;
}
