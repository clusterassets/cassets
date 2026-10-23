'use strict';
// Analyzers are pure, opt-in and independently extensible. Text-based evidence is provisional.
const definitions = [
  { id: 'javascript', extensions: ['js','jsx','ts','tsx','mjs','cjs','mts','cts'], extract: text => {
    const patterns = [
      ['import', /\bimport\s+(?:[\s\S]*?\s+from\s*)?['"]([^'"\r\n]+)['"]/g],
      ['export', /\bexport\s+(?:\*|\{[^}]*\})\s+from\s*['"]([^'"\r\n]+)['"]/g],
      ['require', /\brequire\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g],
      ['dynamic-import', /\bimport\s*\(\s*['"]([^'"\r\n]+)['"]\s*\)/g]
    ];
    return extractPatterns(text, patterns);
  }},
  { id: 'python', extensions: ['py'], extract: text => extractPatterns(text, [
    ['import', /^\s*import\s+([a-zA-Z_][\w.]*)/gm],
    ['from-import', /^\s*from\s+(\.*[a-zA-Z_][\w.]*|\.+)\s+import\s+/gm]
  ]) },
  { id: 'go', extensions: ['go'], extract: text => extractPatterns(text, [
    ['import', /^\s*import\s+"([^"]+)"/gm],
    ['import', /^\s*(?:[\w.]+\s+)?"([^"]+)"\s*$/gm]
  ]) },
  { id: 'rust', extensions: ['rs'], extract: text => extractPatterns(text, [
    ['use', /^\s*(?:pub\s+)?use\s+([\w:]+)/gm],
    ['mod', /^\s*(?:pub\s+)?mod\s+(\w+)\s*;/gm]
  ]) },
  { id: 'java', extensions: ['java','kt','kts'], extract: text => extractPatterns(text, [
    ['import', /^\s*import\s+(?:static\s+)?([\w.*]+)/gm]
  ]) },
  { id: 'dotnet', extensions: ['cs','fs'], extract: text => extractPatterns(text, [
    ['using', /^\s*(?:global\s+)?using\s+(?:static\s+)?([\w.]+)\s*;/gm],
    ['open', /^\s*open\s+([\w.]+)/gm]
  ]) },
  { id: 'cpp', extensions: ['c','h','cc','cpp','cxx','hpp'], extract: text => extractPatterns(text, [
    ['include', /^\s*#\s*include\s*"([^"]+)"/gm],
    ['system-include', /^\s*#\s*include\s*<([^>]+)>/gm]
  ]) },
  { id: 'sql', extensions: ['sql'], extract: text => extractPatterns(text, [
    ['foreign-key', /\bREFERENCES\s+(?:["\w]+\.)?(["\w]+)/gi]
  ]) },
  { id: 'infrastructure', extensions: ['tf','hcl'], extract: text => extractPatterns(text, [
    ['terraform-dependency', /\bdepends_on\s*=\s*\[([^\]]+)\]/g]
  ]) }
];
const manifests = [
  'Dockerfile','docker-compose.yml','docker-compose.yaml','compose.yml','compose.yaml',
  'package.json','go.mod','Cargo.toml','pyproject.toml','requirements.txt',
  'pom.xml','build.gradle','build.gradle.kts','settings.gradle',
  'pnpm-workspace.yaml','Makefile','Chart.yaml','kustomization.yaml'
];
function extractPatterns(text, patterns) {
  const found = [];
  for (const [kind, re] of patterns) {
    let m;
    while ((m = re.exec(text))) found.push({
      specifier: m[1], kind, line: text.slice(0, m.index).split('\n').length
    });
  }
  return found.sort((a,b) => a.line-b.line || a.specifier.localeCompare(b.specifier));
}
function analyzerFor(file) {
  const extension = String(file).split('.').pop().toLowerCase();
  return definitions.find(x => x.extensions.includes(extension));
}
function classify(file) {
  if (manifests.some(name => file === name || file.endsWith('/'+name))) return 'manifest';
  if (/\.ya?ml$/i.test(file)) return 'configuration';
  return analyzerFor(file)?.id || 'unsupported';
}
function analyzeFile(file, content) {
  const analyzer = analyzerFor(file);
  return { analyzer: analyzer?.id || null, type: classify(file),
    references: analyzer ? analyzer.extract(String(content)) : [] };
}
module.exports = { definitions, manifests, analyzerFor, classify, analyzeFile, extractPatterns };
