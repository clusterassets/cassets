'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { diagnose, satisfies } = require('../../src/modules/workspace-doctor');

test('supported Node version comparisons', () => {
  assert.equal(satisfies('v22.11.0', '>=24'), false);
  assert.equal(satisfies('v24.1.0', '>=24'), true);
  assert.equal(satisfies('v20.8.0', '^20.0.0'), true);
  assert.equal(satisfies('v21.0.0', '^20.0.0'), false);
  assert.equal(satisfies('v24.0.0', '>=22 || >=24'), true);
  assert.equal(satisfies('v24.0.0', 'latest'), null);
});
test('missing required tools and runtime mismatches are evidence-linked', () => {
  const result = diagnose({ node: true, package: { engines: { node: '>=24' } } },
    { runtime: {} }, { checks: [
      { id: 'node', label: 'Node.js', command: 'node', available: true, version: 'v22.4.0', required: true },
      { id: 'pm:npm', label: 'npm', command: 'npm', available: false, required: true, reason: 'npm project' }
    ] }, null);
  assert.equal(result.counts.error, 2);
  assert.ok(result.diagnostics.some(x => x.id === 'runtime.node.mismatch'));
  assert.ok(result.diagnostics.some(x => x.id === 'tool.pm:npm'));
});
test('healthy and incomplete graph cases', () => {
  const empty = diagnose({}, {}, { checks: [] }, null);
  assert.equal(empty.diagnostics.length, 0);
  const graph = diagnose({}, {}, { checks: [] }, { topo: { cyclic: true }, truncated: true });
  assert.equal(graph.counts.warning, 1);
  assert.equal(graph.counts.info, 1);
});
