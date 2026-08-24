const vscode = require('vscode');
const { extensionPlan } = require('./capabilities');
const {
  GLOBAL_BASELINE,
  NATIVE_CAPABILITIES,
  stackPerformanceExcludes,
  evaluateBaseline,
  capabilityCoverage
} = require('./workstation-core');

function inspectGlobalSetting(key) {
  const config = vscode.workspace.getConfiguration();
  const inspected = config.inspect(key) || {};
  return {
    globalValue: inspected.globalValue,
    effectiveValue: config.get(key)
  };
}

async function setMissingGlobal(key, value) {
  const config = vscode.workspace.getConfiguration();
  const inspected = config.inspect(key);
  if (inspected?.globalValue !== undefined) return { changed: false, preserved: true, nativeDefault: false };
  if (JSON.stringify(config.get(key)) === JSON.stringify(value)) {
    return { changed: false, preserved: false, nativeDefault: true };
  }
  try {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    return { changed: true, preserved: false, nativeDefault: false };
  } catch (error) {
    console.warn(`[CAssets] skipped unsupported user setting ${key}`, error);
    return { changed: false, preserved: false, unsupported: true };
  }
}

async function initializeProfessionalBaseline() {
  let changed = 0;
  let preserved = 0;
  let nativeDefault = 0;
  let unsupported = 0;
  for (const item of GLOBAL_BASELINE) {
    const result = await setMissingGlobal(item.key, item.value);
    if (result.changed) changed++;
    if (result.preserved) preserved++;
    if (result.nativeDefault) nativeDefault++;
    if (result.unsupported) unsupported++;
  }
  return { changed, preserved, nativeDefault, unsupported, total: GLOBAL_BASELINE.length };
}

async function workstationHealth() {
  return evaluateBaseline(inspectGlobalSetting);
}

async function setMissingFolderSetting(folder, key, value) {
  try {
    const scoped = vscode.workspace.getConfiguration(undefined, folder.uri);
    const inspected = scoped.inspect(key);
    if (inspected?.workspaceFolderValue !== undefined || inspected?.workspaceValue !== undefined) {
      return { changed: false, preserved: true };
    }
    const effective = scoped.get(key);
    const merged = effective && typeof effective === 'object' && !Array.isArray(effective)
      ? { ...effective, ...value }
      : value;
    await scoped.update(key, merged, vscode.ConfigurationTarget.WorkspaceFolder);
    return { changed: true, preserved: false };
  } catch (error) {
    console.warn(`[CAssets] skipped workspace performance setting ${key}`, error);
    return { changed: false, preserved: false, unsupported: true };
  }
}

async function optimizeWorkspace(folder, stack) {
  const excludes = stackPerformanceExcludes(stack);
  if (!Object.keys(excludes).length) return { changed: 0, preserved: 0, patterns: [] };

  let changed = 0;
  let preserved = 0;
  for (const key of ['files.watcherExclude', 'search.exclude']) {
    const result = await setMissingFolderSetting(folder, key, excludes);
    if (result.changed) changed++;
    if (result.preserved) preserved++;
  }

  return { changed, preserved, patterns: Object.keys(excludes) };
}

function coverage(stack, intelligence) {
  return capabilityCoverage(extensionPlan(stack, intelligence));
}

module.exports = {
  initializeProfessionalBaseline,
  workstationHealth,
  optimizeWorkspace,
  coverage,
  NATIVE_CAPABILITIES
};
