'use strict';
const path = require('node:path').posix;
const { analyzeFile, analyzerFor } = require('./architecture-analyzers');
const RESOLUTIONS = ['', '.ts','.tsx','.js','.jsx','.mts','.cts','.mjs','.cjs',
  '/index.ts','/index.tsx','/index.js','/index.jsx','.py','/__init__.py','.go','.rs','.h','.hpp'];
function normalize(value) { return String(value).replace(/\\/g, '/').replace(/^\.\//, ''); }
function extractDependencies(source) { return analyzeFile('source.ts', source).references; }
function discover(files, options = {}) {
  const maxEdges = options.maxEdges || 4000;
  const contents = new Map(Object.entries(files).map(([name, content]) => [normalize(name), String(content)]));
  const names = new Set(contents.keys());
  const nodes = [...names].sort().map(id => {
    const analyzed = analyzeFile(id, contents.get(id));
    return { id, type: analyzed.type, analyzer: analyzed.analyzer };
  });
  const edges = [], unresolved = [], external = [], coverage = {};
  let truncated = false;
  for (const from of names) {
    const analyzed = analyzeFile(from, contents.get(from));
    coverage[analyzed.type] = (coverage[analyzed.type] || 0) + 1;
    for (const dep of analyzed.references) {
      if (edges.length + unresolved.length + external.length >= maxEdges) { truncated = true; break; }
      const specifier = dep.specifier;
      const isLocal = specifier.startsWith('.') || dep.kind === 'include' ||
        (analyzed.analyzer === 'rust' && (specifier.startsWith('crate::') || specifier.startsWith('self::')));
      if (!isLocal) {
        external.push({ from, specifier, kind: dep.kind, line: dep.line, analyzer: analyzed.analyzer });
        continue;
      }
      let base;
      if (analyzed.analyzer === 'rust') {
        const moduleName = specifier.replace(/^(crate|self)::/, '').replace(/::/g, '/');
        base = path.normalize(path.join(specifier.startsWith('crate::') ? '' : path.dirname(from), moduleName));
      } else if (analyzed.analyzer === 'python' && dep.kind === 'from-import') {
        const dots = (specifier.match(/^\.+/) || [''])[0].length;
        const rest = specifier.slice(dots).replace(/\./g, '/');
        const parent = path.dirname(from).split('/');
        base = path.normalize(path.join(...parent.slice(0, Math.max(0, parent.length - (dots - 1))), rest));
      } else base = path.normalize(path.join(path.dirname(from), specifier));
      if (base === '..' || base.startsWith('../') || path.isAbsolute(base)) {
        unresolved.push({ from, specifier, line: dep.line, reason: 'outside-workspace' });
        continue;
      }
      const target = RESOLUTIONS.map(ext => base + ext).find(candidate => names.has(candidate));
      if (target) edges.push({ from, to: target, kind: dep.kind,
        evidence: { file: from, line: dep.line, specifier, analyzer: analyzed.analyzer },
        confidence: 'static-reference' });
      else unresolved.push({ from, specifier, line: dep.line, reason: 'unresolved-local-reference', analyzer: analyzed.analyzer });
    }
    if (truncated) break;
  }
  return { nodes, edges, unresolved, external, coverage, truncated, limitations: [
    'Language analyzers are preliminary text-based extractors; comments and strings can cause false positives.',
    'Unresolved references, framework injection, build-time configuration and dynamic runtime edges require deeper analyzers.',
    'Static references do not prove execution, cross-service communication or architecture compliance.'
  ] };
}
module.exports = { discover, extractDependencies, normalize };
