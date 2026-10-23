'use strict';

const vscode = require('vscode');
const doctor = require('./workspace-doctor');
const verification = require('./doctor-verification');
const prerequisites = require('./prerequisites');
const { inventory } = require('./command-inventory');
const { taskView } = require('./project-task-view');
const { getActiveTaskLifecycle } = require('./task-lifecycle');

const ACTIONS = Object.freeze({
  refresh: null,
  doctor: null,
  copy: null,
  source: null,
  verify: null,
  folder: null,
  health: 'cassets.projectHealth',
  run: 'cassets.runRecommended',
  runWorkspace: 'cassets.runWorkspaceScript',
  guide: 'cassets.showOnboarding',
  graph: 'cassets.showWorkspaceGraph',
  intelligence: 'cassets.showIntelligence',
  tasks: 'cassets.showTaskHistory',
  setup: 'cassets.bootstrapWorkspace'
});

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function viewModel(folder, stack, intelligence) {
  const languages = ['node', 'python', 'dotnet', 'rust', 'go', 'java', 'docker', 'terraform', 'ansible', 'kubernetes']
    .filter(key => stack[key]);
  const frameworks = Object.entries(stack.framework || {}).filter(([, enabled]) => enabled).map(([name]) => name);
  const scripts = Object.entries(stack.scripts || {}).filter(([key, value]) =>
    typeof key === 'string' && typeof value === 'string'
  ).slice(0, 24).map(([name, command]) => ({ name, command }));
  const runtime = Object.entries(intelligence.runtime || {}).map(([name, value]) => ({
    name, value: typeof value === 'object' ? [value?.name, value?.version].filter(Boolean).join('@') : value
  })).filter(x => x.value);
  return { name: folder.name, languages, frameworks, scripts, runtime,
    monorepo: !!intelligence.summary?.monorepo,
    formatter: intelligence.summary?.formatter || 'Not detected',
    linter: intelligence.summary?.linter || 'Not detected',
    tests: intelligence.summary?.testFrameworks || [] };
}

const SOURCES = Object.freeze({
  'runtime.node.mismatch': 'package.json',
  'runtime.node.unverified': 'package.json'
});
function sourceFor(id) {
  return Object.prototype.hasOwnProperty.call(SOURCES, id) ? SOURCES[id] : null;
}
function doctorSection(report) {
  if (!report) return '<section id="doctor"><h2>Workspace Doctor</h2><p class="muted">Run diagnostics to inspect local prerequisites and workspace issues.</p><button data-action="doctor">Run Workspace Doctor</button></section>';
  const counts = report.counts || { error: 0, warning: 0, info: 0 };
  const items = (report.diagnostics || []).map(d => {
    const severity = ['error', 'warning', 'info'].includes(d.severity) ? d.severity : 'info';
    return '<details class="finding" data-severity="' + severity + '"><summary><span class="severity ' + severity + '">' +
      escapeHtml(severity.toUpperCase()) + '</span> ' + escapeHtml(d.title) + '</summary>' +
      '<p>' + escapeHtml(d.detail) + '</p><p><strong>Evidence:</strong> ' + escapeHtml(d.evidence) +
      '</p><p><strong>Recommended:</strong> ' + escapeHtml(d.remediation) + '</p>' +
      '<button data-copy="' + escapeHtml(d.id) + '">Copy guidance</button>' +
      (verification.scopeFor(d.id) ? '<button data-verify="' + escapeHtml(d.id) + '">Verify fix</button>' : '') +
      (sourceFor(d.id) ? '<button data-source="' + escapeHtml(d.id) + '">Open source</button>' : '') +
      (d.lifecycle ? '<span class="muted"> ' + escapeHtml(d.lifecycle) + '</span>' : '') + '</details>';
  }).join('');
  return '<section id="doctor"><h2>Workspace Doctor</h2><p>' +
    counts.error + ' errors · ' + counts.warning + ' warnings · ' + counts.info +
    ' informational · ' + Number(report.checked || 0) + ' tool checks · ' + Number(report.resolved || 0) + ' resolved since previous run</p>' +
    '<div class="actions"><button data-filter="all">All</button><button data-filter="error">Errors</button>' +
    '<button data-filter="warning">Warnings</button><button data-filter="info">Info</button>' +
    '<button data-action="doctor">Re-run diagnostics</button></div>' +
    (items || '<p>No problems detected by supported checks. This does not verify a successful build.</p>') +
    '</section>';
}

