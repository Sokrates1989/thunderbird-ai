import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const repositoryRoot = path.resolve(import.meta.dirname, '..');

export function createContext(overrides = {}) {
    const context = vm.createContext({
        AbortController,
        URL,
        URLSearchParams,
        clearTimeout,
        console,
        setTimeout,
        ...overrides
    });
    context.globalThis = context;
    context.window = context;
    return context;
}

export function loadScript(context, relativePath) {
    const absolutePath = path.join(repositoryRoot, relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    new vm.Script(source, { filename: absolutePath }).runInContext(context);
    return context;
}
