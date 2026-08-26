/** Provider selection, credentials, endpoint, and per-task model settings. */
const ApiConfigComponent = class {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.container = document.getElementById('api-config-section');
        this.elements = {};
        this.activeProvider = CONFIG.AI.DEFAULT_PROVIDER;
        this.providerConfigurations = globalThis.StorageManager
            .normalizeProviderConfigurations({});
        this.createUI();
        this.renderActiveProvider();
        this.attachEventListeners();
    }

    /** Build the provider form once; dynamic values are assigned through DOM properties. */
    createUI() {
        const providerOptions = Object.entries(CONFIG.AI.PROVIDERS)
            .map(([providerId, definition]) => (
                `<option value="${providerId}">${I18n.t(definition.labelKey)}</option>`
            ))
            .join('');
        const protocolOptions = CONFIG.AI.PROTOCOLS
            .map(item => `<option value="${item.value}">${I18n.t(item.labelKey)}</option>`)
            .join('');
        const authOptions = CONFIG.AI.AUTH_MODES
            .map(item => `<option value="${item.value}">${I18n.t(item.labelKey)}</option>`)
            .join('');
        const taskInputs = CONFIG.AI.MODEL_SETTINGS.map(definition => `
            <div class="model-task-setting">
                <label for="${definition.property}">${I18n.t(definition.labelKey)}</label>
                <input id="${definition.property}" type="text"
                    data-model-property="${definition.property}"
                    list="providerModelPresets" autocomplete="off" />
            </div>
        `).join('');
        this.container.innerHTML = `
            <details class="settings-collapsible">
                <summary class="settings-collapsible-summary">
                    <span class="settings-collapsible-title">${I18n.t('apiConfigTitle')}</span>
                    <span id="providerConfigurationSummary"
                        class="settings-summary-status pending" role="status"></span>
                </summary>
                <div class="settings-collapsible-content">
                    <div class="setting-group">
                        <label for="aiProvider">${I18n.t('providerLabel')}</label>
                        <select id="aiProvider">${providerOptions}</select>
                        <div class="help-text" id="providerHelp"></div>
                        <button type="button" id="providerTutorialButton"
                            class="btn provider-tutorial-button">
                            <span aria-hidden="true">?</span>
                            <span id="providerTutorialButtonLabel"></span>
                        </button>
                    </div>

                    <div class="provider-connection-grid">
                        <div class="setting-group provider-endpoint-setting">
                            <label for="providerEndpoint">${I18n.t('providerEndpointLabel')}</label>
                            <input id="providerEndpoint" type="url" spellcheck="false" />
                            <div class="help-text">${I18n.t('providerEndpointHelp')}</div>
                        </div>
                        <div class="setting-group custom-provider-setting">
                            <label for="providerProtocol">${I18n.t('providerProtocolLabel')}</label>
                            <select id="providerProtocol">${protocolOptions}</select>
                        </div>
                        <div class="setting-group custom-provider-setting">
                            <label for="providerAuthMode">${I18n.t('providerAuthLabel')}</label>
                            <select id="providerAuthMode">${authOptions}</select>
                        </div>
                        <div class="setting-group custom-provider-setting">
                            <label for="providerDefaultModel">${I18n.t('providerDefaultModelLabel')}</label>
                            <input id="providerDefaultModel" type="text" autocomplete="off" />
                            <div class="help-text">${I18n.t('providerDefaultModelHelp')}</div>
                        </div>
                    </div>

                    <div class="setting-group">
                        <label for="providerApiKey">${I18n.t('apiKeyLabel')}</label>
                        <input type="password" id="providerApiKey" autocomplete="off" />
                        <div class="help-text">
                            <span id="apiKeyHelp"></span>
                            <a id="providerApiKeyLink" target="_blank" rel="noopener noreferrer"></a>
                        </div>
                    </div>

                    <div class="setting-group">
                        <label>${I18n.t('modelRoutingTitle')}</label>
                        <div class="help-text" id="modelRoutingHelp">${I18n.t('modelRoutingHelp')}</div>
                        <datalist id="providerModelPresets"></datalist>
                        <div class="model-task-grid" aria-describedby="modelRoutingHelp">${taskInputs}</div>
                    </div>
                </div>
            </details>

            <dialog id="providerTutorialDialog" class="provider-tutorial-dialog"
                aria-labelledby="providerTutorialTitle">
                <div class="provider-tutorial-panel">
                    <header class="provider-tutorial-header">
                        <h2 id="providerTutorialTitle"></h2>
                        <button type="button" id="providerTutorialClose"
                            class="provider-tutorial-close" aria-label="${I18n.t('close')}">×</button>
                    </header>
                    <ol id="providerTutorialChecklist" class="provider-tutorial-checklist"></ol>
                    <aside class="provider-tutorial-documentation"
                        aria-label="${I18n.t('providerTutorialDocumentationTitle')}">
                        <strong>${I18n.t('providerTutorialDocumentationTitle')}</strong>
                        <a id="providerTutorialFullGuide" target="_blank"
                            rel="noopener noreferrer"></a>
                        <a id="providerTutorialAllGuides" target="_blank"
                            rel="noopener noreferrer"></a>
                    </aside>
                </div>
            </dialog>
        `;

        this.elements.configurationSummary = document.getElementById(
            'providerConfigurationSummary'
        );
        this.elements.providerSelect = document.getElementById('aiProvider');
        this.elements.providerHelp = document.getElementById('providerHelp');
        this.elements.tutorialButton = document.getElementById('providerTutorialButton');
        this.elements.tutorialButtonLabel = document.getElementById(
            'providerTutorialButtonLabel'
        );
        this.elements.tutorialDialog = document.getElementById('providerTutorialDialog');
        this.elements.tutorialTitle = document.getElementById('providerTutorialTitle');
        this.elements.tutorialChecklist = document.getElementById(
            'providerTutorialChecklist'
        );
        this.elements.tutorialFullGuide = document.getElementById(
            'providerTutorialFullGuide'
        );
        this.elements.tutorialAllGuides = document.getElementById(
            'providerTutorialAllGuides'
        );
        this.elements.tutorialClose = document.getElementById('providerTutorialClose');
        this.elements.endpointInput = document.getElementById('providerEndpoint');
        this.elements.protocolSelect = document.getElementById('providerProtocol');
        this.elements.authModeSelect = document.getElementById('providerAuthMode');
        this.elements.defaultModelInput = document.getElementById('providerDefaultModel');
        this.elements.apiKeyInput = document.getElementById('providerApiKey');
        this.elements.apiKeyHelp = document.getElementById('apiKeyHelp');
        this.elements.apiKeyLink = document.getElementById('providerApiKeyLink');
        this.elements.modelPresets = document.getElementById('providerModelPresets');
        this.elements.modelInputs = Object.fromEntries(
            [...this.container.querySelectorAll('[data-model-property]')]
                .map(input => [input.dataset.modelProperty, input])
        );
    }

    attachEventListeners() {
        this.elements.tutorialButton.addEventListener('click', () => {
            this.openProviderTutorial();
        });
        this.elements.tutorialClose.addEventListener('click', () => {
            this.elements.tutorialDialog.close();
        });
        this.elements.tutorialDialog.addEventListener('click', event => {
            if (event.target === this.elements.tutorialDialog) {
                this.elements.tutorialDialog.close();
            }
        });
        this.elements.providerSelect.addEventListener('change', event => {
            this.captureActiveConfiguration();
            this.activeProvider = globalThis.AIProviderService.normalizeProviderId(
                event.target.value
            );
            this.renderActiveProvider();
            this.notifyChanged();
        });
        const connectionInputs = [
            this.elements.endpointInput,
            this.elements.protocolSelect,
            this.elements.authModeSelect,
            this.elements.defaultModelInput,
            this.elements.apiKeyInput
        ];
        for (const input of connectionInputs) {
            input.addEventListener('input', () => {
                this.captureActiveConfiguration();
                this.validateVisibleConfiguration();
                this.notifyChanged();
            });
        }
        for (const input of Object.values(this.elements.modelInputs)) {
            input.addEventListener('input', () => {
                this.captureActiveConfiguration();
                this.notifyChanged();
            });
        }
    }

    /** Preserve the visible provider fields before switching provider or saving. */
    captureActiveConfiguration() {
        if (!this.providerConfigurations[this.activeProvider]) {
            return;
        }
        const taskModels = {};
        for (const definition of CONFIG.AI.MODEL_SETTINGS) {
            const value = this.elements.modelInputs[definition.property].value.trim();
            for (const task of definition.tasks) {
                taskModels[task] = value;
            }
        }
        this.providerConfigurations[this.activeProvider] = globalThis.AIProviderService
            .normalizeConfiguration(this.activeProvider, {
                ...this.providerConfigurations[this.activeProvider],
                baseUrl: this.elements.endpointInput.value,
                protocol: this.elements.protocolSelect.value,
                authMode: this.elements.authModeSelect.value,
                defaultModel: this.elements.defaultModelInput.value,
                apiKey: this.elements.apiKeyInput.value,
                taskModels
            });
    }

    /** Render one provider without placing persisted credentials into generated markup. */
    renderActiveProvider() {
        const definition = CONFIG.AI.PROVIDERS[this.activeProvider];
        const configuration = this.providerConfigurations[this.activeProvider];
        const custom = this.activeProvider === 'custom';
        this.elements.providerSelect.value = this.activeProvider;
        this.elements.endpointInput.value = configuration.baseUrl;
        this.elements.endpointInput.readOnly = !custom;
        this.elements.protocolSelect.value = configuration.protocol;
        this.elements.authModeSelect.value = configuration.authMode;
        this.elements.defaultModelInput.value = configuration.defaultModel;
        this.elements.apiKeyInput.value = configuration.apiKey;
        this.elements.apiKeyInput.placeholder = definition.apiKeyRequired
            ? I18n.t('apiKeyRequiredPlaceholder')
            : I18n.t('apiKeyOptionalPlaceholder');
        this.elements.providerHelp.textContent = I18n.t({
            openai: 'providerHelpOpenAI',
            anthropic: 'providerHelpAnthropic',
            mistral: 'providerHelpMistral',
            deepseek: 'providerHelpDeepSeek',
            custom: 'providerHelpCustom'
        }[this.activeProvider]);
        this.elements.tutorialButtonLabel.textContent = I18n.t(
            custom ? 'providerTutorialCustomButton' : 'providerTutorialButton',
            { provider: I18n.t(definition.labelKey) }
        );
        this.elements.apiKeyHelp.textContent = I18n.t('apiKeyHelp', {
            provider: I18n.t(definition.labelKey)
        });
        this.elements.apiKeyLink.hidden = !definition.apiKeyUrl;
        this.elements.apiKeyLink.href = definition.apiKeyUrl || '#';
        this.elements.apiKeyLink.textContent = I18n.t('apiKeyLink', {
            provider: I18n.t(definition.labelKey)
        });
        for (const element of this.container.querySelectorAll('.custom-provider-setting')) {
            element.hidden = !custom;
        }
        this.renderModelPresets(definition.modelPresets);
        for (const modelDefinition of CONFIG.AI.MODEL_SETTINGS) {
            const task = modelDefinition.tasks[0];
            this.elements.modelInputs[modelDefinition.property].value =
                configuration.taskModels[task] || 'auto';
        }
        this.validateVisibleConfiguration();
    }

    /** Resolve provider-specific and overview guides in the active UI language. */
    providerGuideUrls(providerId = this.activeProvider, language = I18n.getLanguage()) {
        const provider = globalThis.AIProviderService.normalizeProviderId(providerId);
        const guidePath = CONFIG.AI.PROVIDERS[provider].guidePath;
        const languageSuffix = language === 'de' ? '.de' : '';
        const baseUrl = 'https://github.com/Sokrates1989/thunderbird-ai/blob/main/docs/api-keys';
        return {
            provider: `${baseUrl}/${guidePath}/README${languageSuffix}.md`,
            allProviders: `${baseUrl}/README${languageSuffix}.md`
        };
    }

    /** Build the selected provider's short checklist and open it as a modal guide. */
    openProviderTutorial() {
        const definition = CONFIG.AI.PROVIDERS[this.activeProvider];
        const providerLabel = I18n.t(definition.labelKey);
        const startUrl = definition.tutorialUrl || definition.apiKeyUrl;
        const guideUrls = this.providerGuideUrls();
        this.elements.tutorialTitle.textContent = I18n.t('providerTutorialTitle', {
            provider: providerLabel
        });
        this.elements.tutorialChecklist.replaceChildren();

        const linkItem = document.createElement('li');
        const startLink = document.createElement('a');
        startLink.href = startUrl;
        startLink.target = '_blank';
        startLink.rel = 'noopener noreferrer';
        startLink.textContent = I18n.t(definition.tutorialLinkKey);
        linkItem.append(startLink);
        this.elements.tutorialChecklist.append(linkItem);

        for (const stepKey of definition.tutorialStepKeys) {
            const item = document.createElement('li');
            item.textContent = I18n.t(stepKey);
            this.elements.tutorialChecklist.append(item);
        }

        this.elements.tutorialFullGuide.href = guideUrls.provider;
        this.elements.tutorialFullGuide.textContent = I18n.t('providerTutorialFullGuide');
        this.elements.tutorialAllGuides.href = guideUrls.allProviders;
        this.elements.tutorialAllGuides.textContent = I18n.t(
            'providerTutorialAllGuides'
        );
        this.elements.tutorialDialog.showModal();
    }

    renderModelPresets(presets) {
        this.elements.modelPresets.replaceChildren();
        for (const model of ['auto', ...presets]) {
            const option = document.createElement('option');
            option.value = model;
            this.elements.modelPresets.append(option);
        }
    }

    /** Mark only locally detectable configuration problems; the test action verifies the API. */
    validateVisibleConfiguration() {
        const configuration = this.getActiveProviderConfiguration(false);
        const definition = CONFIG.AI.PROVIDERS[this.activeProvider];
        const apiKeyInvalid = definition.apiKeyRequired && !configuration.apiKey;
        this.elements.apiKeyInput.classList.toggle('invalid', apiKeyInvalid);
        this.elements.apiKeyInput.classList.toggle('valid', !apiKeyInvalid && Boolean(configuration.apiKey));
        const endpointValid = Boolean(globalThis.AIProviderService.resolveEndpoint(
            configuration,
            false
        ));
        this.elements.endpointInput.classList.toggle('invalid', !endpointValid);
        this.elements.endpointInput.classList.toggle('valid', endpointValid);
        this.renderConfigurationSummary(configuration);
    }

    /** Keep the collapsed header useful without exposing credentials or endpoint details. */
    renderConfigurationSummary(configuration) {
        const configured = globalThis.AIProviderService.isConfigured(configuration);
        this.elements.configurationSummary.textContent = configured
            ? globalThis.AIProviderService.providerLabel(configuration.provider)
            : I18n.t('providerNotConfiguredSummary');
        this.elements.configurationSummary.className =
            `settings-summary-status ${configured ? 'configured' : 'error'}`;
    }

    getActiveProviderConfiguration(capture = true) {
        if (capture) {
            this.captureActiveConfiguration();
        }
        return this.providerConfigurations[this.activeProvider];
    }

    /** Request only the exact custom endpoint origin from a direct user action. */
    async ensureEndpointPermission() {
        const configuration = this.getActiveProviderConfiguration();
        if (configuration.provider !== 'custom') {
            return true;
        }
        const origin = globalThis.AIProviderService.endpointPermission(configuration);
        return browser.permissions.request({ origins: [origin] });
    }

    notifyChanged() {
        this.settingsManager.notifySettingChanged('aiProvider', this.activeProvider);
        this.settingsManager.notifySettingChanged(
            'aiProviderConfigurations',
            this.providerConfigurations
        );
    }

    getCurrentValues() {
        this.captureActiveConfiguration();
        return {
            aiProvider: this.activeProvider,
            aiProviderConfigurations: this.providerConfigurations
        };
    }

    updateDisplay(settings) {
        this.providerConfigurations = globalThis.StorageManager.normalizeProviderConfigurations(
            settings.aiProviderConfigurations,
            { apiKey: settings.openaiApiKey, model: settings.model }
        );
        this.activeProvider = globalThis.AIProviderService.normalizeProviderId(
            settings.aiProvider
        );
        this.renderActiveProvider();
    }
};

if (typeof window !== 'undefined') {
    window.ApiConfigComponent = ApiConfigComponent;
}
