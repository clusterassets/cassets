const test = require('node:test');
const assert = require('node:assert/strict');
const { extensionPlan } = require('../../src/modules/capabilities');

test('recommends only detected capability owners', () => {
  const plan = extensionPlan(
    { node: true, python: false, dotnet: false, rust: false, go: false, java: false, powershell: false, terraform: false, ansible: false, docker: false, kubernetes: false },
    { ownership: { linter: 'eslint', formatter: 'prettier' } }
  );
  assert.ok(plan.some(x => x.id === 'dbaeumer.vscode-eslint'));
  assert.ok(plan.some(x => x.id === 'esbenp.prettier-vscode'));
  assert.ok(!plan.some(x => x.id === 'ms-python.python'));
});
