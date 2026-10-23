'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { taskView } = require('../../src/modules/project-task-view');
test('filters workspace records, counts all states and limits displayed history', () => {
  const entries = [
    {id:3, folder:'web', name:'test', status:'failed', exitCode:1, startedAt:3},
    {id:2, folder:'api', name:'secret', status:'running', exitCode:null, startedAt:2},
    {id:1, folder:'web', name:'build', status:'completed', exitCode:0, startedAt:1}
  ];
  const result = taskView(entries, 'web', 1);
  assert.equal(result.counts.failed, 1);
  assert.equal(result.counts.completed, 1);
  assert.equal(result.counts.running, 0);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].name, 'test');
  assert.equal(Object.hasOwn(result.tasks[0], 'execution'), false);
});
