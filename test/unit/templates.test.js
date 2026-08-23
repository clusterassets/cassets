const test = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../../src/modules/templates');

test('gitignore combines Node, Python and Terraform rules', () => {
  const text = templates.gitignore({ node: true, python: true, dotnet: false, rust: false, go: false, java: false, terraform: true });
  assert.match(text, /node_modules\//);
  assert.match(text, /\.venv\//);
  assert.match(text, /\*\.tfstate/);
  assert.match(text, /!\.env\.example/);
});

test('npmignore does not exclude package output by assumption', () => {
  const text = templates.npmignore();
  assert.doesNotMatch(text, /^dist\/$/m);
  assert.match(text, /\.github\//);
});

test('CI only includes package scripts that exist', () => {
  const text = templates.ci({
    node: true,
    packageManager: 'npm',
    scripts: { test: 'vitest', build: 'vite build' }
  });
  assert.match(text, /npm run test/);
  assert.match(text, /npm run build/);
  assert.doesNotMatch(text, /npm run lint/);
});
