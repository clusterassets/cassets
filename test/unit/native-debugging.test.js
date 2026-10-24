'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function setup() {
  const listeners = {};
  const prompts = [];
  const vscode = {
    EventEmitter: class {
      constructor() { this.handlers = []; this.event = handler => { this.handlers.push(handler); return { dispose() {} }; }; }
      fire() { this.handlers.forEach(fn => fn()); }
      dispose() {}
    },
    debug: {
      onDidStartDebugSession: fn => { listeners.start = fn; return { dispose() {} }; },
      onDidTerminateDebugSession: fn => { listeners.end = fn; return { dispose() {} }; },
      startDebugging: async (folder, name) => { prompts.push({ folder, name }); return true; }
    },
    workspace: {
      isTrusted: true,
      getConfiguration: () => ({ get: () => [
        { name: 'Attach', type: 'node', request: 'attach' },
        { name: 'Launch', type: 'node', request: 'launch' },
        { name: 'Invalid', type: 'node' }
      ] })
    },
    window: {
      showQuickPick: async items => items[0],
      showWarningMessage() {}, showInformationMessage() {}
    },
    commands: { executeCommand: async () => {} }
  };
  const moduleShim = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../src/modules/native-debugging.js'), 'utf8'),
    { module: moduleShim, require: name => { if (name === 'vscode') return vscode; throw Error(name); }, Date });
  return { ...moduleShim.exports, vscode, listeners, prompts };
}

test('accepts only existing launch and attach configurations', () => {
  const { availableConfigurations } = setup();
  const result = availableConfigurations([{ name: 'A', type: 'node', request: 'launch' },
    { name: 'B', type: 'python', request: 'attach' }, { name: 'C', type: 'node', request: 'other' }]);
  assert.deepEqual(Array.from(result, x => x.name), ['A', 'B']);
});

test('observes debug session start and end without exposing session objects', () => {
  const { createDebugTracker, debugView, listeners } = setup();
  const context = { subscriptions: [] };
  const tracker = createDebugTracker(context);
  const session = { id: 'abc', name: 'API', type: 'node', workspaceFolder: { name: 'api' } };
  listeners.start(session);
  assert.equal(debugView(tracker.snapshot(), 'api').active, 1);
  assert.equal(debugView(tracker.snapshot(), 'web').active, 0);
  listeners.end(session);
  const view = debugView(tracker.snapshot(), 'api');
  assert.equal(view.active, 0);
  assert.equal(view.sessions[0].status, 'ended');
  assert.equal(Object.hasOwn(view.sessions[0], 'id'), false);
});

test('debug launch requires trust and explicit selection', async () => {
  const { startNativeDebugging, vscode, prompts } = setup();
  const folder = { name: 'api', uri: { path: '/api' } };
  vscode.workspace.isTrusted = false;
  assert.equal(await startNativeDebugging(folder), false);
  assert.equal(prompts.length, 0);
  vscode.workspace.isTrusted = true;
  assert.equal(await startNativeDebugging(folder), true);
  assert.equal(prompts[0].name, 'Attach');
});
