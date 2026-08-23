const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeVersion,
  parseGoVersion,
  parsePythonRequires,
  packageManagerFromField,
  classifyNodeTools,
  inferMonorepo,
  extractEnvNames
} = require('../../src/modules/intelligence-core');

test('normalizes runtime versions', () => {
  assert.equal(normalizeVersion('v22.4.1\n'), '22.4.1');
  assert.equal(parseGoVersion('module example.com/x\n\ngo 1.24.1\n'), '1.24.1');
  assert.equal(parsePythonRequires('[project]\nrequires-python = ">=3.12"\n'), '>=3.12');
});

test('parses packageManager field', () => {
  assert.deepEqual(packageManagerFromField('pnpm@10.15.0'), { name: 'pnpm', version: '10.15.0' });
});

test('classifies node test lint format and build ownership', () => {
  const tools = classifyNodeTools({
    devDependencies: {
      vitest: '1',
      eslint: '9',
      prettier: '3',
      vite: '6'
    },
    scripts: {
      test: 'vitest',
      lint: 'eslint .',
      format: 'prettier --write .',
      build: 'vite build'
    }
  });
  assert.deepEqual(tools.test, ['vitest']);
  assert.deepEqual(tools.lint, ['eslint']);
  assert.deepEqual(tools.format, ['prettier']);
  assert.deepEqual(tools.build, ['vite']);
});

test('detects monorepo from workspaces and tooling', () => {
  const result = inferMonorepo(
    { workspaces: ['apps/*', 'packages/*'] },
    { pnpmWorkspace: true, turbo: true, nx: false, lerna: false }
  );
  assert.equal(result.detected, true);
  assert.deepEqual(result.workspaces, ['apps/*', 'packages/*']);
  assert.deepEqual(result.tools, ['pnpm-workspace', 'turbo']);
});

test('extracts environment variable names but never values', () => {
  const text = `
    const a = process.env.DATABASE_URL;
    const b = process.env["API_TOKEN"];
    const c = import.meta.env.VITE_API_URL;
    x = os.getenv("PYTHON_ENV");
    y = Environment.GetEnvironmentVariable("DOTNET_ENV");
  `;
  assert.deepEqual(extractEnvNames(text), [
    'API_TOKEN',
    'DATABASE_URL',
    'DOTNET_ENV',
    'PYTHON_ENV',
    'VITE_API_URL'
  ]);
});