function render(model, nonce, report = null, folders = [], commands = [], taskState = { counts: {}, tasks: [] }) {
  const tags = items => items.length ? items.map(x => '<span class="tag">' + escapeHtml(x) + '</span>').join('') : '<span class="muted">Not detected</span>';
  const rows = model.scripts.length ? model.scripts.map(x =>
    '<tr><th scope="row">' + escapeHtml(x.name) + '</th><td><code>' + escapeHtml(x.command) + '</code></td></tr>'
  ).join('') : '<tr><td colspan="2">No package scripts detected</td></tr>';
  const commandRows = commands.map(x => '<tr><th scope="row">' + escapeHtml(x.root ? 'Root' : x.packageName) +
    '</th><td>' + escapeHtml(x.name) + '</td><td><code>' + escapeHtml(x.command) +
    '</code></td><td>' + escapeHtml(x.delegatedTo ? 'Delegates to ' + x.delegatedTo.package + ':' + x.delegatedTo.script : x.risk) + '</td></tr>').join('');
  const runtime = model.runtime.length ? model.runtime.map(x =>
    '<li><strong>' + escapeHtml(x.name) + '</strong> ' + escapeHtml(x.value) + '</li>'
  ).join('') : '<li>Runtime versions not declared</li>';
  const taskRows = taskState.tasks.map(task => '<tr><th scope="row">' + escapeHtml(task.name) + '</th><td>' + escapeHtml(task.status) + '</td><td>' + (task.exitCode === null ? '—' : task.exitCode) + '</td><td>' + (task.startedAt ? escapeHtml(new Date(task.startedAt).toLocaleString()) : '—') + '</td></tr>').join('');
  const taskCounts = taskState.counts || {};
  const buttons = [
    ['health', 'Project health'], ['runWorkspace', 'Run workspace script'], ['run', 'Run recommended'],
    ['tasks', 'Task history'], ['guide', 'Onboarding'], ['graph', 'Workspace graph'], ['intelligence', 'More intelligence']
  ].map(([id, label]) => '<button type="button" data-action="' + id + '">' + label + '</button>').join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<title>CAssets Project Understanding</title>
<style nonce="${nonce}">
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:24px;max-width:1100px;margin:auto}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
h1{margin:0 0 4px;font-size:1.7rem}h2{font-size:1.1rem;margin-top:0}
.muted{color:var(--vscode-descriptionForeground)}.eyebrow{letter-spacing:.1em;text-transform:uppercase;font-size:.75rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin:20px 0}
section{border:1px solid var(--vscode-panel-border);border-radius:8px;padding:18px;min-width:0}.finding{border-top:1px solid var(--vscode-panel-border);padding:12px 0}.finding summary{cursor:pointer}.severity{font-size:.75rem;font-weight:700}.severity.error{color:var(--vscode-errorForeground)}.severity.warning{color:var(--vscode-editorWarning-foreground)}.severity.info{color:var(--vscode-descriptionForeground)}
.tag{display:inline-block;padding:4px 8px;border-radius:5px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);margin:3px}
button{cursor:pointer;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;border-radius:4px;padding:8px 12px;margin:4px}
button:hover{background:var(--vscode-button-hoverBackground)}button:focus-visible{outline:2px solid var(--vscode-focusBorder)}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid var(--vscode-panel-border);vertical-align:top}
td{overflow-wrap:anywhere}code{font-family:var(--vscode-editor-font-family)}.actions{display:flex;flex-wrap:wrap}
</style></head><body>
<header><div><div class="eyebrow muted">CAssets / Project Understanding</div><h1>${escapeHtml(model.name)}</h1><p class="muted">Read-only project overview. Commands remain available in the Command Palette.</p></div><button data-action="refresh">Refresh</button></header>
<div class="actions">${folders.length > 1 ? '<label for="folder-select">Project: </label><select id="folder-select">' + folders.map((f, i) => '<option value="' + i + '"' + (f.name === model.name ? ' selected' : '') + '>' + escapeHtml(f.name) + '</option>').join('') + '</select>' : ''}</div>
<div class="grid">
<section><h2>Detected stack</h2>${tags(model.languages)}<h2>Frameworks and tools</h2>${tags(model.frameworks)}</section>
<section><h2>Runtime requirements</h2><ul>${runtime}</ul><p>Workspace: ${model.monorepo ? 'Monorepo detected' : 'Single workspace or undetermined'}</p></section>
<section><h2>Code quality</h2><p>Formatter: <strong>${escapeHtml(model.formatter)}</strong></p><p>Linter: <strong>${escapeHtml(model.linter)}</strong></p><p>Tests: ${tags(model.tests)}</p></section>
</div>
<section id="tasks"><h2>Native task lifecycle</h2><p class="muted">Session-only, workspace-scoped. Task completion does not verify service health.</p><p>Scheduled: ${taskCounts.scheduled || 0} · Running: ${taskCounts.running || 0} · Completed: ${taskCounts.completed || 0} · Failed: ${taskCounts.failed || 0} · Unknown: ${taskCounts.unknown || 0}</p><table><thead><tr><th>Task</th><th>Status</th><th>Exit</th><th>Started</th></tr></thead><tbody>${taskRows || '<tr><td colspan="4">No CAssets tasks recorded for this workspace session.</td></tr>'}</tbody></table><button data-action="tasks">Show task history</button></section>
${doctorSection(report)}
<section><h2>Discovered workspace commands</h2><p class="muted">Root and package commands are shown independently. Discovery never runs commands.</p><table><thead><tr><th>Origin</th><th>Script</th><th>Command</th><th>Classification</th></tr></thead><tbody>${commandRows || '<tr><td colspan="4">No workspace commands discovered</td></tr>'}</tbody></table></section>
<section><h2>Available repository scripts</h2><table><thead><tr><th>Script</th><th>Command</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Commands are shown for inspection, not executed automatically.</p></section>
<section style="margin-top:14px"><h2>Developer actions</h2><div class="actions">${buttons}</div><p class="muted">Run Recommended requires confirmation. Workspace setup can change files and is deliberately separate.</p><button data-action="setup">Apply workspace setup…</button></section>
<script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({action:button.dataset.action})));document.querySelectorAll('button[data-filter]').forEach(button=>button.addEventListener('click',()=>document.querySelectorAll('.finding').forEach(item=>item.hidden=button.dataset.filter!=='all'&&item.dataset.severity!==button.dataset.filter)));document.querySelectorAll('button[data-verify]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({action:'verify',id:button.dataset.verify})));document.querySelectorAll('button[data-source]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({action:'source',id:button.dataset.source})));document.getElementById('folder-select')?.addEventListener('change',event=>vscode.postMessage({action:'folder',index:Number(event.target.value)}));document.querySelectorAll('button[data-copy]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({action:'copy',id:button.dataset.copy})));</script>
</body></html>`;
}

async function openProjectUnderstanding(inspectFolder, inspectDoctor, inspectGraph = inspectDoctor, lifecycle = null) {
  lifecycle = lifecycle || getActiveTaskLifecycle();
  const folders = vscode.workspace.workspaceFolders || [];
  let folder = folders[0];
  if (!folder) { vscode.window.showInformationMessage('CAssets: open a workspace to understand its project.'); return; }
  const panel = vscode.window.createWebviewPanel('cassets.projectUnderstanding', 'CAssets · ' + folder.name,
    vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: false });
  const nonce = require('crypto').randomBytes(16).toString('hex');
  let report = null;
  let currentModel = null;
  let previousIds = new Set();
  let checking = false;
  let cachedCommands = [];
  let disposed = false;
  const renderCurrent = () => {
    if (!disposed && currentModel) panel.webview.html = render(currentModel, nonce, report, folders, cachedCommands,
      taskView(lifecycle?.snapshot() || [], folder.name));
  };
  const lifecycleListener = lifecycle?.onDidChange(() => renderCurrent());
  panel.onDidDispose(() => { disposed = true; lifecycleListener?.dispose(); });
  const refresh = async () => {
    try {
      const { stack, intelligence } = await inspectFolder(folder);
      currentModel = viewModel(folder, stack, intelligence);
      const graphResult = await inspectGraph(folder);
      const commands = inventory(graphResult.workspaceGraph?.packages || [{ path: '.', name: stack.package?.name || '(root)', scripts: stack.scripts || {} }]);
      cachedCommands = commands;
      renderCurrent();
    } catch (error) {
      vscode.window.showErrorMessage('CAssets: project inspection failed: ' + error.message);
    }
  };
  panel.webview.onDidReceiveMessage(async message => {
    if (!message || typeof message.action !== 'string' ||
        !Object.prototype.hasOwnProperty.call(ACTIONS, message.action)) return;
    if (message.action === 'refresh') { await refresh(); return; }
    if (message.action === 'folder') {
      if (checking) return;
      if (!Number.isInteger(message.index) || message.index < 0 || message.index >= folders.length) return;
      folder = folders[message.index];
      report = null;
      previousIds = new Set();
      panel.title = 'CAssets · ' + folder.name;
      await refresh();
      return;
    }
    if (message.action === 'source') {
      const finding = report?.diagnostics?.find(d => d.id === message.id);
      const relative = finding && sourceFor(finding.id);
      if (!relative) return;
      const uri = vscode.Uri.joinPath(folder.uri, relative);
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document, { preview: true });
      } catch {
        vscode.window.showWarningMessage('CAssets: source file is unavailable: ' + relative);
      }
      return;
    }
    if (message.action === 'verify') {
      if (!vscode.workspace.isTrusted || checking || !report?.diagnostics?.some(d => d.id === message.id)) return;
      if (!verification.scopeFor(message.id)) return;
      checking = true;
      try {
        const outcome = await verification.verify(message.id, folder, inspectFolder, inspectGraph,
          prerequisites.checkCommand, doctor.diagnose);
        report = verification.mergeReport(report, outcome.report, outcome.scope);
        previousIds = new Set(report.diagnostics.map(d => d.id));
        await refresh();
      } catch (error) { vscode.window.showErrorMessage('CAssets: targeted verification failed: ' + error.message); }
      finally { checking = false; }
      return;
    }
    if (message.action === 'doctor') {
      if (!vscode.workspace.isTrusted) { vscode.window.showWarningMessage('CAssets: Workspace Doctor requires Workspace Trust.'); return; }
      if (checking) return;
      checking = true;
      try {
        const inspected = await inspectDoctor(folder);
        const next = doctor.diagnose(inspected.stack, inspected.intelligence, inspected.prerequisites, inspected.workspaceGraph);
        const nextIds = new Set(next.diagnostics.map(d => d.id));
        next.resolved = [...previousIds].filter(id => !nextIds.has(id)).length;
        next.diagnostics = next.diagnostics.map(d => ({ ...d, lifecycle: previousIds.has(d.id) ? 'Persistent' : 'New' }));
        previousIds = nextIds;
        report = next;
        await refresh();
      } catch (error) { vscode.window.showErrorMessage('CAssets: Workspace Doctor failed: ' + error.message); }
      finally { checking = false; }
      return;
    }
    if (message.action === 'copy') {
      const finding = report?.diagnostics?.find(d => d.id === message.id);
      if (finding) await vscode.env.clipboard.writeText(finding.remediation);
      return;
    }
    if (message.action === 'setup') {
      if (!vscode.workspace.isTrusted) {
        vscode.window.showWarningMessage('CAssets: workspace setup requires Workspace Trust.');
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        'CAssets can create missing workspace configuration files. Review the proposed changes before committing.',
        { modal: true }, 'Apply setup');
      if (choice !== 'Apply setup') return;
    }
    await vscode.commands.executeCommand(ACTIONS[message.action]);
  });
  await refresh();
}

module.exports = { openProjectUnderstanding, viewModel, escapeHtml, render, doctorSection, sourceFor };
