'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeRelative, knownSource, boundedLine } = require('../../src/modules/architecture-navigation');

test('canonical relative paths only', () => {
  for (const name of ['src/index.ts','a.py','nested/thing.rs']) assert.equal(safeRelative(name),true);
  for (const name of ['', '/tmp/secret','../secret','src/../secret','src//a','src/./a','C:/secret','file:///etc/passwd','src\\x']) assert.equal(safeRelative(name),false,name);
});
test('navigation must target a known source ID', () => {
  const graph={nodes:[{id:'src/a.ts'}]};
  assert.equal(knownSource(graph,'src/a.ts'),true);
  assert.equal(knownSource(graph,'src/b.ts'),false);
  assert.equal(knownSource(graph,'../src/a.ts'),false);
});
test('line numbers clamp to document bounds', () => {
  assert.equal(boundedLine(4,10),3);
  assert.equal(boundedLine(-1,10),0);
  assert.equal(boundedLine(1000,10),9);
  assert.equal(boundedLine('not a number',10),0);
});
