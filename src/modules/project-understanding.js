'use strict';

const vscode = require('vscode');

const ACTIONS = Object.freeze({
  refresh: null,
  doctor: 'cassets.checkPrerequisites',
  health: 'cassets.projectHealth',
  run: 'cassets.runRecommended',
  guide: 'cassets.showOnboarding',
  graph: 'cassets.showWorkspaceGraph',
  intelligence: 'cassets.showIntelligence',
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

function render(model, nonce) {
  const tags = items => items.length ? items.map(x => '<span class="tag">' + escapeHtml(x) + '</span>').join('') : '<span class="muted">Not detected</span>';
  const rows = model.scripts.length ? model.scripts.map(x =>
    '<tr><th scope="row">' + escapeHtml(x.name) + '</th><td><code>' + escapeHtml(x.command) + '</code></td></tr>'
  ).join('') : '<tr><td colspan="2">No package scripts detected</td></tr>';
  const runtime = model.runtime.length ? model.runtime.map(x =>
    '<li><strong>' + escapeHtml(x.name) + '</strong> ' + escapeHtml(x.value) + '</li>'
  ).join('') : '<li>Runtime versions not declared</li>';
  const buttons = [
    ['doctor', 'Check prerequisites'], ['health', 'Project health'], ['run', 'Run recommended'],
    ['guide', 'Onboarding'], ['graph', 'Workspace graph'], ['intelligence', 'More intelligence']
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
section{border:1px solid var(--vscode-panel-border);border-radius:8px;padding:18px;min-width:0}
.tag{display:inline-block;padding:4px 8px;border-radius:5px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);margin:3px}
button{cursor:pointer;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;border-radius:4px;padding:8px 12px;margin:4px}
button:hover{background:var(--vscode-button-hoverBackground)}button:focus-visible{outline:2px solid var(--vscode-focusBorder)}
table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:9px;border-bottom:1px solid var(--vscode-panel-border);vertical-align:top}
td{overflow-wrap:anywhere}code{font-family:var(--vscode-editor-font-family)}.actions{display:flex;flex-wrap:wrap}
</style></head><body>
<header><div><div class="eyebrow muted">CAssets / Project Understanding</div><h1>${escapeHtml(model.name)}</h1><p class="muted">Read-only project overview. Commands remain available in the Command Palette.</p></div><button data-action="refresh">Refresh</button></header>
<div class="grid">
<section><h2>Detected stack</h2>${tags(model.languages)}<h2>Frameworks and tools</h2>${tags(model.frameworks)}</section>
<section><h2>Runtime requirements</h2><ul>${runtime}</ul><p>Workspace: ${model.monorepo ? 'Monorepo detected' : 'Single workspace or undetermined'}</p></section>
<section><h2>Code quality</h2><p>Formatter: <strong>${escapeHtml(model.formatter)}</strong></p><p>Linter: <strong>${escapeHtml(model.linter)}</strong></p><p>Tests: ${tags(model.tests)}</p></section>
</div>
<section><h2>Available repository scripts</h2><table><thead><tr><th>Script</th><th>Command</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">Commands are shown for inspection, not executed automatically.</p></section>
<section style="margin-top:14px"><h2>Developer actions</h2><div class="actions">${buttons}</div><p class="muted">Run Recommended requires confirmation. Workspace setup can change files and is deliberately separate.</p><button data-action="setup">Apply workspace setup…</button></section>
<script nonce="${nonce}">const vscode=acquireVsCodeApi();document.querySelectorAll('button[data-action]').forEach(button=>button.addEventListener('click',()=>vscode.postMessage({action:button.dataset.action})));</script>
</body></html>`;
}

async function openProjectUnderstanding(inspectFolder) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) { vscode.window.showInformationMessage('CAssets: open a workspace to understand its project.'); return; }
  const panel = vscode.window.createWebviewPanel('cassets.projectUnderstanding', 'CAssets · ' + folder.name,
    vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: false });
  const nonce = require('crypto').randomBytes(16).toString('hex');
  const refresh = async () => {
    try {
      const { stack, intelligence } = await inspectFolder(folder);
      panel.webview.html = render(viewModel(folder, stack, intelligence), nonce);
    } catch (error) {
      vscode.window.showErrorMessage('CAssets: project inspection failed: ' + error.message);
    }
  };
  panel.webview.onDidReceiveMessage(async message => {
    if (!message || typeof message.action !== 'string' ||
        !Object.prototype.hasOwnProperty.call(ACTIONS, message.action)) return;
    if (message.action === 'refresh') { await refresh(); return; }
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

module.exports = { openProjectUnderstanding, viewModel, escapeHtml, render };
