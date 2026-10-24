'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { layout } = require('../../src/modules/architecture-visual-core');
test('visual projection has stable positions and evidence edges', () => {
  const graph = { nodes: ['a','b','c'].map(id=>({id,type:'javascript'})),
    edges: [{from:'a',to:'b',kind:'import',evidence:{file:'a',line:1}},
      {from:'b',to:'c',kind:'import',evidence:{file:'b',line:2}}],
    unresolved:[],external:[] };
  const result = layout(graph,'a','outgoing',2);
  assert.deepEqual(result.nodes.map(n=>[n.id,n.x,n.y]),[['a',20,20],['b',235,20],['c',450,20]]);
  assert.equal(result.edges.length,2);
  assert.deepEqual(layout(graph,'a','outgoing',2),result);
});
test('type filtering retains selected node and drops hidden edges', () => {
  const graph = { nodes:[{id:'a',type:'javascript'},{id:'b',type:'python'}],
    edges:[{from:'a',to:'b'}],unresolved:[],external:[] };
  const result=layout(graph,'a','both',1,'python');
  assert.equal(result.nodes.length,2);
  assert.equal(layout(graph,'a','both',1,'go').edges.length,0);
});
