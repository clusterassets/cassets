'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { neighborhood, detail } = require('../../src/modules/architecture-view-core');

const graph = {
  nodes: ['a','b','c','d'].map(id => ({ id, type: 'javascript' })),
  edges: [
    { from:'a', to:'b', evidence:{file:'a',line:1}, kind:'import' },
    { from:'b', to:'c', evidence:{file:'b',line:2}, kind:'require' },
    { from:'d', to:'a', evidence:{file:'d',line:3}, kind:'import' }
  ],
  unresolved: [{ from:'a',specifier:'./missing',line:4 }],
  external: [{ from:'a',specifier:'react',line:5 }]
};
test('outgoing and incoming traversal obey depth', () => {
  assert.deepEqual(neighborhood(graph,'a','outgoing',1).nodes.map(n=>n.id),['a','b']);
  assert.deepEqual(neighborhood(graph,'a','outgoing',2).nodes.map(n=>n.id),['a','b','c']);
  assert.deepEqual(neighborhood(graph,'a','incoming',1).nodes.map(n=>n.id),['a','d']);
});
test('bounded traversal and unknown node', () => {
  assert.equal(neighborhood(graph,'a','both',4,2).nodes.length,2);
  assert.equal(neighborhood(graph,'a','both',4,2).truncated,true);
  assert.deepEqual(neighborhood(graph,'absent').nodes,[]);
});
test('detail retains evidence and unresolved references', () => {
  const x=detail(graph,'a');
  assert.equal(x.incoming[0].evidence.line,3);
  assert.equal(x.outgoing[0].evidence.line,1);
  assert.equal(x.unresolved[0].specifier,'./missing');
  assert.equal(x.external[0].specifier,'react');
});
