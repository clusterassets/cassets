'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { workspacePatternMatches } = require('../../src/modules/workspace-graph-core');
const { inventory } = require('../../src/modules/command-inventory');
test('npm workspace patterns exclude unrelated manifests and excluded packages', () => {
  const patterns = ['apps/*', 'packages/*', '!apps/legacy'];
  assert.equal(workspacePatternMatches('apps/api', patterns), true);
  assert.equal(workspacePatternMatches('apps/web', patterns), true);
  assert.equal(workspacePatternMatches('packages/shared', patterns), true);
  assert.equal(workspacePatternMatches('apps/legacy', patterns), false);
  assert.equal(workspacePatternMatches('examples/demo', patterns), false);
  assert.equal(workspacePatternMatches('apps/api/nested', patterns), false);
});
test('VAMSHA regression: API and Web dev scripts survive root alias discovery', () => {
  const commands = inventory([
    { path: '.', name: 'vamsha', scripts: { dev: 'npm -w @familyos/api run dev' } },
    { path: 'apps/api', name: '@familyos/api', scripts: { dev: 'tsx watch src/index.ts', test: 'vitest' } },
    { path: 'apps/web', name: '@familyos/web', scripts: { dev: 'vite', build: 'vite build' } }
  ]);
  assert.deepEqual(commands.filter(x => x.name === 'dev').map(x => x.command), [
    'npm run dev', 'npm -w @familyos/api run dev', 'npm -w @familyos/web run dev'
  ]);
  assert.deepEqual(commands[0].delegatedTo, { package: '@familyos/api', script: 'dev' });
  assert.equal(commands[1].root, false);
});
test('sensitive scripts are discovered but not executed', () => {
  const commands = inventory([{ path: 'apps/api', name: '@familyos/api', scripts: { 'db:migrate': 'prisma migrate deploy' } }]);
  assert.equal(commands[0].risk, 'sensitive');
  assert.equal(commands[0].command, 'npm -w @familyos/api run db:migrate');
});
