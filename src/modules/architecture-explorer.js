'use strict';
const vscode = require('vscode');
const { discover } = require('./architecture-core');
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

async function showArchitectureExplorer(folder, options = {}) {
  if (!folder) { vscode.window.showInformationMessage('CAssets: open a workspace first.'); return; }
  const result = await scanWorkspace(folder, options);
  const document = await vscode.workspace.openTextDocument({ language: 'mermaid', content: mermaid(result) });
  await vscode.window.showTextDocument(document, { preview: false });
  vscode.window.showInformationMessage('CAssets: discovered ' + result.nodes.length + ' analyzed/config files and ' +
    result.edges.length + ' static dependencies' + (result.truncated ? ' (scan truncated)' : '') +
    '. Diagram is a text preview; unresolved edges: ' + result.unresolved.length + '.');
  return result;
}
module.exports = { scanWorkspace, mermaid, showArchitectureExplorer };
