import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
const signatureVerifier = readFileSync('installer/windows/verify-authenticode.ps1', 'utf8');
const shellAttributes = readFileSync('.gitattributes', 'utf8');
const addonBuilder = readFileSync('build-addon.sh', 'utf8');
const sourceArchiveBuilder = readFileSync('scripts/build-atn-source.sh', 'utf8');

test('release workflow is restricted to the official main branch and new versions', () => {
    assert.match(workflow, /branches:\s*\n\s*- main/u);
    assert.match(workflow, /github\.repository == 'Sokrates1989\/thunderbird-ai'/u);
    assert.match(workflow, /github\.ref == 'refs\/heads\/main'/u);
    assert.match(workflow, /gh release view "\$tag" --json isDraft/u);
    assert.match(workflow, /release_needed=false/u);
    assert.doesNotMatch(workflow, /pull_request:/u);
});

test('release workflow builds and tests every supported native artifact', () => {
    assert.match(workflow, /runs-on: ubuntu-latest/u);
    assert.match(workflow, /runs-on: macos-latest/u);
    assert.match(workflow, /runs-on: windows-latest/u);
    assert.match(workflow, /npm test/u);
    assert.match(workflow, /\.\/installer\/macos\/test-setup\.sh/u);
    assert.match(workflow, /windows\\test-setup\.ps1/u);
    assert.match(workflow, /windows\\build-setup\.ps1 -SkipAddonBuild/u);
    assert.match(workflow, /innosetup --version=6\.7\.1/u);
});

test('release workflow publishes complete stable aliases with checksums', () => {
    for (const artifactName of [
        'thunderbird-ai.xpi',
        'Thunderbird-AI-Setup-macos.pkg',
        'Thunderbird-AI-Setup-win-x64.exe',
        'SHA256SUMS.txt'
    ]) {
        assert.match(workflow, new RegExp(artifactName.replaceAll('.', '\\.'), 'u'));
    }
    assert.match(workflow, /needs:\s*\n\s*- prepare\s*\n\s*- xpi-source\s*\n\s*- macos-installer\s*\n\s*- windows-installer/u);
    assert.match(workflow, /contents: write/u);
    assert.match(workflow, /gh release edit "\$TAG" --draft=false --latest/u);
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

test('Windows publication requires protected OIDC Authenticode signing', () => {
    assert.match(workflow, /environment: windows-code-signing/u);
    assert.match(workflow, /id-token: write/u);
    assert.match(
        workflow,
        /uses: azure\/login@f5d393ae46f8fde4be8b75f32e3fc50e654ad0ca/u
    );
    assert.match(
        workflow,
        /uses: azure\/artifact-signing-action@c7ab2a863ab5f9a846ddb8265964877ef296ee82/u
    );
    for (const secretName of [
        'AZURE_CLIENT_ID',
        'AZURE_TENANT_ID',
        'AZURE_SUBSCRIPTION_ID',
        'AZURE_ARTIFACT_SIGNING_ENDPOINT',
        'AZURE_ARTIFACT_SIGNING_ACCOUNT',
        'AZURE_ARTIFACT_SIGNING_CERTIFICATE_PROFILE',
        'WINDOWS_SIGNING_SUBJECT'
    ]) {
        assert.match(workflow, new RegExp(`secrets\\.${secretName}`, 'u'));
    }
    assert.match(workflow, /timestamp-rfc3161: http:\/\/timestamp\.acs\.microsoft\.com/u);
    assert.match(workflow, /verify-authenticode\.ps1/u);
    assert.ok(
        workflow.indexOf('verify-authenticode.ps1') < workflow.indexOf('Upload Windows installers')
    );
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
