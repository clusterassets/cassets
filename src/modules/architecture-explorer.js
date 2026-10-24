'use strict';
const vscode = require('vscode');
const { discover } = require('./architecture-core');
const { neighborhood, detail } = require('./architecture-view-core');
const crypto = require('node:crypto');
const { analyzerFor, manifests, classify } = require('./architecture-analyzers');

async function scanWorkspace(folder, options = {}) {
  const maxFiles = Math.min(Math.max(options.maxFiles || 300, 1), 1000);
  const maxBytes = Math.min(Math.max(options.maxBytes || 256 * 1024, 1024), 1024 * 1024);
  const files = {};
  const ignored = '**/{node_modules,.git,dist,build,coverage,.next,.turbo,vendor}/**';
  const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), ignored, Math.min(maxFiles * 8, 8000));
  const candidates = uris.filter(uri => {
    const file = uri.path.split('/').pop();
    return analyzerFor(file) || manifests.includes(file) || /\.(?:yaml|yml)$/.test(file);
  });
  let skipped = 0;
  for (const uri of candidates.slice(0, maxFiles)) {
    const rootPath = folder.uri.path.replace(/\/$/, '');
    if (!uri.path.startsWith(rootPath + '/')) { skipped++; continue; }
    const file = uri.path.slice(rootPath.length + 1);
    if (file.startsWith('../') || file.startsWith('/') || file.includes('/../')) { skipped++; continue; }
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > maxBytes) { skipped++; continue; }
      files[file] = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch { skipped++; }
  }
  const result = discover(files, { maxEdges: options.maxEdges || 4000 });
  return { ...result, scannedFiles: Object.keys(files).length, skippedFiles: skipped,
    truncated: result.truncated || candidates.length > maxFiles || uris.length >= Math.min(maxFiles * 8, 8000), folder: folder.name };
}

