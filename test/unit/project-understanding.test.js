'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../src/modules/project-understanding.js'), 'utf8');
const moduleShim = { exports: {} };
vm.runInNewContext(source, {
  module: moduleShim,
  require: name => {
    if (name === 'vscode') return { workspace: {}, window: {} };
    if (name === './workspace-doctor') return { diagnose() {} };
    if (name === 'crypto') return require('node:crypto');
    throw new Error('Unexpected dependency: ' + name);
  }
}, { filename: 'project-understanding.js' });
const { viewModel, render, escapeHtml } = moduleShim.exports;

test('escapes untrusted repository text in webview', () => {
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
  const model = viewModel({ name: '<img src=x onerror=alert(1)>' }, {
    node: true, scripts: { test: '<script>alert(1)</script>' }
  }, { runtime: {}, summary: {} });
  const html = render(model, 'testnonce');
  assert.ok(!html.includes('<img src=x onerror'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('script-src \'nonce-testnonce\''));
  assert.ok(html.includes('data-action="doctor"'));
  assert.ok(html.includes('data-action="setup"'));
});

test('handles missing optional metadata and bounds scripts', () => {
  const scripts = Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['s' + i, 'echo ok']));
  const model = viewModel({ name: 'repo' }, { python: true, scripts }, { summary: {} });
  assert.equal(model.scripts.length, 24);
  assert.equal(model.languages[0], 'python');
  assert.equal(model.formatter, 'Not detected');
});
