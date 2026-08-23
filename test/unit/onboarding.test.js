const test = require('node:test');
const assert = require('node:assert/strict');
const { commandForNode, recommendCommands, buildGuide } = require('../../src/modules/onboarding');

test('uses correct Node package-manager command forms', () => {
  assert.equal(commandForNode('npm', 'test'), 'npm run test');
  assert.equal(commandForNode('pnpm', 'test'), 'pnpm run test');
  assert.equal(commandForNode('yarn', 'test'), 'yarn test');
  assert.equal(commandForNode('bun', 'test'), 'bun test');
});

test('prefers explicit repository scripts', () => {
  const commands = recommendCommands(
    { node: true, packageManager: 'pnpm', scripts: { dev: 'vite', test: 'vitest' } },
    { runtime: { packageManager: { name: 'pnpm' } }, summary: { testFrameworks: ['vitest'] } },
    null
  );
  assert.ok(commands.some(x => x.command === 'pnpm run dev'));
  assert.ok(commands.some(x => x.command === 'pnpm run test'));
});

test('guide blocks ready state when prerequisites are missing', () => {
  const guide = buildGuide(
    'repo',
    { node: true, packageManager: 'npm', scripts: { build: 'vite build' } },
    { runtime: { packageManager: { name: 'npm' } }, summary: { testFrameworks: [] } },
    { missingRequired: [{ label: 'Node.js' }] },
    { detected: false, packages: [] }
  );
  assert.equal(guide.ready, false);
});
