const GLOBAL_BASELINE = [
  // Editor ergonomics — native VS Code only.
  { key: 'editor.smoothScrolling', value: true, area: 'editor', reason: 'Smooth navigation in large files.' },
  { key: 'editor.cursorSmoothCaretAnimation', value: 'on', area: 'editor', reason: 'Keep cursor movement easy to follow.' },
  { key: 'editor.cursorBlinking', value: 'phase', area: 'editor', reason: 'Readable cursor without changing theme.' },
  { key: 'editor.renderControlCharacters', value: true, area: 'editor', reason: 'Expose invisible control characters.' },
  { key: 'editor.bracketPairColorization.enabled', value: true, area: 'editor', reason: 'Use native bracket pair visualization.' },
  { key: 'editor.guides.bracketPairs', value: 'active', area: 'editor', reason: 'Use native active bracket guides.' },
  { key: 'editor.linkedEditing', value: true, area: 'editor', reason: 'Enable native linked editing.' },
  { key: 'editor.autoIndent', value: 'full', area: 'editor', reason: 'Use language-aware indentation.' },
  { key: 'editor.acceptSuggestionOnEnter', value: 'off', area: 'editor', reason: 'Reduce accidental suggestion acceptance.' },
  { key: 'editor.acceptSuggestionOnCommitCharacter', value: false, area: 'editor', reason: 'Reduce accidental completion commits.' },
  { key: 'editor.suggestSelection', value: 'recentlyUsedByPrefix', area: 'editor', reason: 'Prefer relevant recent completions.' },
  { key: 'editor.stickyScroll.enabled', value: true, area: 'navigation', reason: 'Keep scope context visible while scrolling.' },
  { key: 'editor.minimap.enabled', value: false, area: 'performance', reason: 'Reduce editor rendering overhead and visual noise.' },
  { key: 'editor.largeFileOptimizations', value: true, area: 'performance', reason: 'Enable native large-file safeguards.' },
  { key: 'editor.definitionLinkOpensInPeek', value: true, area: 'navigation', reason: 'Prefer in-context native peek navigation.' },
  { key: 'editor.gotoLocation.multipleDefinitions', value: 'peek', area: 'navigation', reason: 'Use native peek for multiple definitions.' },
  { key: 'editor.gotoLocation.multipleImplementations', value: 'peek', area: 'navigation', reason: 'Use native peek for multiple implementations.' },
  { key: 'editor.gotoLocation.multipleReferences', value: 'peek', area: 'navigation', reason: 'Use native peek for references.' },
  { key: 'editor.tabCompletion', value: 'on', area: 'editor', reason: 'Use built-in tab completion.' },
  { key: 'editor.suggest.preview', value: true, area: 'editor', reason: 'Preview native completion results.' },
  { key: 'editor.inlineSuggest.enabled', value: true, area: 'editor', reason: 'Allow native inline suggestions when a provider exists.' },

  // Workbench / explorer.
  { key: 'workbench.editor.enablePreview', value: false, area: 'workbench', reason: 'Keep opened files stable instead of replacing preview tabs.' },
  { key: 'workbench.editor.enablePreviewFromQuickOpen', value: false, area: 'workbench', reason: 'Keep Quick Open selections stable.' },
  { key: 'window.restoreWindows', value: 'all', area: 'workbench', reason: 'Restore development context after restart.' },
  { key: 'explorer.compactFolders', value: false, area: 'navigation', reason: 'Keep repository folder structure explicit.' },

  // Files / search.
  { key: 'files.autoSave', value: 'onFocusChange', area: 'files', reason: 'Reduce unsaved-buffer interruptions without aggressive after-delay saves.' },
  { key: 'files.trimTrailingWhitespace', value: true, area: 'files', reason: 'Maintain clean text files using VS Code itself.' },
  { key: 'files.insertFinalNewline', value: true, area: 'files', reason: 'Maintain POSIX-friendly text files.' },
  { key: 'search.followSymlinks', value: false, area: 'performance', reason: 'Avoid expensive or duplicate recursive searches through symlinks.' },
  { key: 'search.smartCase', value: true, area: 'search', reason: 'Use native smart-case search.' },

  // Terminal / debugging / diff.
  { key: 'terminal.integrated.shellIntegration.enabled', value: true, area: 'terminal', reason: 'Use VS Code shell integration instead of extra terminal tooling.' },
  { key: 'terminal.integrated.enableMultiLinePasteWarning', value: 'auto', area: 'security', reason: 'Retain native multiline paste protection.' },
  { key: 'terminal.integrated.persistentSessionReviveProcess', value: 'onExit', area: 'terminal', reason: 'Recover terminal context after VS Code restarts.' },
  { key: 'terminal.integrated.scrollback', value: 20000, area: 'terminal', reason: 'Keep sufficient build/debug history in the native terminal.' },
  { key: 'debug.onTaskErrors', value: 'showErrors', area: 'debug', reason: 'Surface task failures before debug startup.' },
  { key: 'diffEditor.renderSideBySide', value: true, area: 'scm', reason: 'Use VS Code native side-by-side diffs.' },
  { key: 'security.workspace.trust.untrustedFiles', value: 'prompt', area: 'security', reason: 'Preserve Workspace Trust boundaries.' }
];

