'use strict';
const assert = require('node:assert/strict');
const vscode = require('vscode');

suite('CAssets native debugging integration', () => {
  test('Project Overview command is registered and opens a native webview', async () => {
    const extension = vscode.extensions.getExtension('clusterassets.cassets');
    assert.ok(extension, 'CAssets extension must be installed in the extension host');
    await extension.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('cassets.projectUnderstanding'));
    assert.ok(commands.includes('cassets.showTaskHistory'));
    const before = vscode.workspace.getConfiguration('launch').get('configurations', []);
    await vscode.commands.executeCommand('cassets.projectUnderstanding');
    const after = vscode.workspace.getConfiguration('launch').get('configurations', []);
    assert.deepEqual(after, before, 'opening overview must not change launch configurations');
  });
});
