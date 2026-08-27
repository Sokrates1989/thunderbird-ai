/**
 * Run a pinned Mozilla add-on linter against the built Thunderbird XPI.
 * The exact warning baseline distinguishes reviewed Thunderbird compatibility
 * findings from new actionable findings and keeps local and CI checks aligned.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const baselinePath = resolve(scriptDirectory, 'atn-warning-baseline.json');

function incrementCount(counts, key) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

/** Convert the grouped JSON baseline into comparable warning fingerprints. */
function flattenBaseline(section) {
    const counts = new Map();
    for (const [code, messages] of Object.entries(section)) {
        for (const [message, count] of Object.entries(messages)) {
            counts.set(`${code}:${message}`, count);
        }
    }
    return counts;
}

/** Normalize supported linter messages without relying on brittle line numbers. */
function warningFingerprint(warning) {
    if (warning.code === 'MANIFEST_PERMISSIONS') {
        const permission = warning.message.match(/Invalid permissions "([^"]+)"/u)?.[1];
        return permission ? `${warning.code}:${permission}` : null;
    }
    if (warning.code === 'UNSUPPORTED_API' ||
        warning.code === 'MISSING_DATA_COLLECTION_PERMISSIONS') {
        return `${warning.code}:${warning.message}`;
    }
    return null;
}

/** Report every missing, additional, or count-changed warning fingerprint. */
function compareCounts(actual, expected) {
    const mismatches = [];
    const keys = new Set([...actual.keys(), ...expected.keys()]);
    for (const key of [...keys].sort()) {
        const actualCount = actual.get(key) ?? 0;
        const expectedCount = expected.get(key) ?? 0;
        if (actualCount !== expectedCount) {
            mismatches.push(`${key}: expected ${expectedCount}, received ${actualCount}`);
        }
    }
    return mismatches;
}

/** Classify one add-ons-linter JSON report against the reviewed warning policy. */
export function classifyAtnReport(report, baseline) {
    const reviewedExpected = flattenBaseline(baseline.reviewedThunderbirdCompatibility);
    const localOnlyExpected = flattenBaseline(baseline.localFirefoxOnly);
    const reviewedActual = new Map();
    const localOnlyActual = new Map();
    const unexpectedWarnings = [];

    for (const warning of report.warnings ?? []) {
        const fingerprint = warningFingerprint(warning);
        if (fingerprint && reviewedExpected.has(fingerprint)) {
            incrementCount(reviewedActual, fingerprint);
        } else if (fingerprint && localOnlyExpected.has(fingerprint)) {
            incrementCount(localOnlyActual, fingerprint);
        } else {
            unexpectedWarnings.push(
                `${warning.code ?? 'UNKNOWN'}: ${warning.message ?? 'Missing warning message'}`
            );
        }
    }

    return {
        errors: report.errors ?? [],
        notices: report.notices ?? [],
        reviewedWarningCount: [...reviewedActual.values()].reduce((sum, count) => sum + count, 0),
        localOnlyWarningCount: [...localOnlyActual.values()].reduce((sum, count) => sum + count, 0),
        mismatches: [
            ...compareCounts(reviewedActual, reviewedExpected),
            ...compareCounts(localOnlyActual, localOnlyExpected)
        ],
        unexpectedWarnings
    };
}

/** Load the policy, source manifest, and requested current-version XPI. */
function loadConfiguration() {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const manifest = JSON.parse(
        readFileSync(resolve(repositoryRoot, 'thunderbird-ai', 'manifest.json'), 'utf8')
    );
    const requestedPath = process.argv[2] ??
        `artifacts/thunderbird-ai-${manifest.version}.xpi`;
    const xpiPath = resolve(repositoryRoot, requestedPath);
    if (!existsSync(xpiPath)) {
        throw new Error(`ATN lint input does not exist: ${xpiPath}`);
    }
    return { baseline, manifest, xpiPath };
}

