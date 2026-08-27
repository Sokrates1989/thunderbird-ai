import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { classifyAtnReport } from '../scripts/check-atn-lint.mjs';

const baseline = JSON.parse(
    readFileSync('scripts/atn-warning-baseline.json', 'utf8')
);

function warningsFromBaseline() {
    const warnings = [];
    for (const section of [
        baseline.reviewedThunderbirdCompatibility,
        baseline.localFirefoxOnly
    ]) {
        for (const [code, messages] of Object.entries(section)) {
            for (const [value, count] of Object.entries(messages)) {
                const message = code === 'MANIFEST_PERMISSIONS'
                    ? `/permissions: Invalid permissions "${value}" at 0.`
                    : value;
                for (let index = 0; index < count; index += 1) {
                    warnings.push({ code, message });
                }
            }
        }
    }
    return warnings;
}

test('reviewed Thunderbird compatibility warnings pass the ATN policy', () => {
    const result = classifyAtnReport({ errors: [], notices: [], warnings: warningsFromBaseline() }, baseline);

    assert.equal(result.reviewedWarningCount, 56);
    assert.equal(result.localOnlyWarningCount, 1);
    assert.deepEqual(result.mismatches, []);
    assert.deepEqual(result.unexpectedWarnings, []);
});

test('a new linter warning fails instead of silently expanding the baseline', () => {
    const warnings = warningsFromBaseline();
    warnings.push({ code: 'UNSAFE_VAR_ASSIGNMENT', message: 'Unsafe assignment to innerHTML' });

    const result = classifyAtnReport({ errors: [], notices: [], warnings }, baseline);

    assert.deepEqual(
        result.unexpectedWarnings,
        ['UNSAFE_VAR_ASSIGNMENT: Unsafe assignment to innerHTML']
    );
});

test('a changed Thunderbird API count requires explicit baseline review', () => {
    const warnings = warningsFromBaseline();
    warnings.splice(
        warnings.findIndex(warning => warning.message === 'messages.update is not supported'),
        1
    );

    const result = classifyAtnReport({ errors: [], notices: [], warnings }, baseline);

    assert.ok(
        result.mismatches.includes(
            'UNSUPPORTED_API:messages.update is not supported: expected 3, received 2'
        )
    );
});
