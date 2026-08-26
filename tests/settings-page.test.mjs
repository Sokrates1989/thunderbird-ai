import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { createContext, loadScript, repositoryRoot } from '../test-support/load-script.mjs';

function source(relativePath) {
    return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

test('model selectors are compact self-contained cards instead of detached grid rows', () => {
    const styles = source('thunderbird-ai/styles/settings.css');
    const apiConfig = source('thunderbird-ai/components/settings/ApiConfigComponent.js');

    assert.match(styles, /\.model-task-setting\s*\{[^}]*gap:\s*6px;[^}]*border:/su);
    assert.match(styles, /\.model-task-setting label\s*\{[^}]*margin:\s*0;/su);
    assert.doesNotMatch(styles, /\.model-task-setting label\s*\{[^}]*min-height:/su);
    assert.match(apiConfig, /class="model-task-grid" aria-describedby="modelRoutingHelp"/u);
});

test('settings expose built-in and compatible custom AI provider controls', () => {
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const apiConfig = source('thunderbird-ai/components/settings/ApiConfigComponent.js');
    const manifest = JSON.parse(source('thunderbird-ai/manifest.json'));

    assert.match(settingsPage, /ai-provider\.js/u);
    assert.match(apiConfig, /id="aiProvider"/u);
    assert.match(apiConfig, /id="providerEndpoint"/u);
    assert.match(apiConfig, /id="providerProtocol"/u);
    assert.match(apiConfig, /ensureEndpointPermission\(\)/u);
    assert.match(apiConfig, /browser\.permissions\.request/u);
    assert.deepEqual(manifest.host_permissions, [
        'https://api.openai.com/*',
        'https://api.anthropic.com/*',
        'https://api.mistral.ai/*',
        'https://api.deepseek.com/*'
    ]);
    assert.deepEqual(manifest.optional_host_permissions, [
        'https://*/*',
        'http://localhost/*',
        'http://127.0.0.1/*'
    ]);
});

