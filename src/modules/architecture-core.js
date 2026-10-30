'use strict';
const path = require('node:path').posix;
const { analyzeFile, analyzerFor } = require('./architecture-analyzers');
const RESOLUTIONS = ['', '.ts','.tsx','.js','.jsx','.mts','.cts','.mjs','.cjs',
  '/index.ts','/index.tsx','/index.js','/index.jsx','.py','/__init__.py','.go','.rs','.h','.hpp'];
function normalize(value) { return String(value).replace(/\\/g, '/').replace(/^\.\//, ''); }
function extractDependencies(source) { return analyzeFile('source.ts', source).references; }

function tsconfigFor(from, contents) {
  const dirs = path.dirname(from).split('/');
  for (let i = dirs.length; i >= 0; i--) {
    const name = [...dirs.slice(0, i), 'tsconfig.json'].join('/');
    if (!contents.has(name)) continue;
    try {
      const config = JSON.parse(contents.get(name).replace(/\/\*[\s\S]*?\*\/|(^|\s)\/\/.*$/gm, '$1'));
      const opts = config.compilerOptions || {};
      const configDir = path.dirname(name) === '.' ? '' : path.dirname(name);
      return { base: path.normalize(path.join(configDir, opts.baseUrl || '.')), paths: opts.paths || {} };
    } catch { return null; }
  }
  return null;
}
function resolveAlias(from, specifier, contents, names) {
  const config = tsconfigFor(from, contents);
  if (!config) return null;
  for (const [pattern, targets] of Object.entries(config.paths)) {
    const star = pattern.indexOf('*');
    const matches = star < 0 ? specifier === pattern :
      specifier.startsWith(pattern.slice(0, star)) && specifier.endsWith(pattern.slice(star + 1));
    if (!matches || !Array.isArray(targets)) continue;
    const middle = star < 0 ? '' : specifier.slice(star, specifier.length - (pattern.length - star - 1));
    for (const target of targets) {
      if (typeof target !== 'string') continue;
      const base = path.normalize(path.join(config.base, target.replace('*', middle)));
      if (base === '..' || base.startsWith('../') || path.isAbsolute(base)) continue;
      const found = RESOLUTIONS.map(ext => base + ext).find(candidate => names.has(candidate));
      if (found) return found;
    }
  }
  if (config.base && config.base !== '.') {
    const base = path.normalize(path.join(config.base, specifier));
    if (base !== '..' && !base.startsWith('../') && !path.isAbsolute(base))
      return RESOLUTIONS.map(ext => base + ext).find(candidate => names.has(candidate)) || null;
  }
  return null;
}

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
        const aliasTarget = analyzed.analyzer === 'javascript' ? resolveAlias(from, specifier, contents, names) : null;
        if (aliasTarget) {
          edges.push({ from, to: aliasTarget, kind: dep.kind,
            evidence: { file: from, line: dep.line, specifier, analyzer: analyzed.analyzer },
            confidence: 'static-reference' });
          continue;
        }
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
