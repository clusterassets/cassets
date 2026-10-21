'use strict';

function parseVersion(value) {
  const match = String(value || '').match(/(?:^|\D)v?(\d+)\.(\d+)(?:\.(\d+))?/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : null;
}
function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
// Intentionally conservative: unknown expressions are not evaluated as passing.
function satisfies(actual, expression) {
  const version = parseVersion(actual);
  if (!version || !expression || typeof expression !== 'string') return null;
  const clauses = expression.trim().split(/\s*\|\|\s*/);
  let unsupported = false;
  for (const clause of clauses) {
    const tokens = clause.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    let valid = true;
    for (const token of tokens) {
      const match = /^(>=|<=|>|<|=|\^|~)?v?(\d+(?:\.\d+){0,2})$/.exec(token);
      if (!match) { unsupported = true; valid = false; break; }
      const op = match[1] || '=';
      const target = parseVersion(match[2]);
      const c = compare(version, target);
      let ok = false;
      if (op === '>=') ok = c >= 0;
      else if (op === '<=') ok = c <= 0;
      else if (op === '>') ok = c > 0;
      else if (op === '<') ok = c < 0;
      else if (op === '=') ok = c === 0;
      else if (op === '^') {
        const upper = target[0] > 0 ? [target[0] + 1, 0, 0] :
          target[1] > 0 ? [0, target[1] + 1, 0] : [0, 0, target[2] + 1];
        ok = c >= 0 && compare(version, upper) < 0;
      } else if (op === '~') {
        const parts = match[2].split('.');
        const upper = parts.length === 1 ? [target[0] + 1, 0, 0] : [target[0], target[1] + 1, 0];
        ok = c >= 0 && compare(version, upper) < 0;
      }
      if (!ok) valid = false;
    }
    if (valid) return true;
  }
  return unsupported ? null : false;
}
function diagnostic(id, severity, title, detail, evidence, remediation) {
  return { id, severity, title, detail, evidence, remediation };
}
function diagnose(stack, intelligence, prerequisites, graph) {
  const results = [];
  for (const check of prerequisites?.checks || []) {
    if (!check.available) results.push(diagnostic(
      'tool.' + check.id, check.required ? 'error' : 'warning',
      check.label + ' unavailable', check.timeout ? 'Version check timed out.' : 'Required tool was not detected.',
      check.reason + ' Command: ' + check.command,
      'Install or activate the expected tool, then run Workspace Doctor again.'
    ));
  }
  if (stack.node) {
    const expected = stack.package?.engines?.node || intelligence.runtime?.node;
    const detected = prerequisites?.checks?.find(x => x.id === 'node');
    if (expected && detected?.available) {
      const match = satisfies(detected.version, expected);
      if (match === false) results.push(diagnostic(
        'runtime.node.mismatch', 'error', 'Node.js version mismatch',
        'Detected ' + detected.version + '; project declares ' + expected + '.',
        'package.json engines.node / .nvmrc / .node-version',
        'Use a compatible Node.js version through your preferred version manager.'
      ));
      else if (match === null) results.push(diagnostic(
        'runtime.node.unverified', 'info', 'Node.js constraint needs verification',
        'Unable to evaluate the version constraint: ' + expected,
        'package.json engines.node / .nvmrc / .node-version',
        'Review the declared constraint manually.'
      ));
    }
  }
  if (graph?.topo?.cyclic) results.push(diagnostic(
    'workspace.cycle', 'warning', 'Workspace dependency cycle detected',
    'The workspace package graph contains a cycle.',
    'Workspace package manifests', 'Inspect package references in Workspace Graph.'
  ));
  if (graph?.truncated) results.push(diagnostic(
    'workspace.truncated', 'info', 'Workspace graph is incomplete',
    'Package analysis reached its configured limit.',
    'cassets.workspaceGraph.maxPackages', 'Review or increase the bounded package limit.'
  ));
  return {
    diagnostics: results,
    counts: {
      error: results.filter(x => x.severity === 'error').length,
      warning: results.filter(x => x.severity === 'warning').length,
      info: results.filter(x => x.severity === 'info').length
    },
    checked: prerequisites?.checks?.length || 0
  };
}
module.exports = { diagnose, satisfies, parseVersion };
