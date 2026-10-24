'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/modules/project-understanding.js'), 'utf8');
const shim = { exports: {} };
vm.runInNewContext(source, {
  module: shim,
  require: name => {
    if (name === 'vscode') return { workspace: {}, window: {} };
    if (name === './project-task-view') return require('../../src/modules/project-task-view');
    if (name === './service-readiness') return { declaredServices: () => [], dependencies: () => ({ missing: [], cyclic: false }), checkServices: async () => [] };
    if (name === './native-debugging') return { createDebugTracker() {}, getActiveDebugTracker() {}, startNativeDebugging() {}, availableConfigurations: () => [], debugView: () => ({ active: 0, sessions: [] }) };
    if (name === './task-lifecycle') return { getActiveTaskLifecycle: () => null };
    if (name === './command-inventory') return { inventory: () => [] };
    if (name === './doctor-verification') return { scopeFor: () => null };
    if (name === './prerequisites') return { checkCommand() {} };
    if (name === './workspace-doctor') return { diagnose() {} };
    if (name === 'crypto') return require('node:crypto');
    throw Error('Unexpected dependency ' + name);
  }
});
const { sourceFor, doctorSection, render, viewModel } = shim.exports;
test('source mapping is an allowlist, not an arbitrary repository path', () => {
  assert.equal(sourceFor('runtime.node.mismatch'), 'package.json');
  assert.equal(sourceFor('../../secret'), null);
  assert.equal(sourceFor('toString'), null);
});
test('doctor shows lifecycle and navigable findings with escaped content', () => {
  const report = { counts: { error: 1, warning: 0, info: 0 }, checked: 1, resolved: 2,
    diagnostics: [{ id: 'runtime.node.mismatch', severity: 'error', title: '<bad>',
      detail: 'Node mismatch', evidence: 'package.json', remediation: 'Use compatible Node',
      lifecycle: 'Persistent' }] };
  const html = doctorSection(report);
  assert.ok(html.includes('data-source="runtime.node.mismatch"'));
  assert.ok(html.includes('Persistent'));
  assert.ok(html.includes('2 resolved'));
  assert.ok(html.includes('&lt;bad&gt;'));
});
test('multi-root selector escapes names and preserves project overview', () => {
  const model = viewModel({ name: 'safe' }, { scripts: {} }, { summary: {} });
  const html = render(model, 'nonce', null, [{ name: 'safe' }, { name: '<unsafe>' }]);
  assert.ok(html.includes('id="folder-select"'));
  assert.ok(html.includes('&lt;unsafe&gt;'));
  assert.ok(!html.includes('<unsafe>'));
});
