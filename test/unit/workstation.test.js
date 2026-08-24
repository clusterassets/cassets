const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GLOBAL_BASELINE,
  NATIVE_CAPABILITIES,
  stackPerformanceExcludes,
  evaluateBaseline,
  capabilityCoverage
} = require('../../src/modules/workstation-core');

test('professional baseline contains only VS Code settings and no extension/provider settings', () => {
  assert.ok(GLOBAL_BASELINE.length >= 25);
  assert.ok(GLOBAL_BASELINE.every(x => !x.key.startsWith('github.copilot.')));
  assert.ok(GLOBAL_BASELINE.every(x => !x.key.startsWith('chat.')));
  assert.ok(GLOBAL_BASELINE.every(x => !x.key.startsWith('extensions.')));
});

test('stack performance excludes are capability-aware', () => {
  const node = stackPerformanceExcludes({ node: true });
  assert.equal(node['**/node_modules/**'], true);
  assert.equal(node['**/.venv/**'], undefined);

  const mixed = stackPerformanceExcludes({ node: true, python: true, dotnet: true });
  assert.equal(mixed['**/node_modules/**'], true);
  assert.equal(mixed['**/.venv/**'], true);
  assert.equal(mixed['**/obj/**'], true);
});

test('workstation health preserves explicit developer choices instead of marking them missing', () => {
  const baseline = [
    { key: 'a', value: true, area: 'x', reason: 'x' },
    { key: 'b', value: false, area: 'x', reason: 'x' },
    { key: 'c', value: 1, area: 'x', reason: 'x' },
    { key: 'd', value: 'wanted', area: 'x', reason: 'x' }
  ];
  const states = {
    a: { globalValue: true, effectiveValue: true },
    b: { globalValue: true, effectiveValue: true },
    c: { globalValue: undefined, effectiveValue: 1 },
    d: { globalValue: undefined, effectiveValue: 'default' }
  };
  const result = evaluateBaseline(key => states[key], baseline);
  assert.equal(result.ready, 1);
  assert.equal(result.preserved, 1);
  assert.equal(result.nativeDefault, 1);
  assert.equal(result.missing, 1);
  assert.equal(result.score, 75);
});

test('native coverage reports extension gaps without pretending they are native', () => {
  const coverage = capabilityCoverage([
    { id: 'ms-python.python', capability: 'python-runtime', reason: 'Python detected.' },
    { id: 'ms-python.vscode-pylance', capability: 'python-language', reason: 'Python detected.' }
  ]);
  assert.equal(coverage.native, NATIVE_CAPABILITIES.length);
  assert.equal(coverage.extensionRequired, 2);
  assert.equal(coverage.total, NATIVE_CAPABILITIES.length + 2);
  assert.ok(coverage.percent < 100);
});
