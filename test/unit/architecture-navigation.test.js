'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { safeRelative, knownSource, boundedLine, containedSource } = require('../../src/modules/architecture-navigation');

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

test('realpath containment blocks sibling and symlink escapes', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cassets-nav-'));
  t.after(() => fs.rm(root, { recursive:true, force:true }));
  const workspace = path.join(root, 'workspace');
  await fs.mkdir(workspace);
  const inside = path.join(workspace, 'ok.js');
  const outside = path.join(root, 'secret.js');
  await fs.writeFile(inside, '');
  await fs.writeFile(outside, '');
  const uri = fsPath => ({ scheme:'file', authority:'', fsPath });
  assert.equal(await containedSource(uri(workspace), uri(inside)), true);
  assert.equal(await containedSource(uri(workspace), uri(outside)), false);
  const link = path.join(workspace, 'escape.js');
  try { await fs.symlink(outside, link); } catch (error) {
    if (['EPERM','EACCES','ENOTSUP'].includes(error.code)) return;
    throw error;
  }
  assert.equal(await containedSource(uri(workspace), uri(link)), false);
  assert.equal(await containedSource({scheme:'memfs',authority:'',fsPath:workspace},{scheme:'memfs',authority:'',fsPath:inside}),false);
});
