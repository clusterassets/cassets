'use strict';
const vscode = require('vscode');

function availableConfigurations(configurations) {
  return (Array.isArray(configurations) ? configurations : [])
    .filter(c => c && typeof c.name === 'string' && c.name.trim() &&
      typeof c.type === 'string' && c.type.trim() &&
      typeof c.request === 'string' && ['launch', 'attach'].includes(c.request))
    .map(c => ({ name: c.name, type: c.type, request: c.request }));
}

function debugView(records, folderName, limit = 12) {
  const scoped = (records || []).filter(r => r.folder === folderName);
  return { active: scoped.filter(r => r.status === 'running').length,
    sessions: scoped.slice(0, Math.max(0, Math.min(limit, 50))).map(r => ({
      name: String(r.name || ''), type: String(r.type || ''),
      status: r.status === 'running' ? 'running' : 'ended',
      startedAt: r.startedAt, endedAt: r.endedAt
    })) };
}

let activeTracker = null;
function getActiveDebugTracker() { return activeTracker; }

function createDebugTracker(context, options = {}) {
  const records = new Map();
  const changed = new vscode.EventEmitter();
  const maxHistory = Math.max(1, Math.min(options.maxHistory || 50, 200));
  function emit() { changed.fire(); }
  function started(session) {
    if (!session || !session.id) return;
    const prior = records.get(session.id);
    records.set(session.id, {
      name: session.name, type: session.type,
      folder: session.workspaceFolder?.name || '',
      status: 'running', startedAt: prior?.startedAt || Date.now(), endedAt: null
    });
    emit();
  }
  function terminated(session) {
    const record = records.get(session?.id);
    if (!record) return;
    record.status = 'ended';
    record.endedAt = Date.now();
    emit();
  }
  const startListener = vscode.debug.onDidStartDebugSession(started);
  const endListener = vscode.debug.onDidTerminateDebugSession(terminated);
  context.subscriptions.push(changed, startListener, endListener);
  const tracker = {
    snapshot() { return [...records.values()].reverse().map(r => ({ ...r })); },
    onDidChange: changed.event
  };
  activeTracker = tracker;
  context.subscriptions.push({ dispose() { if (activeTracker === tracker) activeTracker = null; } });
  // Existing sessions are not enumerated by VS Code's public API. Capture the active one.
  if (vscode.debug.activeDebugSession) started(vscode.debug.activeDebugSession);
  return tracker;
}

async function startNativeDebugging(folder) {
  if (!folder || !vscode.workspace.isTrusted) {
    vscode.window.showWarningMessage('CAssets: debugging requires a trusted workspace.');
    return false;
  }
  const configs = availableConfigurations(
    vscode.workspace.getConfiguration('launch', folder.uri).get('configurations', []));
  if (!configs.length) {
    vscode.window.showInformationMessage(
      'CAssets: no launch configurations found. Open Run and Debug to configure a debugger.');
    await vscode.commands.executeCommand('workbench.view.debug');
    return false;
  }
  const choice = await vscode.window.showQuickPick(configs.map(c => ({
    label: c.name, description: c.type + ' · ' + c.request, configuration: c
  })), { title: 'CAssets: Start native debugging', placeHolder: 'Select an existing launch.json configuration' });
  if (!choice) return false;
  // Pass the configuration name so VS Code resolves developer-owned configuration as-is.
  return vscode.debug.startDebugging(folder, choice.configuration.name);
}

module.exports = { availableConfigurations, debugView, createDebugTracker,
  getActiveDebugTracker, startNativeDebugging };
