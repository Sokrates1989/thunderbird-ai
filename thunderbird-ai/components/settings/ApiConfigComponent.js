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
        const details = SafeDom.create('details', { className: 'settings-collapsible' });
        this.elements.configurationSummary = SafeDom.create('span', {
            id: 'providerConfigurationSummary',
            className: 'settings-summary-status pending',
            attributes: { role: 'status' }
        });
        const summary = SafeDom.create('summary', {
            className: 'settings-collapsible-summary'
        }, [
            SafeDom.create('span', {
                className: 'settings-collapsible-title',
                text: I18n.t('apiConfigTitle')
            }),
            this.elements.configurationSummary
        ]);
        const content = SafeDom.create('div', {
            className: 'settings-collapsible-content'
        });

        this.elements.providerSelect = SafeDom.create('select', { id: 'aiProvider' });
        this.appendOptions(
            this.elements.providerSelect,
            Object.entries(CONFIG.AI.PROVIDERS).map(([value, definition]) => ({
                value,
                label: I18n.t(definition.labelKey)
            }))
        );
        this.elements.providerHelp = SafeDom.create('div', {
            id: 'providerHelp',
            className: 'help-text'
        });
        this.elements.tutorialButtonLabel = SafeDom.create('span', {
            id: 'providerTutorialButtonLabel'
        });
        this.elements.tutorialButton = SafeDom.create('button', {
            id: 'providerTutorialButton',
            className: 'btn provider-tutorial-button',
            properties: { type: 'button' }
        }, [
            SafeDom.create('span', {
                className: 'provider-tutorial-info-icon',
                text: 'i',
                attributes: { 'aria-hidden': 'true' }
            }),
            this.elements.tutorialButtonLabel
        ]);
        const providerGroup = this.createSettingGroup(
            'providerLabel',
            'aiProvider',
            [
                this.elements.providerSelect,
                this.elements.providerHelp,
                this.elements.tutorialButton
            ]
        );

        this.elements.endpointInput = SafeDom.create('input', {
            id: 'providerEndpoint',
            attributes: { type: 'url', spellcheck: 'false' }
        });
        this.elements.protocolSelect = SafeDom.create('select', { id: 'providerProtocol' });
        this.appendOptions(
            this.elements.protocolSelect,
            CONFIG.AI.PROTOCOLS.map(item => ({
                value: item.value,
                label: I18n.t(item.labelKey)
            }))
        );
        this.elements.authModeSelect = SafeDom.create('select', { id: 'providerAuthMode' });
        this.appendOptions(
            this.elements.authModeSelect,
            CONFIG.AI.AUTH_MODES.map(item => ({
                value: item.value,
                label: I18n.t(item.labelKey)
            }))
        );
        this.elements.defaultModelInput = SafeDom.create('input', {
            id: 'providerDefaultModel',
            attributes: { type: 'text', autocomplete: 'off' }
        });
        const connectionGrid = SafeDom.create('div', {
            className: 'provider-connection-grid'
        }, [
            this.createSettingGroup('providerEndpointLabel', 'providerEndpoint', [
                this.elements.endpointInput,
                SafeDom.create('div', {
                    className: 'help-text',
                    text: I18n.t('providerEndpointHelp')
                })
            ], 'provider-endpoint-setting'),
            this.createSettingGroup('providerProtocolLabel', 'providerProtocol', [
                this.elements.protocolSelect
            ], 'custom-provider-setting'),
            this.createSettingGroup('providerAuthLabel', 'providerAuthMode', [
                this.elements.authModeSelect
            ], 'custom-provider-setting'),
            this.createSettingGroup('providerDefaultModelLabel', 'providerDefaultModel', [
                this.elements.defaultModelInput,
                SafeDom.create('div', {
                    className: 'help-text',
                    text: I18n.t('providerDefaultModelHelp')
                })
            ], 'custom-provider-setting')
        ]);

        this.elements.apiKeyInput = SafeDom.create('input', {
            id: 'providerApiKey',
            attributes: { type: 'password', autocomplete: 'off' }
        });
        this.elements.apiKeyHelp = SafeDom.create('span', { id: 'apiKeyHelp' });
        this.elements.apiKeyLink = SafeDom.create('a', {
            id: 'providerApiKeyLink',
            attributes: { target: '_blank', rel: 'noopener noreferrer' }
        });
        const apiKeyHelp = SafeDom.create('div', { className: 'help-text' }, [
            this.elements.apiKeyHelp,
            this.elements.apiKeyLink
        ]);
        const apiKeyGroup = this.createSettingGroup('apiKeyLabel', 'providerApiKey', [
            this.elements.apiKeyInput,
            apiKeyHelp
        ]);

        this.elements.modelPresets = SafeDom.create('datalist', {
            id: 'providerModelPresets'
        });
        this.elements.modelInputs = {};
        const modelGrid = SafeDom.create('div', {
            className: 'model-task-grid',
            attributes: { 'aria-describedby': 'modelRoutingHelp' }
        });
        for (const definition of CONFIG.AI.MODEL_SETTINGS) {
            const input = SafeDom.create('input', {
                id: definition.property,
                attributes: {
                    type: 'text',
                    list: 'providerModelPresets',
                    autocomplete: 'off'
                },
                dataset: { modelProperty: definition.property }
            });
            this.elements.modelInputs[definition.property] = input;
            modelGrid.appendChild(SafeDom.create('div', {
                className: 'model-task-setting'
            }, [
                SafeDom.create('label', {
                    text: I18n.t(definition.labelKey),
                    attributes: { for: definition.property }
                }),
                input
            ]));
        }
        const modelGroup = SafeDom.create('div', { className: 'setting-group' }, [
            SafeDom.create('label', { text: I18n.t('modelRoutingTitle') }),
            SafeDom.create('div', {
                id: 'modelRoutingHelp',
                className: 'help-text',
                text: I18n.t('modelRoutingHelp')
            }),
            this.elements.modelPresets,
            modelGrid
        ]);

        content.append(providerGroup, connectionGrid, apiKeyGroup, modelGroup);
        details.append(summary, content);
        this.elements.tutorialDialog = this.createTutorialDialog();
        this.container.replaceChildren(details, this.elements.tutorialDialog);
    }

    /** Create a standard labeled provider setting group. */
    createSettingGroup(labelKey, controlId, children, extraClass = '') {
        return SafeDom.create('div', {
            className: `setting-group${extraClass ? ` ${extraClass}` : ''}`
        }, [
            SafeDom.create('label', {
                text: I18n.t(labelKey),
                attributes: { for: controlId }
            }),
            ...children
        ]);
    }

    /** Append literal option labels without parsing provider configuration as markup. */
    appendOptions(select, options) {
        for (const option of options) {
            select.appendChild(SafeDom.create('option', {
                text: option.label,
                properties: { value: option.value }
            }));
        }
    }

    /** Create the provider tutorial dialog while retaining direct element references. */
    createTutorialDialog() {
        this.elements.tutorialTitle = SafeDom.create('h2', { id: 'providerTutorialTitle' });
        this.elements.tutorialClose = SafeDom.create('button', {
            id: 'providerTutorialClose',
            className: 'provider-tutorial-close',
            text: '×',
            properties: { type: 'button' },
            attributes: { 'aria-label': I18n.t('close') }
        });
        this.elements.tutorialChecklist = SafeDom.create('ol', {
            id: 'providerTutorialChecklist',
            className: 'provider-tutorial-checklist'
        });
        this.elements.tutorialFullGuide = SafeDom.create('a', {
            id: 'providerTutorialFullGuide',
            attributes: { target: '_blank', rel: 'noopener noreferrer' }
        });
        this.elements.tutorialAllGuides = SafeDom.create('a', {
            id: 'providerTutorialAllGuides',
            attributes: { target: '_blank', rel: 'noopener noreferrer' }
        });
        const header = SafeDom.create('header', {
            className: 'provider-tutorial-header'
        }, [this.elements.tutorialTitle, this.elements.tutorialClose]);
        const documentation = SafeDom.create('aside', {
            className: 'provider-tutorial-documentation',
            attributes: {
                'aria-label': I18n.t('providerTutorialDocumentationTitle')
            }
        }, [
            SafeDom.create('strong', {
                text: I18n.t('providerTutorialDocumentationTitle')
            }),
            this.elements.tutorialFullGuide,
            this.elements.tutorialAllGuides
        ]);
        const panel = SafeDom.create('div', { className: 'provider-tutorial-panel' }, [
            header,
            this.elements.tutorialChecklist,
            documentation
        ]);
        return SafeDom.create('dialog', {
            id: 'providerTutorialDialog',
            className: 'provider-tutorial-dialog',
            attributes: { 'aria-labelledby': 'providerTutorialTitle' }
        }, [panel]);
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
        this.elements.apiKeyHelp.textContent = `${I18n.t('apiKeyHelp', {
            provider: I18n.t(definition.labelKey)
        })} `;
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
