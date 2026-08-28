import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const testDirectory = join(repositoryRoot, 'tests');
const testFiles = readdirSync(testDirectory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.mjs'))
    .map(entry => join(testDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));

if (!testFiles.length) {
    throw new Error(`No test files were found in ${testDirectory}.`);
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    cwd: repositoryRoot,
    stdio: 'inherit'
});
if (result.error) {
    throw result.error;
}
if (result.signal) {
    throw new Error(`The Node.js test runner stopped after signal ${result.signal}.`);
}
process.exitCode = result.status ?? 1;
