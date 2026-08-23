import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync('.github/workflows/release.yml', 'utf8');

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
