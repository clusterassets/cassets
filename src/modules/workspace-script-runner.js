'use strict';
const vscode = require('vscode');
const { inventory } = require('./command-inventory');
const { collectNodePackages } = require('./workspace-graph');

function pickable(commands) {
  return commands.map(command => ({
    label: command.name,
    description: command.root ? 'Root package' : command.packageName,
    detail: command.command + (command.risk === 'sensitive' ? ' · Sensitive: confirmation required' : ''),
    command
  }));
}

async function runWorkspaceScript(folder, rootPackage, options = {}) {
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('CAssets: running workspace scripts requires Workspace Trust.');
    return false;
  }
  if (!folder || !rootPackage) return false;
  const graph = await collectNodePackages(folder, rootPackage, options.maxPackages || 200);
  if (graph.truncated) {
    vscode.window.showWarningMessage('CAssets: workspace discovery was truncated; review the command list before running.');
  }
  const commands = inventory(graph.packages);
  if (!commands.length) {
    vscode.window.showInformationMessage('CAssets: no npm scripts were discovered in this workspace.');
    return false;
  }
  const chosen = await vscode.window.showQuickPick(pickable(commands), {
    title: 'CAssets: Select a workspace script',
    placeHolder: 'Choose the exact root or package script to run',
    matchOnDescription: true,
    matchOnDetail: true
  });
  if (!chosen) return false;
  const selected = chosen.command;
  // Validate against our own inventory, never trust an arbitrary command from the UI.
  if (!commands.includes(selected)) return false;
  const approval = await vscode.window.showWarningMessage(
    'Run ' + selected.command + ' in ' + folder.name + '?' +
      (selected.risk === 'sensitive' ? ' This script may change project data or external systems.' : ''),
    { modal: true }, 'Run script'
  );
  if (approval !== 'Run script' || !vscode.workspace.isTrusted) return false;
  const task = new vscode.Task(
    { type: 'cassets-script', script: selected.name, package: selected.packageName },
    folder,
    'CAssets: ' + selected.packageName + ' / ' + selected.name,
    'CAssets',
    new vscode.ProcessExecution('npm', selected.args, { cwd: folder.uri.fsPath })
  );
  task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.Dedicated };
  await vscode.tasks.executeTask(task);
  return true;
}
module.exports = { runWorkspaceScript, pickable };
