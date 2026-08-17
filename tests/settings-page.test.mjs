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

test('settings expose the persisted overlay or Thunderbird-tab launch preference', () => {
    const settingsPage = source('thunderbird-ai/pages/settings.html');
    const settingsManager = source('thunderbird-ai/components/settings/SettingsManager.js');
    const launchSettings = source(
        'thunderbird-ai/components/settings/DashboardLaunchSettingsComponent.js'
    );

    assert.match(settingsPage, /id="dashboard-launch-section"/u);
    assert.match(settingsPage, /DashboardLaunchService\.js/u);
    assert.match(settingsPage, /DashboardLaunchSettingsComponent\.js/u);
    assert.match(settingsManager, /new DashboardLaunchSettingsComponent\(this\)/u);
    assert.match(settingsManager, /dashboardLaunch\.getCurrentValues\(\)/u);
    assert.match(launchSettings, /value="overlay"/u);
    assert.match(launchSettings, /value="tab"/u);
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
