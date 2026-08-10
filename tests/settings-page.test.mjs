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
