/** Explicit extension-language setting shared by every Assistant surface. */
const LanguageComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('language-section');
        this.elements = {};
        this.initialize();
    }

    initialize() {
        this.container.innerHTML = `
            <h2>${I18n.t('languageSectionTitle')}</h2>
            <div class="setting-group">
                <label for="uiLanguage">${I18n.t('languageLabel')}</label>
                <select id="uiLanguage">
                    <option value="de">${I18n.t('languageGerman')}</option>
                    <option value="en">${I18n.t('languageEnglish')}</option>
                </select>
                <div class="help-text">${I18n.t('languageHint')}</div>
            </div>`;
        this.elements.languageSelect = document.getElementById('uiLanguage');
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
