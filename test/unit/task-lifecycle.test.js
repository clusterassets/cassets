'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../src/modules/task-lifecycle.js'), 'utf8');

function harness() {
  const handlers = {};
  class EventEmitter {
    constructor() { this.event = () => {}; }
    fire() {}
  }
  const vscode = { EventEmitter, tasks: {
    onDidStartTask: fn => { handlers.start = fn; return { dispose() {} }; },
    onDidEndTask: fn => { handlers.end = fn; return { dispose() {} }; },
    onDidEndTaskProcess: fn => { handlers.process = fn; return { dispose() {} }; }
  }};
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require: id => {
    if (id === 'vscode') return vscode;
    throw new Error('unexpected require: ' + id);
  }, Date, Map, WeakMap, Number });
  const context = { subscriptions: [] };
  const lifecycle = module.exports.createTaskLifecycle(context);
  return { lifecycle, handlers, context };
}
function execution(name, source = 'CAssets') {
  return { task: { name, source, definition: { type: 'cassets-script' }, scope: { name: 'VAMSHA' } } };
}
test('scheduled, started and completed states retain process exit code', () => {
  const { lifecycle, handlers } = harness();
  const task = execution('CAssets: Web dev');
  lifecycle.track(task);
  assert.equal(lifecycle.snapshot()[0].status, 'scheduled');
  handlers.start({ execution: task });
  assert.equal(lifecycle.snapshot()[0].status, 'running');
  handlers.process({ execution: task, exitCode: 0 });
  handlers.end({ execution: task });
  const record = lifecycle.snapshot()[0];
  assert.equal(record.status, 'completed');
  assert.equal(record.exitCode, 0);
});
test('nonzero exit is failure, missing process exit is unknown, unrelated tasks ignored', () => {
  const { lifecycle, handlers } = harness();
  const a = execution('CAssets: failing test');
  lifecycle.track(a);
  handlers.start({ execution: a });
  handlers.process({ execution: a, exitCode: 2 });
  assert.equal(lifecycle.snapshot()[0].status, 'failed');
  assert.equal(lifecycle.snapshot()[0].exitCode, 2);
  const b = execution('CAssets: interrupted dev');
  lifecycle.track(b);
  handlers.end({ execution: b });
  assert.equal(lifecycle.snapshot()[0].status, 'unknown');
  const other = execution('External task', 'External');
  handlers.start({ execution: other });
  assert.equal(lifecycle.snapshot().length, 2);
});
test('concurrent tasks remain distinct and history is bounded', () => {
  const { lifecycle, handlers } = harness();
  const a = execution('API');
  const b = execution('Web');
  lifecycle.track(a);
  lifecycle.track(b);
  handlers.start({ execution: a });
  handlers.start({ execution: b });
  handlers.process({ execution: b, exitCode: 0 });
  assert.equal(lifecycle.snapshot().find(x => x.name === 'API').status, 'running');
  assert.equal(lifecycle.snapshot().find(x => x.name === 'Web').status, 'completed');
});
