'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { discover, extractDependencies } = require('../../src/modules/architecture-core');

test('discovers static local imports with line evidence', () => {
  const graph = discover({
    'src/index.ts': "import { service } from './service';\nexport { x } from './utils';\nconst db = require('./db');",
    'src/service.ts': "import './utils';",
    'src/utils.ts': 'export const x = 1;',
    'src/db/index.js': 'module.exports = {}'
  });
  assert.equal(graph.nodes.length, 4);
  assert.deepEqual(graph.edges.map(x => [x.from, x.to, x.evidence.line]), [
    ['src/index.ts', 'src/service.ts', 1],
    ['src/index.ts', 'src/utils.ts', 2],
    ['src/index.ts', 'src/db/index.js', 3],
    ['src/service.ts', 'src/utils.ts', 1]
  ]);
  assert.equal(graph.unresolved.length, 0);
});
test('external dependencies do not become local edges and unresolved paths are visible', () => {
  const graph = discover({ 'src/app.js': "import React from 'react';\nimport x from './missing';\nimport z from '../../outside';" });
  assert.equal(graph.edges.length, 0);
  assert.equal(graph.unresolved.length, 2);
  assert.equal(graph.unresolved[1].reason, 'outside-workspace');
});
test('edge limits truncate and literal dynamic imports are separately classified', () => {
  const graph = discover({
    'a.js': "import('./b.js');\nrequire('./b.js');",
    'b.js': ''
  }, { maxEdges: 1 });
  assert.equal(graph.truncated, true);
  assert.equal(graph.edges.length, 1);
  assert.ok(extractDependencies("import('./b.js')").some(x => x.kind === 'dynamic-import'));
});

test('resolves tsconfig paths aliases to local source with line evidence', () => {
  const graph = discover({
    'tsconfig.json': JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }),
    'src/server.ts': "import { run } from '@/services/run';",
    'src/services/run.ts': 'export const run = () => 1;'
  });
  assert.equal(graph.edges.length, 1);
  assert.equal(graph.edges[0].to, 'src/services/run.ts');
  assert.equal(graph.edges[0].evidence.line, 1);
  assert.equal(graph.external.length, 0);
});
test('does not resolve aliases outside scanned workspace', () => {
  const graph = discover({
    'tsconfig.json': JSON.stringify({ compilerOptions: { paths: { '@/*': ['../outside/*'] } } }),
    'src/server.ts': "import x from '@/secret';"
  });
  assert.equal(graph.edges.length, 0);
});
