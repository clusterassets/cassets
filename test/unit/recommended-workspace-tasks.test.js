'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/modules/workspace-script-runner.js'), 'utf8');
const { inventory } = require('../../src/modules/command-inventory');
const packages = [
  { path: '.', name: 'vamsha', scripts: { dev: 'npm -w @familyos/api run dev', install: 'npm install' } },
  { path: 'apps/api', name: '@familyos/api', scripts: { dev: 'tsx watch index.ts', test: 'vitest' } },
  { path: 'apps/web', name: '@familyos/web', scripts: { dev: 'vite', test: 'vitest' } }
];
const moduleStub = { exports: {} };
vm.runInNewContext(source, {
  module: moduleStub, exports: moduleStub.exports,
  require: id => id === 'vscode' ? {} :
    id === './command-inventory' ? { inventory } :
    id === './workspace-graph' ? { collectNodePackages: async () => ({ packages, truncated: false }) } :
    (() => { throw Error('unexpected dependency ' + id); })()
});
const { recommendedCandidates } = moduleStub.exports;

test('recommended targets expose both independent VAMSHA services before root alias', () => {
  const candidates = recommendedCandidates(inventory(packages));
  assert.deepEqual(Array.from(candidates.slice(0, 3), x => x.packageName), ['@familyos/api', '@familyos/web', 'vamsha']);
  assert.ok(candidates.every(x => x.risk !== 'sensitive'));
});
test('test-first preference ranks test targets before dev without executing them', () => {
  const candidates = recommendedCandidates(inventory(packages), false);
  assert.equal(candidates[0].name, 'test');
  assert.equal(candidates[0].command, 'npm -w @familyos/api run test');
});
test('sensitive commands are excluded from recommendations but remain discoverable', () => {
  const commands = inventory(packages);
  assert.ok(commands.some(x => x.name === 'install'));
  assert.ok(!recommendedCandidates(commands).some(x => x.name === 'install'));
});