/** Resolve npx without a command shell so XPI paths remain ordinary arguments. */
function resolveNpxInvocation() {
    if (process.platform !== 'win32') {
        return { executable: 'npx', commandPrefix: [] };
    }
    const npxCliPath = resolve(
        dirname(process.execPath),
        'node_modules',
        'npm',
        'bin',
        'npx-cli.js'
    );
    if (!existsSync(npxCliPath)) {
        throw new Error(`Could not locate the npm npx launcher: ${npxCliPath}`);
    }
    return { executable: process.execPath, commandPrefix: [npxCliPath] };
}

/** Execute the pinned linter and return its parsed JSON plus process evidence. */
function runPinnedLinter(linterVersion, xpiPath) {
    const { executable, commandPrefix } = resolveNpxInvocation();
    const result = spawnSync(
        executable,
        [
            ...commandPrefix,
            '--yes',
            `addons-linter@${linterVersion}`,
            '--output',
            'json',
            xpiPath
        ],
        {
            cwd: repositoryRoot,
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024
        }
    );
    if (result.error) {
        throw new Error(`Could not start addons-linter: ${result.error.message}`);
    }
    try {
        return { report: JSON.parse(result.stdout), result };
    } catch (error) {
        const details = result.stderr.trim() ? `\n${result.stderr.trim()}` : '';
        throw new Error(`Could not parse addons-linter JSON: ${error.message}${details}`);
    }
}

/** Verify that validation ran against the source manifest's package identity. */
function findMetadataMismatches(report, manifest) {
    const mismatches = [];
    if (report.metadata?.id !== manifest.browser_specific_settings?.gecko?.id) {
        mismatches.push('The packaged extension ID differs from the source manifest.');
    }
    if (report.metadata?.version !== manifest.version) {
        mismatches.push('The packaged version differs from the source manifest.');
    }
    return mismatches;
}

/** Print one non-empty failure group in a stable command-line format. */
function printFailure(label, entries) {
    if (entries.length === 0) {
        return;
    }
    console.error(`${label}:`);
    for (const entry of entries) {
        const text = typeof entry === 'string'
            ? entry
            : `${entry.code ?? 'UNKNOWN'}: ${entry.message ?? 'Missing message'}`;
        console.error(`- ${text}`);
    }
}

/** Print all actionable evidence and return whether validation failed. */
function reportFailures(classification, metadataMismatches, result) {
    printFailure('Linter errors', classification.errors);
    printFailure('Linter notices', classification.notices);
    printFailure('Warning baseline mismatches', classification.mismatches);
    printFailure('Unreviewed warnings', classification.unexpectedWarnings);
    printFailure('Package metadata mismatches', metadataMismatches);
    if (result.status !== 0 && result.stderr.trim()) {
        console.error(result.stderr.trim());
    }
    return result.status !== 0 ||
        classification.errors.length > 0 ||
        classification.notices.length > 0 ||
        classification.mismatches.length > 0 ||
        classification.unexpectedWarnings.length > 0 ||
        metadataMismatches.length > 0;
}

/** Run the command-line validation and set a failing process status when needed. */
function main() {
    try {
        const { baseline, manifest, xpiPath } = loadConfiguration();
        const { report, result } = runPinnedLinter(baseline.linterVersion, xpiPath);
        const classification = classifyAtnReport(report, baseline);
        const metadataMismatches = findMetadataMismatches(report, manifest);
        if (reportFailures(classification, metadataMismatches, result)) {
            process.exitCode = 1;
            return;
        }
        console.log(`ATN lint passed for ${xpiPath}`);
        console.log('Errors: 0; notices: 0; actionable warnings: 0.');
        console.log(
            `Reviewed Thunderbird compatibility warnings: ${classification.reviewedWarningCount}.`
        );
        console.log(
            `Additional Firefox-only local warning: ${classification.localOnlyWarningCount}.`
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

const launchedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (launchedPath === fileURLToPath(import.meta.url)) {
    main();
}
