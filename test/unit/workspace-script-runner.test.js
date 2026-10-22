'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/modules/workspace-script-runner.js'), 'utf8');

function harness({ trusted = true, approved = true, selected = true } = {}) {
  const executed = [];
  const notices = [];
  const vscode = {
    workspace: { isTrusted: trusted },
    window: {
      showWarningMessage: async (message) => { notices.push(message); return approved ? 'Run script' : undefined; },
      showInformationMessage: async message => { notices.push(message); },
      showQuickPick: async items => selected ? items.find(item => item.command.packageName === '@familyos/web') : undefined
    },
    Task: class { constructor(definition, scope, name, source, execution) { Object.assign(this, { definition, scope, name, source, execution }); } },
    ProcessExecution: class { constructor(process, args, options) { Object.assign(this, { process, args, options }); } },
    TaskRevealKind: { Always: 1 }, TaskPanelKind: { Dedicated: 1 },
    tasks: { executeTask: async task => { executed.push(task); } }
  };
  const graph = { packages: [
    { path: '.', name: 'vamsha', scripts: { dev: 'npm -w @familyos/api run dev' } },
    { path: 'apps/api', name: '@familyos/api', scripts: { dev: 'tsx watch server.ts' } },
    { path: 'apps/web', name: '@familyos/web', scripts: { dev: 'vite' } }
  ], truncated: false };
  const module = { exports: {} };
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: id => id === 'vscode' ? vscode :
      id === './command-inventory' ? require('../../src/modules/command-inventory') :
      id === './workspace-graph' ? { collectNodePackages: async () => graph } :
      (() => { throw new Error('unexpected require ' + id); })()
  });
  return { ...module.exports, vscode, executed, notices };
}
const folder = { name: 'VAMSHA', uri: { fsPath: '/workspace/vamsha' } };

test('selecting Web executes only Web npm workspace task with argument array', async () => {
  const h = harness();
  assert.equal(await h.runWorkspaceScript(folder, { name: 'vamsha' }), true);
  assert.equal(h.executed.length, 1);
  assert.equal(h.executed[0].execution.process, 'npm');
  assert.equal(Array.from(h.executed[0].execution.args).join(' '), '-w @familyos/web run dev');
  assert.equal(h.executed[0].execution.options.cwd, folder.uri.fsPath);
});
test('untrusted workspaces and cancelled confirmation never execute', async () => {
  for (const options of [{ trusted: false }, { approved: false }, { selected: false }]) {
    const h = harness(options);
    assert.equal(await h.runWorkspaceScript(folder, { name: 'vamsha' }), false);
    assert.equal(h.executed.length, 0);
  }
});
