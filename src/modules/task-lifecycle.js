'use strict';
const vscode = require('vscode');

let activeLifecycle = null;
function getActiveTaskLifecycle() { return activeLifecycle; }
function createTaskLifecycle(context, options = {}) {
  const records = new Map();
  const executionIds = new WeakMap();
  let nextId = 0;
  const maxHistory = options.maxHistory || 100;
  const changed = new vscode.EventEmitter();
  context.subscriptions.push(changed, vscode.tasks.onDidStartTask(event => {
    const execution = event.execution;
    if (execution.task?.source !== 'CAssets' || execution.task?.definition?.type !== 'cassets-script') return;
    let id = executionIds.get(execution);
    if (!id) { id = ++nextId; executionIds.set(execution, id); }
    const previous = records.get(id);
    records.set(id, {
      id, name: execution.task.name, folder: execution.task.scope?.name || '',
      status: 'running', startedAt: previous?.startedAt || Date.now(),
      endedAt: null, exitCode: null, execution
    });
    changed.fire();
  }), vscode.tasks.onDidEndTaskProcess(event => {
    const id = executionIds.get(event.execution);
    const record = records.get(id);
    if (!record) return;
    record.exitCode = Number.isInteger(event.exitCode) ? event.exitCode : null;
    record.status = record.exitCode === 0 ? 'completed' : record.exitCode === null ? 'unknown' : 'failed';
    record.endedAt = Date.now();
    changed.fire();
  }), vscode.tasks.onDidEndTask(event => {
    const id = executionIds.get(event.execution);
    const record = records.get(id);
    if (!record || record.endedAt !== null) return;
    record.status = 'unknown';
    record.endedAt = Date.now();
    changed.fire();
  }));
  function snapshot() {
    return [...records.values()].sort((a, b) => b.id - a.id).map(({ execution, ...record }) => ({ ...record }));
  }
  function track(execution) {
    if (!execution || execution.task?.source !== 'CAssets') return;
    if (executionIds.has(execution)) return;
    const id = ++nextId;
    executionIds.set(execution, id);
    records.set(id, {
      id, name: execution.task.name, folder: execution.task.scope?.name || '',
      status: 'scheduled', startedAt: Date.now(), endedAt: null, exitCode: null, execution
    });
    while (records.size > maxHistory) {
      const oldest = [...records].find(([, value]) => value.endedAt !== null);
      if (!oldest) break;
      records.delete(oldest[0]);
    }
    changed.fire();
  }
  activeLifecycle = { track, snapshot, onDidChange: changed.event };
  context.subscriptions.push({ dispose() { if (activeLifecycle?.snapshot === snapshot) activeLifecycle = null; } });
  return activeLifecycle;
}
module.exports = { createTaskLifecycle, getActiveTaskLifecycle };
