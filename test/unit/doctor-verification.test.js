'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scopeFor, mergeReport, verify } = require('../../src/modules/doctor-verification');
const { diagnose } = require('../../src/modules/workspace-doctor');

test('only known diagnostics can trigger local command probes', () => {
  assert.equal(scopeFor('runtime.node.mismatch'), 'node');
  assert.equal(scopeFor('tool.pm:pnpm'), 'pm:pnpm');
  assert.equal(scopeFor('tool.pm:unexpected'), null);
  assert.equal(scopeFor('tool.toString'), null);
  assert.equal(scopeFor('workspace.cycle'), 'graph');
  assert.equal(scopeFor('../../danger'), null);
});
test('targeted check probes only the requested executable', async () => {
  const called = [];
  const result = await verify('runtime.node.mismatch', {},
    async () => ({ stack: { node: true, package: { engines: { node: '>=24' } } }, intelligence: { runtime: {} } }),
    async () => { throw Error('graph should not be inspected'); },
    async (command, args) => { called.push([command, args]); return { available: true, version: 'v24.1.0' }; },
    diagnose);
  assert.equal(result.scope, 'node');
  assert.equal(called.length, 1);
  assert.equal(called[0][0], 'node');
  assert.equal(result.report.diagnostics.length, 0);
});
test('scoped merge preserves unrelated findings and resolves only checked issues', () => {
  const previous = { diagnostics: [
    { id: 'runtime.node.mismatch', severity: 'error' },
    { id: 'tool.python', severity: 'error', lifecycle: 'Persistent' }
  ], checked: 2, resolved: 0 };
  const result = mergeReport(previous, { diagnostics: [] }, 'node');
  assert.equal(result.resolved, 1);
  assert.equal(result.counts.error, 1);
  assert.equal(result.diagnostics[0].id, 'tool.python');
});
test('graph verification does not probe local tools', async () => {
  const result = await verify('workspace.cycle', {},
    async () => { throw Error('stack only not needed'); },
    async () => ({ stack: {}, intelligence: {}, workspaceGraph: { topo: { cyclic: true } } }),
    async () => { throw Error('tool probe forbidden'); }, diagnose);
  assert.equal(result.scope, 'graph');
  assert.equal(result.report.diagnostics[0].id, 'workspace.cycle');
});
