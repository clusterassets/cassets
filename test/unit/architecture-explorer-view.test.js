'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('architecture explorer renders safe, keyboard-accessible graph controls and preserves selection', t => {
  const original = Module._load;
  Module._load = function(request, parent, isMain) {
    if (request === 'vscode') return {};
    return original.apply(this, arguments);
  };
  let view;
  const modulePath = require.resolve('../../src/modules/architecture-explorer');
  try {
    delete require.cache[modulePath];
    view = require(modulePath).view;
  } finally {
    Module._load = original;
    t.after(() => { delete require.cache[modulePath]; });
  }
  const nodes = [
    {id:'src/a.ts',type:'typescript',analyzer:'javascript'},
    {id:'src/b.ts',type:'typescript',analyzer:'javascript'},
    {id:'src/<unsafe>.ts',type:'typescript',analyzer:'javascript'}
  ];
  const edges = [{from:'src/a.ts',to:'src/b.ts',kind:'import',
    evidence:{file:'src/a.ts',line:3}}];
  const graph = {nodes,edges,unresolved:[],external:[],truncated:false};
  const html = view(graph,'src/a.ts','outgoing',2,'testnonce');
  assert.match(html,/Content-Security-Policy/);
  assert.match(html,/script-src 'nonce-testnonce'/);
  assert.match(html,/id="graph-viewport"/);
  assert.match(html,/id="zoom-in"/);
  assert.match(html,/id="zoom-reset"/);
  assert.match(html,/tabindex="0" data-edge="0"/);
  assert.match(html,/data-node="src\/a.ts"/);
  assert.match(html,/api\.getState\(\)/);
  assert.match(html,/restore\(\)/);
  assert.match(html,/src\/&lt;unsafe&gt;\.ts/);
  assert.doesNotMatch(html,/data-node="src\/<unsafe>\.ts"/);
  assert.match(html,/<option value="src\/a.ts" selected>/);
});

test('architecture explorer tolerates an empty graph without crashing', t => {
  const original = Module._load;
  Module._load = function(request,parent,isMain) {
    if (request === 'vscode') return {};
    return original.apply(this,arguments);
  };
  let view;
  try {
    const modulePath=require.resolve('../../src/modules/architecture-explorer');
    delete require.cache[modulePath];
    view=require(modulePath).view;
    t.after(()=>delete require.cache[modulePath]);
  } finally { Module._load=original; }
  const html=view({nodes:[],edges:[],unresolved:[],external:[],truncated:false},'','both',1,'nonce');
  assert.match(html,/0 files/);
  assert.match(html,/No relationships in selected view/);
});
