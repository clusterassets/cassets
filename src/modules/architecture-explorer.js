'use strict';
const vscode = require('vscode');
const { discover } = require('./architecture-core');
const { neighborhood, detail } = require('./architecture-view-core');
const { layout } = require('./architecture-visual-core');
const { safeRelative, knownSource, boundedLine, containedSource } = require('./architecture-navigation');
const crypto = require('node:crypto');
const { analyzerFor, manifests } = require('./architecture-analyzers');

async function scanWorkspace(folder, options = {}) {
  const maxFiles = Math.min(Math.max(options.maxFiles || 1000, 1), 1000);
  const maxBytes = Math.min(Math.max(options.maxBytes || 256 * 1024, 1024), 1024 * 1024);
  if (!vscode.workspace.isTrusted) throw new Error('CAssets: Architecture scan requires Workspace Trust.');
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
    if (!safeRelative(file)) { skipped++; continue; }
    try {
      if (!await containedSource(folder.uri, uri)) { skipped++; continue; }
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > maxBytes) { skipped++; continue; }
      files[file] = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    } catch { skipped++; }
  }
  try {
    const configUri = vscode.Uri.joinPath(folder.uri, 'tsconfig.json');
    if (await containedSource(folder.uri, configUri)) {
      const stat = await vscode.workspace.fs.stat(configUri);
      if (stat.size <= maxBytes) files['tsconfig.json'] = Buffer.from(await vscode.workspace.fs.readFile(configUri)).toString('utf8');
    }
  } catch { /* tsconfig is optional */ }
  const result = discover(files, { maxEdges: options.maxEdges || 4000 });
  return { ...result, scannedFiles: Object.keys(files).length, skippedFiles: skipped,
    truncated: result.truncated || candidates.length > maxFiles || uris.length >= Math.min(maxFiles * 8, 8000), folder: folder.name, folderUri: folder.uri.toString() };
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
function view(graph, selected, direction, depth, nonce, type = 'all', kind = 'all') {
  const slice = neighborhood(graph, selected, direction, depth);
  const item = detail(graph, selected);
  const visual = layout(graph, selected, direction, depth, type, kind);
  const types = [...new Set(graph.nodes.map(n => n.type))].sort();
  const kinds = [...new Set(graph.edges.map(e => e.kind))].sort();
  const selectable = graph.nodes.slice(0, 299);
  if (selected && !selectable.some(n => n.id === selected)) selectable.unshift(graph.nodes.find(n => n.id === selected));
  const items = selectable.filter(Boolean).map(n =>
    '<option value="' + escapeHtml(n.id) + '"' + (n.id === selected ? ' selected' : '') + '>' + escapeHtml(n.id) + '</option>').join('');
  const lines = slice.edges.slice(0, 300).filter(e => e.evidence && typeof e.evidence.file === 'string').map(e =>
    '<tr><td><button data-select="' + escapeHtml(e.from) + '">' + escapeHtml(e.from) + '</button></td><td>' +
    escapeHtml(e.kind) + '</td><td><button data-select="' + escapeHtml(e.to) + '">' + escapeHtml(e.to) +
    '</button></td><td><button data-open="' + escapeHtml(e.evidence.file) + '" data-line="' + Number(e.evidence.line || 1) +
    '">Line ' + Number(e.evidence.line || 1) + '</button></td></tr>').join('');
  const positions = new Map(visual.nodes.map(n => [n.id, n]));
  const svgEdges = visual.edges.map((edge, i) => {
    const from = positions.get(edge.from), to = positions.get(edge.to);
    if (!from || !to) return '';
    const x1 = from.x + from.width / 2, y1 = from.y + from.height / 2;
    const x2 = to.x + to.width / 2, y2 = to.y + to.height / 2;
    return '<g role="button" tabindex="0" data-edge="' + i + '" aria-label="Open evidence for ' +
      escapeHtml(edge.from + ' to ' + edge.to) + '"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="currentColor" stroke-opacity=".5" stroke-width="2" marker-end="url(#arrow)"/><line x1="' + x1 +
      '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="transparent" stroke-width="16"/></g>';
  }).join('');
  const svgNodes = visual.nodes.map(n => '<g data-node="' + escapeHtml(n.id) + '" role="button" tabindex="0" aria-label="Select ' +
    escapeHtml(n.id) + '"><rect x="' + n.x + '" y="' + n.y + '" width="' + n.width + '" height="' + n.height +
    '" rx="8" fill="' + (n.id === selected ? 'var(--vscode-button-background)' : 'var(--vscode-editorWidget-background)') +
    '" stroke="var(--vscode-focusBorder)"/><text x="' + (n.x+8) + '" y="' + (n.y+24) +
    '" fill="var(--vscode-foreground)" font-size="12">' + escapeHtml(n.id.length > 27 ? n.id.slice(0,24)+'…' : n.id) +
    '</text><text x="' + (n.x+8) + '" y="' + (n.y+44) + '" fill="var(--vscode-descriptionForeground)" font-size="10">' +
    escapeHtml(n.type) + '</text></g>').join('');
  const issues = [...(item?.unresolved || []).map(x => 'Unresolved: ' + x.specifier + ' (line ' + x.line + ')'),
    ...(item?.external || []).map(x => 'External: ' + x.specifier + ' (line ' + x.line + ')')];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>CAssets Architecture Explorer</title>
<style nonce="${nonce}">body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);background:var(--vscode-editor-background);padding:20px}input{background:var(--vscode-input-background);color:var(--vscode-input-foreground);padding:8px;max-width:100%}.toolbar,.quick-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}details{margin:12px 0;padding:10px;border:1px solid var(--vscode-panel-border)}button[aria-pressed=true]{outline:2px solid var(--vscode-focusBorder)}button,select{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;padding:6px;margin:3px;max-width:100%}button{cursor:pointer}table{border-collapse:collapse;width:100%}td,th{padding:7px;border-bottom:1px solid var(--vscode-panel-border);text-align:left;overflow-wrap:anywhere}section{margin:16px 0;border:1px solid var(--vscode-panel-border);padding:12px}small{color:var(--vscode-descriptionForeground)}</style></head><body>
<h1>Architecture Explorer</h1><small>Static, provisional source references only. No runtime behavior or conformance is implied. ${graph.truncated ? 'Scan truncated.' : ''}</small>
<p>${graph.nodes.length} files · ${graph.edges.length} local edges · ${graph.unresolved.length} unresolved · ${graph.external.length} external</p>
<div class="toolbar"><label for="search-node">Find a file or module</label><input id="search-node" type="search" placeholder="Search files…" aria-controls="node"><button id="open">Open source</button></div>
<div class="quick-actions" role="group" aria-label="Connection direction"><button id="show-both" aria-pressed="${direction==='both'}">Connections</button><button id="show-uses" aria-pressed="${direction==='outgoing'}">Uses</button><button id="show-used-by" aria-pressed="${direction==='incoming'}">Used by</button></div>
<details id="advanced"><summary>Advanced filters and export</summary>
<label for="node">Focused file</label><select id="node">${items}</select>
<label for="direction">Relationships</label><select id="direction"><option value="both" ${direction==='both'?'selected':''}>Both</option><option value="incoming" ${direction==='incoming'?'selected':''}>Incoming</option><option value="outgoing" ${direction==='outgoing'?'selected':''}>Outgoing</option></select>
<label for="depth">Depth</label><select id="depth">${[1,2,3,4].map(n=>'<option value="'+n+'" '+(depth===n?'selected':'')+'>'+n+'</option>').join('')}</select>
<label for="type">File type</label><select id="type"><option value="all">All</option>${types.map(t => '<option value="'+escapeHtml(t)+'" '+(type===t?'selected':'')+'>'+escapeHtml(t)+'</option>').join('')}</select>
<label for="kind">Relationship</label><select id="kind"><option value="all">All</option>${kinds.map(k => '<option value="'+escapeHtml(k)+'" '+(kind===k?'selected':'')+'>'+escapeHtml(k)+'</option>').join('')}</select>
<button id="mermaid">Export Mermaid</button></details>
<section><h2>${escapeHtml(selected)}</h2><p>Type: ${escapeHtml(item?.node.type || 'unknown')} · Analyzer: ${escapeHtml(item?.node.analyzer || 'none')}</p><p>Incoming: ${item?.incoming.length || 0} · Outgoing: ${item?.outgoing.length || 0} · View: ${slice.nodes.length} nodes, ${slice.edges.length} edges ${slice.truncated ? '(bounded)' : ''}</p></section>
<section><h2>Dependency map</h2><small>Bounded to 90 nodes / 180 edges. Select nodes to explore. Zoom and pan are local to the graph. ${visual.truncated ? 'View truncated.' : ''}</small>
<div class="actions"><button id="zoom-in">Zoom +</button><button id="zoom-out">Zoom −</button><button id="zoom-reset">Reset view</button></div>
<div id="graph-viewport" tabindex="0" aria-label="Dependency graph; use buttons for zoom" style="overflow:auto;max-height:560px;border:1px solid var(--vscode-panel-border)">
<svg id="architecture-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${visual.width} ${visual.height}" width="${visual.width}" height="${visual.height}" role="img" aria-label="Architecture dependencies">
<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor"/></marker></defs>${svgEdges}${svgNodes}</svg></div></section>
<section><h2>Evidence-linked relationships</h2><table><thead><tr><th>From</th><th>Kind</th><th>To</th><th>Evidence</th></tr></thead><tbody>${lines || '<tr><td colspan="4">No relationships in selected view.</td></tr>'}</tbody></table></section>
<section><h2>Unresolved / external references</h2><ul>${issues.slice(0,80).map(x=>'<li>'+escapeHtml(x)+'</li>').join('') || '<li>None for selected source.</li>'}</ul></section>
<script nonce="${nonce}">const api=acquireVsCodeApi();const send=(action,extra={})=>api.postMessage({action,...extra});const saved=api.getState()||{};const focusKey=()=>{const a=document.activeElement;if(!a)return null;if(a.dataset?.node)return {kind:'node',id:a.dataset.node};if(a.dataset?.edge)return {kind:'edge',id:a.dataset.edge};if(a.id)return {kind:'id',id:a.id};return null};const selectState=()=>({selected:document.getElementById('node').value,direction:document.getElementById('direction').value,depth:Number(document.getElementById('depth').value),type:document.getElementById('type').value,kind:document.getElementById('kind').value});const sendSelect=(selected)=>{api.setState({...api.getState(),focus:focusKey()});send('select',{...selectState(),selected})};const search=document.getElementById('search-node');const nodeSelect=document.getElementById('node');search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();for(const option of nodeSelect.options)option.hidden=!!q&&!option.value.toLowerCase().includes(q)});search.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();const match=Array.from(nodeSelect.options).find(o=>o.value.toLowerCase().includes(search.value.trim().toLowerCase()));if(match){nodeSelect.value=match.value;sendSelect(match.value)}}});for(const [id,value] of [['show-both','both'],['show-uses','outgoing'],['show-used-by','incoming']])document.getElementById(id).addEventListener('click',()=>{document.getElementById('direction').value=value;sendSelect(nodeSelect.value)});for(const id of ['node','direction','depth','type','kind'])document.getElementById(id).addEventListener('change',()=>sendSelect(document.getElementById('node').value));document.getElementById('open').addEventListener('click',()=>send('open',{file:document.getElementById('node').value,line:1}));document.getElementById('mermaid').addEventListener('click',()=>send('mermaid'));document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>sendSelect(b.dataset.select)));const svg=document.getElementById('architecture-svg');const viewport=document.getElementById('graph-viewport');let scale=Math.max(.4,Math.min(2.5,Number(saved.scale)||1));const apply=()=>{svg.setAttribute('width',String(${visual.width}*scale));svg.setAttribute('height',String(${visual.height}*scale));api.setState({...api.getState(),scale,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop})};document.getElementById('zoom-in').addEventListener('click',()=>{scale=Math.min(2.5,scale+.2);apply()});document.getElementById('zoom-out').addEventListener('click',()=>{scale=Math.max(.4,scale-.2);apply()});document.getElementById('zoom-reset').addEventListener('click',()=>{scale=1;apply();viewport.scrollTo(0,0)});let dragging=false,startX=0,startY=0,scrollX=0,scrollY=0;viewport.addEventListener('pointerdown',e=>{if(e.target.closest('[data-node]'))return;dragging=true;startX=e.clientX;startY=e.clientY;scrollX=viewport.scrollLeft;scrollY=viewport.scrollTop});viewport.addEventListener('pointermove',e=>{if(dragging){viewport.scrollLeft=scrollX-(e.clientX-startX);viewport.scrollTop=scrollY-(e.clientY-startY)}});viewport.addEventListener('pointerup',()=>dragging=false);viewport.addEventListener('pointercancel',()=>dragging=false);apply();viewport.scrollLeft=Number(saved.scrollLeft)||0;viewport.scrollTop=Number(saved.scrollTop)||0;viewport.addEventListener('scroll',()=>api.setState({...api.getState(),scale,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop}));svg.querySelectorAll('[data-edge]').forEach(e=>{const open=()=>send('edge',{index:Number(e.dataset.edge)});e.addEventListener('click',open);e.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}})});const restore=()=>{const f=saved.focus;if(!f)return;let target=null;if(f.kind==='id')target=document.getElementById(f.id);else if(f.kind==='node')target=Array.from(svg.querySelectorAll('[data-node]')).find(n=>n.dataset.node===f.id);else if(f.kind==='edge')target=Array.from(svg.querySelectorAll('[data-edge]')).find(n=>n.dataset.edge===f.id);(target||document.getElementById('node')).focus()};svg.querySelectorAll('[data-node]').forEach(n=>{const select=()=>sendSelect(n.dataset.node);n.addEventListener('click',select);n.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}})});document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>send('open',{file:b.dataset.open,line:Number(b.dataset.line)})));restore();</script>
</body></html>`;
}

async function showArchitectureExplorer(folder, options = {}) {
  if (!folder) { vscode.window.showInformationMessage('CAssets: open a workspace first.'); return; }
  if (!vscode.workspace.isTrusted) { vscode.window.showWarningMessage('CAssets: Trust this workspace to scan architecture.'); return; }
  const result = await scanWorkspace(folder, options);
  const panel = vscode.window.createWebviewPanel('cassets.architectureExplorer', 'CAssets · Architecture Explorer',
    vscode.ViewColumn.One, { enableScripts: true });
  const nonce = crypto.randomBytes(16).toString('hex');
  let selected = result.nodes.find(n => /(?:^|\/)(?:server|app|index|main)\.[cm]?[jt]sx?$/.test(n.id))?.id || result.nodes[0]?.id || '';
  let direction = 'both', depth = 1, type = 'all', kind = 'all';
  const render = () => { panel.webview.html = view(result, selected, direction, depth, nonce, type, kind); };
  panel.webview.onDidReceiveMessage(async message => {
    if (!vscode.workspace.workspaceFolders?.some(f => f.uri.toString() === result.folderUri)) return;
    if (!message || typeof message.action !== 'string') return;
    if (message.action === 'select') {
      if (!result.nodes.some(n => n.id === message.selected)) return;
      selected = message.selected;
      direction = ['both','incoming','outgoing'].includes(message.direction) ? message.direction : 'both';
      depth = Number.isInteger(message.depth) ? Math.min(4, Math.max(1, message.depth)) : 1;
      const types = new Set(result.nodes.map(n => n.type));
      const kinds = new Set(result.edges.map(e => e.kind));
      type = types.has(message.type) ? message.type : 'all';
      kind = kinds.has(message.kind) ? message.kind : 'all';
      render();
    } else if (message.action === 'edge') {
      const edges = layout(result, selected, direction, depth, type, kind).edges;
      if (!Number.isInteger(message.index) || message.index < 0 || message.index >= edges.length) return;
      const evidence = edges[message.index].evidence;
      if (!evidence || !knownSource(result, evidence.file) || !vscode.workspace.isTrusted) return;
      const target = vscode.Uri.joinPath(folder.uri, evidence.file);
      if (!await containedSource(folder.uri, target)) return;
      const document = await vscode.workspace.openTextDocument(target);
      const editor = await vscode.window.showTextDocument(document, { preview: true });
      const line = boundedLine(evidence.line, document.lineCount);
      editor.selection = new vscode.Selection(line, 0, line, 0);
      editor.revealRange(new vscode.Range(line, 0, line, 0));
    } else if (message.action === 'open') {
      if (!knownSource(result, message.file) || !vscode.workspace.isTrusted) return;
      const uri = vscode.Uri.joinPath(folder.uri, message.file);
      if (!await containedSource(folder.uri, uri)) return;
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document, { preview: true });
      const line = boundedLine(message.line, document.lineCount);
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
