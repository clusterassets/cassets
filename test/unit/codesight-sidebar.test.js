'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('CodeSight sidebar actions invoke registered commands without executing on activation', t => {
  const original = Module._load;
  const vscode = {
    TreeItemCollapsibleState: { None: 0 },
    TreeItem: class { constructor(label, state) { this.label = label; this.collapsibleState = state; } },
    ThemeIcon: class { constructor(id) { this.id = id; } }
  };
  Module._load = function(request, parent, isMain) {
    if (request === 'vscode') return vscode;
    return original.call(this, request, parent, isMain);
  };
  const modulePath = require.resolve('../../src/modules/codesight-sidebar');
  let Provider;
  try {
    delete require.cache[modulePath];
    Provider = require(modulePath).CodeSightSidebarProvider;
  } finally {
    Module._load = original;
    t.after(() => { delete require.cache[modulePath]; });
  }
  const items = new Provider().getChildren();
  assert.equal(items.length, 5);
  assert.equal(items[0].command.command, 'cassets.architectureExplorer');
  assert.ok(items.every(item => item.iconPath && item.command && item.collapsibleState === 0));
});
