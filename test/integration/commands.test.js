const assert = require('assert');
const vscode = require('vscode');

suite('CAssets Extension', () => {
  test('commands are registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('cassets.showStack'));
    assert.ok(commands.includes('cassets.projectHealth'));
    assert.ok(commands.includes('cassets.extensionAudit'));
  });

  test('extension is discoverable', () => {
    const extension = vscode.extensions.getExtension('clusterassets.cassets');
    assert.ok(extension);
  });
});
