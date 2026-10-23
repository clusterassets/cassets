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

function recommendedCandidates(commands, preferDev = true) {
  const preferred = preferDev ? ['dev', 'start', 'test', 'build', 'lint'] : ['test', 'build', 'lint', 'dev', 'start'];
  return commands.filter(command => preferred.includes(command.name) && command.risk !== 'sensitive')
    .sort((a, b) => preferred.indexOf(a.name) - preferred.indexOf(b.name) ||
      Number(a.root) - Number(b.root) || a.packageName.localeCompare(b.packageName));
}

async function runWorkspaceScript(folder, rootPackage, options = {}) {
  if (!vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('CAssets: running workspace scripts requires Workspace Trust.');
    return false;
  }
  if (!folder || !rootPackage) return false;
  const declaredManager = rootPackage.packageManager;
  if (declaredManager && !/^npm(?:@|$)/.test(declaredManager)) {
    vscode.window.showWarningMessage('CAssets: native workspace execution supports npm only. No command was executed.');
    return false;
  }
  const graph = await collectNodePackages(folder, rootPackage, options.maxPackages || 200);
  if (graph.truncated) {
    vscode.window.showWarningMessage('CAssets: workspace discovery was truncated; review the command list before running.');
  }
  const commands = inventory(graph.packages);
  if (!commands.length) {
    vscode.window.showInformationMessage('CAssets: no npm scripts were discovered in this workspace.');
    return false;
  }
  const candidates = options.recommended ? recommendedCandidates(commands, options.preferDev !== false) : commands;
  if (!candidates.length) {
    vscode.window.showInformationMessage('CAssets: no recommended runnable scripts were discovered. Use Run Workspace Script to inspect all scripts.');
    return false;
  }
  const chosen = await vscode.window.showQuickPick(pickable(candidates), {
    title: options.recommended ? 'CAssets: Select recommended workspace script' : 'CAssets: Select a workspace script',
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
  const execution = await vscode.tasks.executeTask(task);
  options.lifecycle?.track(execution);
  return true;
}
module.exports = { runWorkspaceScript, pickable, recommendedCandidates };
