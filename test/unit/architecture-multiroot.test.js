'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('two workspace roots scan independently and exclude symlink escape', async t => {
  const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'codesight-multiroot-'));
  t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
  const a=path.join(tmp,'root-a'), b=path.join(tmp,'root-b');
  await fs.mkdir(a);await fs.mkdir(b);
  await fs.writeFile(path.join(a,'a.js'),'const a = 1;');
  await fs.writeFile(path.join(b,'b.js'),'const b = 2;');
  const escaped=path.join(a,'escape.js');
  try { await fs.symlink(path.join(b,'b.js'),escaped); } catch (e) { if (!['EPERM','ENOTSUP','EACCES'].includes(e.code)) throw e; }
  const folders=[a,b].map((fsPath,index)=>({name:'root-'+index,uri:{scheme:'file',authority:'',fsPath,path:fsPath,toString(){return 'file://'+fsPath;}}}));
  const vscode={
    workspace:{
      isTrusted:true,
      findFiles:async pattern=>(await fs.readdir(pattern.base.uri.fsPath)).filter(n=>n.endsWith('.js')).map(n=>({
        scheme:'file',authority:'',fsPath:path.join(pattern.base.uri.fsPath,n),path:path.join(pattern.base.uri.fsPath,n)
      })),
      fs:{stat:uri=>fs.stat(uri.fsPath),readFile:uri=>fs.readFile(uri.fsPath)}
    },
    RelativePattern:class {constructor(base){this.base=base;}}
  };
  const original=Module._load;
  Module._load=function(request,parent,isMain){if(request==='vscode')return vscode;return original.apply(this,arguments);};
  let scanWorkspace;
  try {
    const file=require.resolve('../../src/modules/architecture-explorer');
    delete require.cache[file];
    scanWorkspace=require(file).scanWorkspace;
    t.after(()=>{delete require.cache[file];});
  } finally { Module._load=original; }
  const first=await scanWorkspace(folders[0]);
  const second=await scanWorkspace(folders[1]);
  assert.equal(first.folderUri,folders[0].uri.toString());
  assert.equal(second.folderUri,folders[1].uri.toString());
  assert.ok(first.nodes.some(n=>n.id==='a.js'));
  assert.ok(!first.nodes.some(n=>n.id==='b.js'));
  assert.ok(!first.nodes.some(n=>n.id==='escape.js'));
  assert.ok(second.nodes.some(n=>n.id==='b.js'));
  assert.ok(!second.nodes.some(n=>n.id==='a.js'));
});
