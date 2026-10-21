'use strict';

const CHECKS = Object.freeze({
  node: ['node', ['--version']],
  python: ['python', ['--version']],
  dotnet: ['dotnet', ['--version']],
  cargo: ['cargo', ['--version']],
  go: ['go', ['version']],
  java: ['java', ['-version']],
  maven: ['mvn', ['-version']],
  gradle: ['gradle', ['--version']],
  terraform: ['terraform', ['version']],
  ansible: ['ansible', ['--version']],
  docker: ['docker', ['--version']]
});
const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn']);

function scopeFor(id) {
  if (id === 'runtime.node.mismatch' || id === 'runtime.node.unverified') return 'node';
  if (id === 'workspace.cycle' || id === 'workspace.truncated') return 'graph';
  if (typeof id === 'string' && id.startsWith('tool.')) {
    const tool = id.slice(5);
    if (Object.prototype.hasOwnProperty.call(CHECKS, tool)) return tool;
    if (tool.startsWith('pm:') && PACKAGE_MANAGERS.has(tool.slice(3))) return tool;
  }
  return null;
}
function affects(scope, id) {
  if (scope === 'node') return id === 'tool.node' || id.startsWith('runtime.node.');
  if (scope === 'graph') return id === 'workspace.cycle' || id === 'workspace.truncated';
  return id === 'tool.' + scope;
}
function mergeReport(previous, fresh, scope) {
  const old = previous?.diagnostics || [];
  const now = fresh?.diagnostics || [];
  const unaffected = old.filter(d => !affects(scope, d.id));
  const before = new Set(old.filter(d => affects(scope, d.id)).map(d => d.id));
  const next = now.filter(d => affects(scope, d.id)).map(d => ({
    ...d, lifecycle: before.has(d.id) ? 'Persistent' : 'New'
  }));
  const resolved = [...before].filter(id => !next.some(d => d.id === id)).length;
  const diagnostics = [...unaffected, ...next];
  return {
    diagnostics,
    counts: {
      error: diagnostics.filter(d => d.severity === 'error').length,
      warning: diagnostics.filter(d => d.severity === 'warning').length,
      info: diagnostics.filter(d => d.severity === 'info').length
    },
    checked: previous?.checked || 0,
    resolved: (previous?.resolved || 0) + resolved
  };
}
async function verify(id, folder, inspectFolder, inspectGraph, checkCommand, diagnose) {
  const scope = scopeFor(id);
  if (!scope) throw new Error('Unsupported diagnostic verification');
  if (scope === 'graph') {
    const inspected = await inspectGraph(folder);
    return { scope, report: diagnose(inspected.stack, inspected.intelligence, null, inspected.workspaceGraph) };
  }
  const { stack, intelligence } = await inspectFolder(folder);
  const spec = scope.startsWith('pm:') ? [scope.slice(3), ['--version']] : CHECKS[scope];
  const result = await checkCommand(spec[0], spec[1]);
  const check = {
    id: scope, label: scope === 'node' ? 'Node.js' : spec[0], command: spec[0],
    required: scope !== 'docker', reason: 'Targeted verification', ...result
  };
  return { scope, report: diagnose(stack, intelligence, { checks: [check] }, null) };
}
module.exports = { scopeFor, affects, mergeReport, verify };
