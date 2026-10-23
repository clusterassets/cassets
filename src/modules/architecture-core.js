'use strict';
const path = require('node:path').posix;
const SOURCE = /\.(?:[cm]?[jt]sx?)$/i;
const RESOLUTIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
function normalize(value) { return String(value).replace(/\\/g, '/').replace(/^\.\//, ''); }
function extractDependencies(source) {
  const results = [];
  // Intentionally conservative: static ESM imports/exports and literal CommonJS require only.
  const patterns = [
    { kind: 'import', re: /\bimport\s+(?:[\s\S]*?\s+from\s*)?['"]([^'"\r\n]+)['"]/g },
    { kind: 'export', re: /\bexport\s+(?:\*|\{[^}]*\})\s+from\s*['"]([^'"\r\n]+)['"]/g },
    { kind: 'require', re: /\brequire\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g },
    { kind: 'dynamic-import', re: /\bimport\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g }
  ];
  for (const { kind, re } of patterns) {
    let match;
    while ((match = re.exec(source))) {
      results.push({ specifier: match[1], kind, line: source.slice(0, match.index).split('\n').length });
    }
  }
  return results.sort((a, b) => a.line - b.line || a.specifier.localeCompare(b.specifier));
}
function discover(files, options = {}) {
  const maxEdges = options.maxEdges || 4000;
  const names = new Set(Object.keys(files).filter(x => SOURCE.test(x)).map(normalize));
  const nodes = [...names].sort().map(id => ({ id, type: 'source' }));
  const edges = [];
  const unresolved = [];
  let truncated = false;
  for (const from of names) {
    const imports = extractDependencies(String(files[from] || ''));
    for (const dep of imports) {
      if (edges.length + unresolved.length >= maxEdges) { truncated = true; break; }
      const specifier = dep.specifier;
      if (!specifier.startsWith('.')) continue; // External packages are not local source edges.
      const base = path.normalize(path.join(path.dirname(from), specifier));
      if (base === '..' || base.startsWith('../') || path.isAbsolute(base)) {
        unresolved.push({ from, specifier, line: dep.line, reason: 'outside-workspace' });
        continue;
      }
      const target = RESOLUTIONS.map(ext => base + ext).find(candidate => names.has(candidate));
      if (target) edges.push({ from, to: target, kind: dep.kind, evidence: { file: from, line: dep.line, specifier }, confidence: 'static-reference' });
      else unresolved.push({ from, specifier, line: dep.line, reason: 'unresolved-local-import' });
    }
    if (truncated) break;
  }
  return { nodes, edges, unresolved, truncated, limitations: [
    'Text-based discovery may include imports inside comments or strings.',
    'Path aliases, package exports, generated sources, and runtime dependency injection are not resolved.',
    'Static references do not prove runtime execution or architectural compliance.'
  ] };
}
module.exports = { discover, extractDependencies, normalize };
