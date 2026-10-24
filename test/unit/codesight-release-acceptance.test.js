'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { layout } = require('../../src/modules/architecture-visual-core');

test('CodeSight marketplace PNG is generated with expected signature and dimensions', t => {
  const repo = path.resolve(__dirname, '../..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesight-icon-'));
  const icon = path.join(repo, 'images', 'icon.png');
  const previous = fs.existsSync(icon) ? fs.readFileSync(icon) : null;
  t.after(() => {
    if (previous) fs.writeFileSync(icon, previous);
    else if (fs.existsSync(icon)) fs.unlinkSync(icon);
    fs.rmSync(dir, {recursive:true,force:true});
  });
  cp.execFileSync(process.execPath, [path.join(repo,'scripts/generate-codesight-icon.cjs')]);
  const png = fs.readFileSync(icon);
  assert.deepEqual([...png.subarray(0,8)], [137,80,78,71,13,10,26,10]);
  assert.equal(png.readUInt32BE(16), 256);
  assert.equal(png.readUInt32BE(20), 256);
  assert.ok(png.length > 1000);
});

test('large architecture graph is bounded and deterministic', () => {
  const nodes=Array.from({length:500},(_,i)=>({id:'file'+i+'.ts',type:'typescript'}));
  const edges=nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id,kind:'import',evidence:{file:nodes[i].id,line:1}}));
  const graph={nodes,edges,unresolved:[],external:[]};
  const a=layout(graph,nodes[0].id,'outgoing',4);
  assert.ok(a.nodes.length<=90);
  assert.ok(a.edges.length<=180);
  assert.deepEqual(a,layout(graph,nodes[0].id,'outgoing',4));
});
