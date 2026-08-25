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
    assert.match(supportDiagnostics, /GET_BACKGROUND_HEALTH/u);
    assert.match(supportDiagnostics, /loadBackgroundHealth\(\)/u);
    assert.match(supportDiagnostics, /auditStorage\(\)/u);
    assert.match(supportDiagnostics, /apiKeyPresent:\s*Boolean/u);
    assert.doesNotMatch(supportDiagnostics, /openaiApiKey:\s*stored/u);
    assert.match(supportDiagnostics, /navigator\.clipboard\.writeText/u);
    assert.match(settingsStyles, /\.support-health\.failed\s*\{/u);
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
