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
    if (name === './command-inventory') return { inventory: () => [] };
    if (name === './doctor-verification') return { scopeFor: () => null };
    if (name === './prerequisites') return { checkCommand() {} };
    if (name === './workspace-doctor') return { diagnose() {} };
    if (name === 'crypto') return require('node:crypto');
    throw Error('Unexpected module ' + name);
  }
});
const { doctorSection, render, viewModel } = shim.exports;
test('doctor view escapes repository evidence and includes filter and copy controls', () => {
  const report = { counts: { error: 1, warning: 0, info: 0 }, checked: 2,
    diagnostics: [{ id: 'bad', severity: 'error', title: '<img src=x>', detail: 'Mismatch',
      evidence: '<script>alert(1)</script>', remediation: 'Use Node 24' }] };
  const html = doctorSection(report);
  assert.ok(html.includes('data-filter="error"'));
  assert.ok(html.includes('data-copy="bad"'));
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  const model = viewModel({ name: 'repo' }, { scripts: {} }, { summary: {} });
  assert.ok(render(model, 'nonce', report).includes('Workspace Doctor'));
});
test('doctor empty state does not claim build success', () => {
  const html = doctorSection({ counts: { error: 0, warning: 0, info: 0 }, checked: 0, diagnostics: [] });
  assert.ok(html.includes('does not verify a successful build'));
});