test('large settings sections start collapsed and summarize provider readiness', () => {
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const apiConfig = source('thunderbird-ai/components/settings/ApiConfigComponent.js');
    const archiveSettings = source(
        'thunderbird-ai/components/settings/ArchiveSettingsGuideComponent.js'
    );
    const supportDiagnostics = source(
        'thunderbird-ai/components/settings/SupportDiagnosticsComponent.js'
    );

    assert.match(apiConfig, /<details class="settings-collapsible">/u);
    assert.match(apiConfig, /id="providerConfigurationSummary"/u);
    assert.doesNotMatch(apiConfig, /<details class="settings-collapsible" open>/u);
    assert.match(archiveSettings, /<details class="settings-collapsible">/u);
    assert.doesNotMatch(archiveSettings, /<details class="settings-collapsible" open>/u);
    assert.match(supportDiagnostics, /<details class="support-diagnostics-details">/u);
    assert.doesNotMatch(supportDiagnostics, /support-diagnostics-details" open/u);
    assert.ok(
        settingsPage.indexOf('id="support-diagnostics-section"')
            > settingsPage.indexOf('id="score-archive-section"')
    );
});

test('provider summary distinguishes a configured provider from a missing key', () => {
    const context = createContext({
        browser: { i18n: { getUILanguage: () => 'en-US' } }
    });
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    loadScript(context, 'thunderbird-ai/components/settings/ApiConfigComponent.js');
    const component = Object.create(context.ApiConfigComponent.prototype);
    component.elements = {
        configurationSummary: { textContent: '', className: '' }
    };

    const missingKey = context.AIProviderService.normalizeConfiguration('openai', {
        apiKey: ''
    });
    component.renderConfigurationSummary(missingKey);
    assert.equal(component.elements.configurationSummary.textContent, '⚠ Not configured yet');
    assert.equal(component.elements.configurationSummary.className, 'settings-summary-status error');

    const configured = context.AIProviderService.normalizeConfiguration('openai', {
        apiKey: 'test-key'
    });
    component.renderConfigurationSummary(configured);
    assert.equal(component.elements.configurationSummary.textContent, 'OpenAI');
    assert.equal(
        component.elements.configurationSummary.className,
        'settings-summary-status configured'
    );
});

test('provider API-key tutorial covers every provider in English and German', () => {
    const context = createContext({
        browser: { i18n: { getUILanguage: () => 'en-US' } }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    loadScript(context, 'thunderbird-ai/components/settings/ApiConfigComponent.js');
    const component = Object.create(context.ApiConfigComponent.prototype);

    for (const [providerId, definition] of Object.entries(context.CONFIG.AI.PROVIDERS)) {
        assert.ok(definition.guidePath, `${providerId} needs a guide path`);
        assert.ok(
            definition.tutorialUrl || definition.apiKeyUrl,
            `${providerId} needs a tutorial start URL`
        );
        for (const key of [definition.tutorialLinkKey, ...definition.tutorialStepKeys]) {
            assert.ok(context.LOCALE_MESSAGES.en[key], `Missing English key ${key}`);
            assert.ok(context.LOCALE_MESSAGES.de[key], `Missing German key ${key}`);
        }
        assert.equal(
            fs.existsSync(path.join(
                repositoryRoot,
                'docs',
                'api-keys',
                definition.guidePath,
                'README.md'
            )),
            true
        );
        assert.equal(
            fs.existsSync(path.join(
                repositoryRoot,
                'docs',
                'api-keys',
                definition.guidePath,
                'README.de.md'
            )),
            true
        );

        const english = component.providerGuideUrls(providerId, 'en');
        const german = component.providerGuideUrls(providerId, 'de');
        assert.match(english.provider, new RegExp(`/${definition.guidePath}/README\\.md$`, 'u'));
        assert.match(german.provider, new RegExp(`/${definition.guidePath}/README\\.de\\.md$`, 'u'));
        assert.match(english.allProviders, /docs\/api-keys\/README\.md$/u);
        assert.match(german.allProviders, /docs\/api-keys\/README\.de\.md$/u);
    }
});

test('provider API-key tutorial opens a safe localized three-step dialog', () => {
    class FakeNode {
        constructor(tagName) {
            this.tagName = tagName;
            this.children = [];
            this.textContent = '';
        }

        append(...children) {
            this.children.push(...children);
        }

        replaceChildren(...children) {
            this.children = [...children];
        }
    }

    const context = createContext({
        browser: { i18n: { getUILanguage: () => 'de-DE' } },
        document: { createElement: tagName => new FakeNode(tagName) }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    loadScript(context, 'thunderbird-ai/components/settings/ApiConfigComponent.js');
    const component = Object.create(context.ApiConfigComponent.prototype);
    const checklist = new FakeNode('ol');
    const dialog = { opened: false, showModal() { this.opened = true; } };
    component.activeProvider = 'anthropic';
    component.elements = {
        tutorialTitle: new FakeNode('h2'),
        tutorialChecklist: checklist,
        tutorialFullGuide: new FakeNode('a'),
        tutorialAllGuides: new FakeNode('a'),
        tutorialDialog: dialog
    };

    component.openProviderTutorial();

    assert.equal(component.elements.tutorialTitle.textContent, 'Claude (Anthropic) einrichten');
    assert.equal(checklist.children.length, 3);
    assert.equal(
        checklist.children[0].children[0].href,
        'https://platform.claude.com/settings/keys'
    );
    assert.equal(checklist.children[0].children[0].target, '_blank');
    assert.equal(checklist.children[0].children[0].rel, 'noopener noreferrer');
    assert.match(checklist.children[1].textContent, /API-Guthaben/u);
    assert.match(checklist.children[2].textContent, /API-Verbindung/u);
    assert.match(component.elements.tutorialFullGuide.href, /README\.de\.md$/u);
    assert.equal(
        component.elements.tutorialAllGuides.href,
        'https://github.com/Sokrates1989/thunderbird-ai/blob/main/docs/api-keys/README.de.md'
    );
    assert.equal(dialog.opened, true);
});

test('provider tutorial uses a distinct accessible help-button and documentation callout', () => {
    const component = source('thunderbird-ai/components/settings/ApiConfigComponent.js');
    const styles = source('thunderbird-ai/styles/settings.css');

    assert.match(component, /id="providerTutorialButton"/u);
    assert.match(component, /<dialog id="providerTutorialDialog"/u);
    assert.match(component, /aria-labelledby="providerTutorialTitle"/u);
    assert.match(component, /aria-label="\$\{I18n\.t\('close'\)\}"/u);
    assert.match(component, /startLink\.textContent = I18n\.t/u);
    assert.match(component, /tutorialDialog\.showModal\(\)/u);
    assert.match(styles, /\.provider-tutorial-documentation\s*\{[^}]*border-left:/su);
    assert.match(styles, /\.provider-tutorial-dialog::backdrop/u);
    assert.match(styles, /:focus-visible/u);
});

test('settings no longer load or expose retired automatic email analysis', () => {
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const settingsManager = source('thunderbird-ai/components/settings/SettingsManager.js');
    const background = source('common/background.js');
    const singleMailManager = source('thunderbird-ai/components/single-mail/SingleMailManager.js');
    const constants = source('thunderbird-ai/config/constants.js');

    assert.doesNotMatch(settingsPage, /automation-section|AutomationComponent/u);
    assert.doesNotMatch(settingsManager, /autoProcess|AutomationComponent/u);
    assert.doesNotMatch(background, /handleAutomaticProcessing|GET_AUTOMATIC_RESULT/u);
    assert.doesNotMatch(singleMailManager, /showAutomaticResult|GET_AUTOMATIC_RESULT/u);
    assert.doesNotMatch(constants, /AUTO_PROCESS|AUTOMATIC_RESULTS|GET_AUTOMATIC_RESULT/u);
});

test('settings expose independent persisted launch preferences for both entry points', () => {
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const settingsManager = source('thunderbird-ai/components/settings/SettingsManager.js');
    const settingsStyles = source('thunderbird-ai/styles/settings.css');
    const launchSettings = source(
        'thunderbird-ai/components/settings/DashboardLaunchSettingsComponent.js'
    );
    const supportDiagnostics = source(
        'thunderbird-ai/components/settings/SupportDiagnosticsComponent.js'
    );

    assert.match(settingsPage, /id="dashboard-launch-section"/u);
    assert.match(settingsPage, /DashboardLaunchService\.js/u);
    assert.match(settingsPage, /LaunchModeService\.js/u);
    assert.match(settingsPage, /RuntimeDiagnosticService\.js/u);
    assert.match(settingsPage, /DashboardLaunchSettingsComponent\.js/u);
    assert.match(settingsPage, /id="support-diagnostics-section"/u);
    assert.match(settingsPage, /SupportDiagnosticsComponent\.js/u);
    assert.match(settingsManager, /new DashboardLaunchSettingsComponent\(this\)/u);
    assert.match(settingsManager, /new SupportDiagnosticsComponent\(this\)/u);
    assert.match(settingsManager, /dashboardLaunch\.getCurrentValues\(\)/u);
    assert.match(launchSettings, /value="overlay"/u);
    assert.match(launchSettings, /value="tab"/u);
    assert.match(launchSettings, /id="dashboardOpenMode"/u);
    assert.match(launchSettings, /id="singleMailOpenMode"/u);
    assert.match(launchSettings, /singleMailOpenMode:\s*globalThis\.LaunchModeService\.normalizeMode/u);
    assert.match(launchSettings, /CONFIG\.ACTIONS\.SET_LAUNCH_MODE/u);
    assert.match(launchSettings, /persistMode\('dashboardOpenMode'/u);
    assert.match(launchSettings, /persistMode\('singleMailOpenMode'/u);
    assert.match(supportDiagnostics, /GET_BACKGROUND_HEALTH/u);
    assert.match(supportDiagnostics, /loadBackgroundHealth\(\)/u);
    assert.match(supportDiagnostics, /auditStorage\(\)/u);
    assert.match(supportDiagnostics, /apiKeyPresent:\s*Boolean/u);
    assert.doesNotMatch(supportDiagnostics, /openaiApiKey:\s*stored/u);
    assert.match(supportDiagnostics, /navigator\.clipboard\.writeText/u);
    assert.match(settingsStyles, /\.support-health\.failed\s*\{/u);
});

test('launch mode selectors save immediately and roll back a failed write', async () => {
    const context = createContext({ console: { error() {} } });
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'thunderbird-ai/components/shared/LaunchModeService.js');
    loadScript(
        context,
        'thunderbird-ai/components/settings/DashboardLaunchSettingsComponent.js'
    );
    const requests = [];
    const changes = [];
    const statuses = [];
    const settingsManager = {
        currentSettings: { dashboardOpenMode: 'overlay', singleMailOpenMode: 'tab' },
        sendToBackground: async (action, data) => {
            requests.push({ action, data });
            return { success: requests.length === 1 };
        },
        notifySettingChanged: (setting, mode) => changes.push({ setting, mode }),
        showStatus: (message, type) => statuses.push({ message, type })
    };
    const component = Object.create(context.DashboardLaunchSettingsComponent.prototype);
    component.settingsManager = settingsManager;
    const dashboardSelect = { value: 'tab', disabled: false };
    const singleMailSelect = { value: 'overlay', disabled: false };

    assert.equal(await component.persistMode('dashboardOpenMode', dashboardSelect), true);
    assert.equal(requests[0].action, context.CONFIG.ACTIONS.SET_LAUNCH_MODE);
    assert.equal(requests[0].data.setting, 'dashboardOpenMode');
    assert.equal(requests[0].data.mode, 'tab');
    assert.deepEqual(changes, [{ setting: 'dashboardOpenMode', mode: 'tab' }]);
    assert.equal(dashboardSelect.disabled, false);
    assert.equal(statuses[0].type, 'success');

    assert.equal(await component.persistMode('singleMailOpenMode', singleMailSelect), false);
    assert.equal(singleMailSelect.value, 'tab');
    assert.equal(singleMailSelect.disabled, false);
    assert.equal(statuses[1].type, 'error');
});

test('settings protect persisted values when the background cannot initialize', () => {
    const settingsManager = source('thunderbird-ai/components/settings/SettingsManager.js');
    const actions = source('thunderbird-ai/components/settings/ActionsComponent.js');
    const apiConfig = source('thunderbird-ai/components/settings/ApiConfigComponent.js');

    assert.match(settingsManager, /getSettings\(\{ migrate: false \}\)/u);
    assert.match(settingsManager, /sendReadRequest\(CONFIG\.ACTIONS\.GET_SETTINGS\)/u);
    assert.match(settingsManager, /SETTINGS_READ_TIMEOUT_MS/u);
    assert.match(settingsManager, /setPersistenceAvailable\(false\)/u);
    assert.match(settingsManager, /settingsBackgroundUnavailableReadOnly/u);
    assert.match(actions, /if \(!this\.persistenceAvailable\)/u);
    assert.match(actions, /settingsWriteBlockedBackgroundUnavailable/u);
    assert.doesNotMatch(apiConfig, /this\.loadCurrentSettings\(\);/u);
});

test('support storage audit reports API-key presence without exposing the key', async () => {
    const context = createContext({
        browser: {
            i18n: { getUILanguage: () => 'en-US' },
            storage: { local: {
                get: async () => ({
                    openaiApiKey: 'sk-super-secret-value',
                    uiLanguage: 'de',
                    dashboardOpenMode: 'tab',
                    dashboardFeedbackArchive: [{ storageKey: 'one' }]
                })
            } }
        }
    });
    loadScript(context, 'thunderbird-ai/config/locale-de.js');
    loadScript(context, 'thunderbird-ai/config/locale-en.js');
    loadScript(context, 'thunderbird-ai/config/constants.js');
    loadScript(context, 'common/utils/ai-provider.js');
    loadScript(context, 'thunderbird-ai/components/shared/RuntimeDiagnosticService.js');
    loadScript(context, 'thunderbird-ai/components/settings/SupportDiagnosticsComponent.js');
    const component = Object.create(context.SupportDiagnosticsComponent.prototype);

    const audit = await component.auditStorage();
    const failedSource = await component.capture(async () => {
        throw new Error('Request failed for sk-super-secret-value');
    });

    assert.equal(audit.apiKeyPresent, true);
    assert.equal(audit.scoreReferences, 1);
    assert.doesNotMatch(JSON.stringify(audit), /sk-super-secret-value/u);
    assert.doesNotMatch(JSON.stringify(failedSource), /sk-super-secret-value/u);
});

test('usage statistics disclose and format the token-based USD estimate', () => {
    const statistics = source('thunderbird-ai/components/settings/StatisticsComponent.js');
    assert.match(statistics, /id="estimatedApiCost"/u);
    assert.match(statistics, /PRICING_SNAPSHOT_DATE/u);
    assert.match(statistics, /developers\.openai\.com\/api\/docs\/models\/compare/u);

    const context = createContext({ I18n: { getLanguage: () => 'en-US' } });
    loadScript(context, 'thunderbird-ai/components/settings/StatisticsComponent.js');
    assert.equal(
        context.StatisticsComponent.prototype.formatEstimatedCost(0.001234),
        '$0.001234'
    );
});

test('archive settings quick check trusts Thunderbird folder metadata instead of names', async () => {
    const calls = [];
    const context = createContext({
        browser: {
            accounts: {
                list: async includeSubFolders => {
                    calls.push(['accounts.list', includeSubFolders]);
                    return [
                        {
                            name: 'Mail account',
                            type: 'imap',
                            rootFolder: {
                                name: 'Mail account',
                                subFolders: [
                                    {
                                        id: 'archive-folder',
                                        name: 'Archiv',
                                        path: '/Archiv',
                                        specialUse: ['archives'],
                                        subFolders: [
                                            { name: '2026' },
                                            { name: 'Projects' },
                                            { name: '2024' }
                                        ]
                                    },
                                    {
                                        id: 'name-only-folder',
                                        name: 'Archiv',
                                        path: '/Other/Archiv',
                                        specialUse: [],
                                        subFolders: []
                                    }
                                ]
                            }
                        },
                        {
                            name: 'Feeds',
                            type: 'rss',
                            rootFolder: { subFolders: [] }
                        }
                    ];
                }
            },
            folders: {
                getFolderCapabilities: async folderId => {
                    calls.push(['folders.getFolderCapabilities', folderId]);
                    return { canAddSubfolders: true };
                }
            }
        }
    });
    loadScript(context, 'thunderbird-ai/components/settings/ArchiveSettingsGuideComponent.js');
    const component = Object.create(context.ArchiveSettingsGuideComponent.prototype);

    const report = JSON.parse(JSON.stringify(await component.inspectAccounts()));

    assert.deepEqual(report, [{
        name: 'Mail account',
        archiveFolders: [{
            name: 'Archiv',
            path: '/Archiv',
            yearFolders: ['2024', '2026'],
            canAddSubfolders: true
        }]
    }]);
    assert.deepEqual(calls, [
        ['accounts.list', true],
        ['folders.getFolderCapabilities', 'archive-folder']
    ]);
});

test('archive settings section exposes safe guidance and official help without a privileged deep link', async () => {
    const opened = [];
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const settingsManager = source('thunderbird-ai/components/settings/SettingsManager.js');
    const componentSource = source(
        'thunderbird-ai/components/settings/ArchiveSettingsGuideComponent.js'
    );
    const context = createContext({
        browser: {
            windows: {
                openDefaultBrowser: async url => opened.push(url)
            }
        }
    });
    loadScript(context, 'thunderbird-ai/components/settings/ArchiveSettingsGuideComponent.js');
    const component = Object.create(context.ArchiveSettingsGuideComponent.prototype);
    const feedback = [];
    component.elements = { help: { disabled: false } };
    component.setFeedback = (message, type) => feedback.push([message, type]);
    context.I18n = { t: key => key };

    await component.openHelp();

    assert.match(settingsPage, /id="archive-settings-section"/u);
    assert.match(settingsPage, /ArchiveSettingsGuideComponent\.js/u);
    assert.match(settingsManager, /new ArchiveSettingsGuideComponent\(this\)/u);
    assert.match(componentSource, /browser\.accounts\.list\(true\)/u);
    assert.match(componentSource, /specialUse.*includes\('archives'\)/u);
    assert.doesNotMatch(componentSource, /about:accountsettings/u);
    assert.deepEqual(opened, ['https://support.mozilla.org/kb/archived-messages']);
    assert.deepEqual(feedback, [['archiveSettingsHelpOpened', 'success']]);
    assert.equal(component.elements.help.disabled, false);
});
