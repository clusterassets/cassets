function unique(values) { return [...new Set(values)]; }

function normalizeVersion(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().replace(/^v/, '') || null;
}

function parseGoVersion(text) {
  const match = /^\s*go\s+([0-9.]+)/m.exec(text || '');
  return match ? match[1] : null;
}

function parsePythonRequires(text) {
  const patterns = [
    /requires-python\s*=\s*["']([^"']+)["']/i,
    /python\s*=\s*["']([^"']+)["']/i
  ];
  for (const p of patterns) {
    const m = p.exec(text || '');
    if (m) return m[1].trim();
  }
  return null;
}

function packageManagerFromField(field) {
  if (!field || typeof field !== 'string') return null;
  const match = /^([^@]+)@(.+)$/.exec(field.trim());
  return match ? { name: match[1], version: match[2] } : { name: field.trim(), version: null };
}

function classifyNodeTools(pkg = {}) {
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const scripts = pkg.scripts || {};
  const has = name => Object.prototype.hasOwnProperty.call(deps, name);
  const scriptHas = (name, needle) => typeof scripts[name] === 'string' && scripts[name].includes(needle);

  const test = [];
  if (has('vitest') || scriptHas('test', 'vitest')) test.push('vitest');
  if (has('jest') || scriptHas('test', 'jest')) test.push('jest');
  if (has('@playwright/test') || has('playwright') || scriptHas('test', 'playwright')) test.push('playwright');
  if (has('mocha') || scriptHas('test', 'mocha')) test.push('mocha');

  const lint = [];
  if (has('eslint') || scriptHas('lint', 'eslint')) lint.push('eslint');
  if (has('biome') || has('@biomejs/biome') || scriptHas('lint', 'biome')) lint.push('biome');

  const format = [];
  if (has('prettier') || scriptHas('format', 'prettier')) format.push('prettier');
  if (has('biome') || has('@biomejs/biome') || scriptHas('format', 'biome')) format.push('biome');

  const build = [];
  for (const tool of ['vite', 'next', 'webpack', 'rollup', 'tsup', 'esbuild']) {
    if (has(tool) || scriptHas('build', tool)) build.push(tool);
  }

  return {
    test: unique(test),
    lint: unique(lint),
    format: unique(format),
    build: unique(build)
  };
}

function inferMonorepo(pkg, signals) {
  const workspaces = Array.isArray(pkg?.workspaces)
    ? pkg.workspaces
    : Array.isArray(pkg?.workspaces?.packages)
      ? pkg.workspaces.packages
      : [];

  const tools = [];
  if (signals.pnpmWorkspace) tools.push('pnpm-workspace');
  if (signals.turbo) tools.push('turbo');
  if (signals.nx) tools.push('nx');
  if (signals.lerna) tools.push('lerna');

  return {
    detected: workspaces.length > 0 || tools.length > 0,
    workspaces,
    tools
  };
}

function extractEnvNames(text) {
  const names = new Set();
  const patterns = [
    /\bprocess\.env\.([A-Z][A-Z0-9_]*)\b/g,
    /\bprocess\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
    /\bimport\.meta\.env\.([A-Z][A-Z0-9_]*)\b/g,
    /\bos\.getenv\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g,
    /\bos\.environ(?:\.get)?\(\s*['"]([A-Z][A-Z0-9_]*)['"]/g,
    /\bEnvironment\.GetEnvironmentVariable\(\s*"([A-Z][A-Z0-9_]*)"/g,
    /\bstd::env::var\(\s*"([A-Z][A-Z0-9_]*)"/g,
    /\bos\.Getenv\(\s*"([A-Z][A-Z0-9_]*)"/g,
    /\bSystem\.getenv\(\s*"([A-Z][A-Z0-9_]*)"/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text || '')) !== null) names.add(match[1]);
  }
  return [...names].sort();
}

module.exports = {
  normalizeVersion,
  parseGoVersion,
  parsePythonRequires,
  packageManagerFromField,
  classifyNodeTools,
  inferMonorepo,
  extractEnvNames
};
