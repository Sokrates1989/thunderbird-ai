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
            <h2>${I18n.t('apiConfigTitle')}</h2>
            <div class="setting-group">
                <label for="aiProvider">${I18n.t('providerLabel')}</label>
                <select id="aiProvider">${providerOptions}</select>
                <div class="help-text" id="providerHelp"></div>
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
        `;

        this.elements.providerSelect = document.getElementById('aiProvider');
        this.elements.providerHelp = document.getElementById('providerHelp');
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