function mermaid(result) {
  const nodes = result.nodes.slice(0, 120);
  const included = new Set(nodes.map(node => node.id));
  const ids = new Map(nodes.map((node, i) => [node.id, 'n' + i]));
  const quote = value => String(value).replace(/["\\\r\n]/g, '_').slice(0, 90);
  const lines = ['flowchart LR'];
  for (const node of nodes) lines.push('  ' + ids.get(node.id) + '["' + quote(node.id) + '"]');
  for (const edge of result.edges) {
    if (included.has(edge.from) && included.has(edge.to)) lines.push('  ' + ids.get(edge.from) + ' --> ' + ids.get(edge.to));
  }
  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}
function view(graph, selected, direction, depth, nonce) {
  const slice = neighborhood(graph, selected, direction, depth);
  const item = detail(graph, selected);
  const items = graph.nodes.slice(0, 300).map(n =>
    '<option value="' + escapeHtml(n.id) + '"' + (n.id === selected ? ' selected' : '') + '>' + escapeHtml(n.id) + '</option>').join('');
  const lines = slice.edges.slice(0, 300).map(e =>
    '<tr><td><button data-select="' + escapeHtml(e.from) + '">' + escapeHtml(e.from) + '</button></td><td>' +
    escapeHtml(e.kind) + '</td><td><button data-select="' + escapeHtml(e.to) + '">' + escapeHtml(e.to) +
    '</button></td><td><button data-open="' + escapeHtml(e.evidence.file) + '" data-line="' + Number(e.evidence.line || 1) +
    '">Line ' + Number(e.evidence.line || 1) + '</button></td></tr>').join('');
  const issues = [...(item?.unresolved || []).map(x => 'Unresolved: ' + x.specifier + ' (line ' + x.line + ')'),
    ...(item?.external || []).map(x => 'External: ' + x.specifier + ' (line ' + x.line + ')')];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CAssets Architecture Explorer</title>
<style nonce="${nonce}">body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px}button,select{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:6px;margin:3px;max-width:100%}button{cursor:pointer}table{border-collapse:collapse;width:100%}td,th{padding:7px;border-bottom:1px solid var(--vscode-panel-border);text-align:left;overflow-wrap:anywhere}section{margin:16px 0;border:1px solid var(--vscode-panel-border);padding:12px}small{color:var(--vscode-descriptionForeground)}</style></head><body>
<h1>Architecture Explorer</h1><small>Static, provisional source references only. No runtime behavior or conformance is implied. ${graph.truncated ? 'Scan truncated.' : ''}</small>
<p>${graph.nodes.length} files · ${graph.edges.length} local edges · ${graph.unresolved.length} unresolved · ${graph.external.length} external</p>
<label for="node">Source node</label><select id="node">${items}</select>
<label for="direction">Relationships</label><select id="direction"><option value="both" ${direction==='both'?'selected':''}>Both</option><option value="incoming" ${direction==='incoming'?'selected':''}>Incoming</option><option value="outgoing" ${direction==='outgoing'?'selected':''}>Outgoing</option></select>
<label for="depth">Depth</label><select id="depth">${[1,2,3,4].map(n=>'<option value="'+n+'" '+(depth===n?'selected':'')+'>'+n+'</option>').join('')}</select>
<button id="open">Open selected source</button><button id="mermaid">Open Mermaid text</button>
<section><h2>${escapeHtml(selected)}</h2><p>Type: ${escapeHtml(item?.node.type || 'unknown')} · Analyzer: ${escapeHtml(item?.node.analyzer || 'none')}</p><p>Incoming: ${item?.incoming.length || 0} · Outgoing: ${item?.outgoing.length || 0} · View: ${slice.nodes.length} nodes, ${slice.edges.length} edges ${slice.truncated ? '(bounded)' : ''}</p></section>
<section><h2>Evidence-linked relationships</h2><table><thead><tr><th>From</th><th>Kind</th><th>To</th><th>Evidence</th></tr></thead><tbody>${lines || '<tr><td colspan="4">No relationships in selected view.</td></tr>'}</tbody></table></section>
<section><h2>Unresolved / external references</h2><ul>${issues.slice(0,80).map(x=>'<li>'+escapeHtml(x)+'</li>').join('') || '<li>None for selected source.</li>'}</ul></section>
<script nonce="${nonce}">const api=acquireVsCodeApi();const send=(action,extra={})=>api.postMessage({action,...extra});for(const id of ['node','direction','depth'])document.getElementById(id).addEventListener('change',()=>send('select',{selected:document.getElementById('node').value,direction:document.getElementById('direction').value,depth:Number(document.getElementById('depth').value)}));document.getElementById('open').addEventListener('click',()=>send('open',{file:document.getElementById('node').value,line:1}));document.getElementById('mermaid').addEventListener('click',()=>send('mermaid'));document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>send('select',{selected:b.dataset.select,direction:document.getElementById('direction').value,depth:Number(document.getElementById('depth').value)})));document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>send('open',{file:b.dataset.open,line:Number(b.dataset.line)})));</script>
</body></html>`;
}

async function showArchitectureExplorer(folder, options = {}) {
  if (!folder) { vscode.window.showInformationMessage('CAssets: open a workspace first.'); return; }
  const result = await scanWorkspace(folder, options);
  const panel = vscode.window.createWebviewPanel('cassets.architectureExplorer', 'CAssets · Architecture Explorer',
    vscode.ViewColumn.One, { enableScripts: true });
  const nonce = crypto.randomBytes(16).toString('hex');
  let selected = result.nodes[0]?.id || '';
  let direction = 'both', depth = 1;
  const render = () => { panel.webview.html = view(result, selected, direction, depth, nonce); };
  panel.webview.onDidReceiveMessage(async message => {
    if (!message || typeof message.action !== 'string') return;
    if (message.action === 'select') {
      if (!result.nodes.some(n => n.id === message.selected)) return;
      selected = message.selected;
      direction = ['both','incoming','outgoing'].includes(message.direction) ? message.direction : 'both';
      depth = Number.isInteger(message.depth) ? Math.min(4, Math.max(1, message.depth)) : 1;
      render();
    } else if (message.action === 'open') {
      if (typeof message.file !== 'string' || !result.nodes.some(n => n.id === message.file)) return;
      const uri = vscode.Uri.joinPath(folder.uri, message.file);
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, { preview: true });
      const line = Math.max(0, Math.min(document.lineCount - 1, (Number(message.line) || 1) - 1));
      editor.selection = new vscode.Selection(line, 0, line, 0);
      editor.revealRange(new vscode.Range(line, 0, line, 0));
    } else if (message.action === 'mermaid') {
      const document = await vscode.workspace.openTextDocument({ language: 'mermaid', content: mermaid(result) });
      await vscode.window.showTextDocument(document, { preview: false });
    }
  });
  render();
  return result;
}
module.exports = { scanWorkspace, mermaid, view, showArchitectureExplorer };
