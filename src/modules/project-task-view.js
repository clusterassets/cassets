'use strict';
// Pure, bounded view model: never expose VS Code TaskExecution objects to the webview.
function taskView(records, folderName, limit = 20) {
  const matching = (records || []).filter(x => x.folder === folderName);
  const counts = { scheduled: 0, running: 0, completed: 0, failed: 0, unknown: 0 };
  for (const task of matching) if (Object.hasOwn(counts, task.status)) counts[task.status]++;
  return {
    counts,
    tasks: matching.slice(0, Math.max(0, Math.min(limit, 100))).map(x => ({
      id: x.id, name: String(x.name || ''), status: Object.hasOwn(counts, x.status) ? x.status : 'unknown',
      startedAt: Number.isFinite(x.startedAt) ? x.startedAt : null,
      endedAt: Number.isFinite(x.endedAt) ? x.endedAt : null,
      exitCode: Number.isInteger(x.exitCode) ? x.exitCode : null
    }))
  };
}
module.exports = { taskView };
