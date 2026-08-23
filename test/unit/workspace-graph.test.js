const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeWorkspacePatterns,
  dependencyNames,
  buildGraph,
  topologicalOrder
} = require('../../src/modules/workspace-graph-core');

test('normalizes npm workspace shapes', () => {
  assert.deepEqual(normalizeWorkspacePatterns(['apps/*']), ['apps/*']);
  assert.deepEqual(normalizeWorkspacePatterns({ packages: ['packages/*'] }), ['packages/*']);
});

test('builds internal workspace dependency graph', () => {
  const graph = buildGraph([
    { name: '@x/app', path: 'apps/app', dependencies: { '@x/core': 'workspace:*' } },
    { name: '@x/core', path: 'packages/core', dependencies: {} }
  ]);
  assert.deepEqual(graph.edges, [{ from: '@x/app', to: '@x/core' }]);
});

test('detects graph cycles', () => {
  const graph = buildGraph([
    { name: 'a', path: 'a', dependencies: { b: '*' } },
    { name: 'b', path: 'b', dependencies: { a: '*' } }
  ]);
  const topo = topologicalOrder(graph);
  assert.equal(topo.cyclic, true);
});

test('collects dependency names', () => {
  const names = dependencyNames({
    dependencies: { a: '1' },
    devDependencies: { b: '1' },
    peerDependencies: { c: '1' }
  });
  assert.deepEqual([...names].sort(), ['a', 'b', 'c']);
});