const NATIVE_CAPABILITIES = [
  { id: 'source-control', label: 'Git source control', area: 'scm' },
  { id: 'diff-editor', label: 'Diff editor', area: 'scm' },
  { id: 'merge-editor', label: 'Merge editor', area: 'scm' },
  { id: 'timeline', label: 'File timeline/history surface', area: 'scm' },
  { id: 'search', label: 'Workspace text/file search', area: 'navigation' },
  { id: 'quick-open', label: 'Quick Open and Command Palette', area: 'navigation' },
  { id: 'peek', label: 'Peek definition/references/implementations', area: 'navigation' },
  { id: 'rename-refactor', label: 'Language-service rename/refactor surface', area: 'editor' },
  { id: 'terminal', label: 'Integrated terminal and shell integration', area: 'terminal' },
  { id: 'tasks', label: 'Task runner and problem matchers', area: 'automation' },
  { id: 'debug', label: 'Debugger UI and launch configurations', area: 'debug' },
  { id: 'testing-api', label: 'Native Testing UI/API surface', area: 'quality' },
  { id: 'js-ts', label: 'JavaScript/TypeScript language service', area: 'language' },
  { id: 'json', label: 'JSON/JSONC language support and validation', area: 'language' },
  { id: 'markdown', label: 'Markdown editing and preview', area: 'language' },
  { id: 'emmet', label: 'Emmet', area: 'language' },
  { id: 'snippets', label: 'User/workspace snippets', area: 'editor' },
  { id: 'workspace-trust', label: 'Workspace Trust', area: 'security' },
  { id: 'profiles', label: 'VS Code Profiles', area: 'workbench' },
  { id: 'settings', label: 'User/workspace/language scoped settings', area: 'workbench' },
  { id: 'file-nesting', label: 'Explorer file nesting', area: 'navigation' },
  { id: 'bracket-guides', label: 'Bracket pair colorization and guides', area: 'editor' },
  { id: 'sticky-scroll', label: 'Sticky Scroll', area: 'navigation' },
  { id: 'large-file', label: 'Large file optimization', area: 'performance' }
];

function stackPerformanceExcludes(stack = {}) {
  const out = {};
  const add = pattern => { out[pattern] = true; };

  if (stack.node) {
    ['**/node_modules/**', '**/.next/**', '**/.nuxt/**', '**/.turbo/**', '**/dist/**', '**/coverage/**'].forEach(add);
  }
  if (stack.python) {
    ['**/.venv/**', '**/venv/**', '**/__pycache__/**', '**/.pytest_cache/**', '**/.mypy_cache/**', '**/.ruff_cache/**'].forEach(add);
  }
  if (stack.dotnet) ['**/bin/**', '**/obj/**'].forEach(add);
  if (stack.rust) add('**/target/**');
  if (stack.go) add('**/vendor/**');
  if (stack.java) ['**/target/**', '**/.gradle/**', '**/build/**'].forEach(add);
  if (stack.terraform) add('**/.terraform/**');

  return out;
}

function equality(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function evaluateBaseline(readSetting, baseline = GLOBAL_BASELINE) {
  const results = baseline.map(item => {
    const state = readSetting(item.key) || {};
    const explicit = state.globalValue !== undefined;
    const matches = equality(state.globalValue, item.value);
    const nativeDefault = !explicit && equality(state.effectiveValue, item.value);
    return {
      ...item,
      explicit,
      current: state.globalValue,
      effective: state.effectiveValue,
      matches,
      nativeDefault,
      status: matches ? 'ready' : explicit ? 'preserved' : nativeDefault ? 'native-default' : 'missing'
    };
  });

  const ready = results.filter(x => x.status === 'ready').length;
  const preserved = results.filter(x => x.status === 'preserved').length;
  const nativeDefault = results.filter(x => x.status === 'native-default').length;
  const missing = results.filter(x => x.status === 'missing').length;
  const score = results.length ? Math.round((ready + preserved + nativeDefault) / results.length * 100) : 100;

  return { score, ready, preserved, nativeDefault, missing, total: results.length, results };
}

function capabilityCoverage(extensionPlan = []) {
  const native = NATIVE_CAPABILITIES.length;
  const extensionRequired = extensionPlan.length;
  const total = native + extensionRequired;
  return {
    native,
    extensionRequired,
    total,
    percent: total ? Math.round(native / total * 100) : 100,
    nativeCapabilities: NATIVE_CAPABILITIES,
    extensionCapabilities: extensionPlan
  };
}

module.exports = {
  GLOBAL_BASELINE,
  NATIVE_CAPABILITIES,
  stackPerformanceExcludes,
  evaluateBaseline,
  capabilityCoverage,
  equality
};
