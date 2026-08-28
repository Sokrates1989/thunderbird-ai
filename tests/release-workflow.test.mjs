import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
const packageMetadata = JSON.parse(readFileSync('package.json', 'utf8'));
const testRunner = readFileSync('scripts/run-tests.mjs', 'utf8');
const signatureVerifier = readFileSync('installer/windows/verify-authenticode.ps1', 'utf8');
const shellAttributes = readFileSync('.gitattributes', 'utf8');
const addonBuilder = readFileSync('build-addon.sh', 'utf8');
const sourceArchiveBuilder = readFileSync('scripts/build-atn-source.sh', 'utf8');
const windowsSetup = readFileSync('installer/windows/setup.iss', 'utf8');

test('release workflow is restricted to the official main branch and new versions', () => {
    assert.match(workflow, /branches:\s*\n\s*- main/u);
    assert.match(workflow, /github\.repository == 'Sokrates1989\/thunderbird-ai'/u);
    assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
    assert.match(workflow, /gh release view "\$tag" --json isDraft/u);
    assert.match(workflow, /release_needed=false/u);
    assert.doesNotMatch(workflow, /pull_request:/u);
});

test('release workflow builds and tests the portable store artifacts', () => {
    assert.match(workflow, /runs-on: ubuntu-latest/u);
    assert.match(workflow, /npm test/u);
    assert.match(workflow, /npm run lint:atn/u);
    assert.match(workflow, /\.\/build-addon\.sh/u);
    assert.match(workflow, /\.\/scripts\/build-atn-source\.sh/u);
    assert.doesNotMatch(workflow, /runs-on: (?:macos|windows)-latest/u);
});

test('release workflow publishes the stable XPI alias, reviewer source, and checksums', () => {
    for (const artifactName of [
        'thunderbird-ai.xpi',
        'atn-source.zip',
        'SHA256SUMS.txt'
    ]) {
        assert.match(workflow, new RegExp(artifactName.replaceAll('.', '\\.'), 'u'));
    }
    assert.match(workflow, /needs:\s*\n\s*- prepare\s*\n\s*- xpi-source/u);
    assert.match(workflow, /contents: write/u);
    assert.match(workflow, /gh release edit "\$TAG" --draft=false --latest/u);
});

test('test discovery is explicit and remains compatible with Node 20 and Node 24', () => {
    assert.equal(packageMetadata.scripts.test, 'node scripts/run-tests.mjs');
    assert.match(testRunner, /readdirSync\(testDirectory/u);
    assert.match(testRunner, /endsWith\('\.test\.mjs'\)/u);
    assert.match(testRunner, /spawnSync\(process\.execPath, \['--test', \.\.\.testFiles\]/u);
});

test('GitHub CLI release commands receive explicit repository context', () => {
    const explicitRepositoryContexts = workflow.match(/GH_REPO: \$\{\{ github\.repository \}\}/gu) ?? [];
    assert.equal(explicitRepositoryContexts.length, 2);
});

test('official GitHub actions are pinned to full commit hashes', () => {
    const actionReferences = [...workflow.matchAll(/uses: actions\/[a-z-]+@([^\s]+)/gu)];
    assert.ok(actionReferences.length >= 4);
    for (const reference of actionReferences) {
        assert.match(reference[1], /^[a-f0-9]{40}$/u);
    }
});

test('release publication has no native installer or cloud-signing dependency', () => {
    assert.doesNotMatch(workflow, /macos-installer|windows-installer/u);
    assert.doesNotMatch(workflow, /azure\/|AZURE_|WINDOWS_SIGNING_SUBJECT/u);
    assert.doesNotMatch(workflow, /id-token: write|Authenticode|\.pkg|\.exe/u);
});

test('Authenticode verifier fails closed on identity or timestamp mismatch', () => {
    assert.ok(signatureVerifier.includes('SignatureStatus]::Valid'));
    assert.match(signatureVerifier, /SignerCertificate/u);
    assert.match(signatureVerifier, /ExpectedPublisher/u);
    assert.match(signatureVerifier, /TimeStamperCertificate/u);
});

test('Windows reviewer builds retain LF scripts and bridge WSL to Windows Node', () => {
    assert.match(shellAttributes, /^\*\.sh text eol=lf$/mu);
    for (const builder of [addonBuilder, sourceArchiveBuilder]) {
        assert.match(builder, /command -v node\.exe/u);
        assert.match(builder, /command -v wslpath/u);
    }
});

test('Windows setup explains its automatic normal shutdown and default restart', () => {
    assert.match(windowsSetup, /Installer schließt Thunderbird nun automatisch auf normalem Weg/u);
    assert.match(windowsSetup, /Nach der Installation wird Thunderbird standardmäßig wieder gestartet/u);
    assert.match(windowsSetup, /Setup will now close Thunderbird automatically through its normal shutdown/u);
    assert.match(windowsSetup, /After installation, Thunderbird is restarted by default/u);
    assert.match(windowsSetup, /Deinstaller schließt Thunderbird nun automatisch auf normalem Weg/u);
    assert.match(windowsSetup, /Nach der Deinstallation wird Thunderbird nicht automatisch neu gestartet/u);
    assert.match(windowsSetup, /Uninstall will now close Thunderbird automatically through its normal shutdown/u);
    assert.match(windowsSetup, /Thunderbird is not restarted automatically after uninstallation/u);
    assert.match(
        windowsSetup,
        /function PrepareToInstall[\s\S]*?CustomMessage\('ThunderbirdClosePrompt'\)/u
    );
    assert.match(
        windowsSetup,
        /function InitializeUninstall[\s\S]*?CustomMessage\('ThunderbirdCloseUninstallPrompt'\)/u
    );
    assert.doesNotMatch(windowsSetup, /Thunderbird wird niemals erzwungen beendet/u);
    assert.doesNotMatch(windowsSetup, /Thunderbird is never force-terminated/u);
});
