const vscode = require('vscode');
const { exists, readJson, writeJson, unique } = require('./utils');
const { extensionPlan } = require('./capabilities');

async function setFolderSetting(folder, key, value) {
  try {
    const scoped = vscode.workspace.getConfiguration(undefined, folder.uri);
    const inspected = scoped.inspect(key);
    if (!inspected || inspected.workspaceFolderValue === undefined) {
      await scoped.update(key, value, vscode.ConfigurationTarget.WorkspaceFolder);
    }
  } catch (error) {
    console.warn(`[CAssets] skipped folder setting ${key}`, error);
  }
}

async function applyFolderSettings(folder, stack, intelligence) {
  for (const [key, value] of [
    ['editor.minimap.enabled', false],
    ['editor.largeFileOptimizations', true],
    ['files.insertFinalNewline', true],
    ['files.trimTrailingWhitespace', true]
  ]) await setFolderSetting(folder, key, value);

  // Only select a formatter when CAssets can infer ownership.
  if (intelligence?.ownership?.formatter === 'prettier' && stack.node) {
    for (const lang of ['javascript', 'javascriptreact', 'typescript', 'typescriptreact', 'json', 'jsonc']) {
      try {
        const scoped = vscode.workspace.getConfiguration(`[${lang}]`, folder.uri);
        if (scoped.inspect('editor.defaultFormatter')?.workspaceFolderValue === undefined) {
          await scoped.update('editor.defaultFormatter', 'esbenp.prettier-vscode', vscode.ConfigurationTarget.WorkspaceFolder);
        }
      } catch {}
    }
  }
}

function recommendations(stack, intelligence) {
  return extensionPlan(stack, intelligence).map(x => x.id).sort();
}

async function mergeRecommendations(uri, values) {
  let doc = { recommendations: [] };
  if (await exists(uri)) {
    doc = await readJson(uri);
    if (!doc) return false;
  }
  doc.recommendations = unique([...(doc.recommendations || []), ...values]).sort();
  await writeJson(uri, doc);
  return true;
}

function task(label, command, args, extra = {}) {
  return { label, type: 'process', command, args, problemMatcher: [], ...extra };
}

function tasks(stack, intelligence, mode = 'auto') {
  if (mode === 'none') return { version: '2.0.0', tasks: [] };
  const out = [];

  if (stack.node) {
    const pm = intelligence.runtime?.packageManager?.name || stack.packageManager;
    const scripts = stack.scripts || {};
    const runArgs = name => (pm === 'npm' || pm === 'pnpm') ? ['run', name] : [name];

    if (mode !== 'minimal') out.push(task(`${pm}: install`, pm, ['install']));

    for (const name of ['dev', 'start', 'lint', 'format', 'typecheck', 'check', 'test', 'build']) {
      if (!scripts[name]) continue;
      out.push(task(`${pm}: ${name}`, pm, runArgs(name), {
        ...(name === 'dev' || name === 'start' ? { isBackground: true } : {}),
        ...(name === 'test' ? { group: 'test' } : {}),
        ...(name === 'build' ? { group: { kind: 'build', isDefault: true } } : {})
      }));
    }
  }

  if (stack.python) {
    if (intelligence.summary.testFrameworks.includes('pytest')) {
      out.push(task('Python: pytest', 'python', ['-m', 'pytest'], { group: 'test' }));
    }
    if (intelligence.ownership.linter === 'ruff') out.push(task('Python: Ruff Check', 'ruff', ['check', '.']));
    if (intelligence.ownership.formatter === 'ruff') out.push(task('Python: Ruff Format', 'ruff', ['format', '.']));
  }

  if (stack.dotnet) {
    if (mode !== 'minimal') out.push(task('.NET: Restore', 'dotnet', ['restore'], { problemMatcher: '$msCompile' }));
    out.push(task('.NET: Build', 'dotnet', ['build'], { problemMatcher: '$msCompile', group: { kind: 'build', isDefault: !stack.node } }));
    out.push(task('.NET: Test', 'dotnet', ['test'], { problemMatcher: '$msCompile', group: 'test' }));
  }

  if (stack.rust) {
    out.push(task('Rust: Check', 'cargo', ['check'], { problemMatcher: ['$rustc'] }));
    out.push(task('Rust: Test', 'cargo', ['test'], { problemMatcher: ['$rustc'], group: 'test' }));
    if (mode !== 'minimal') out.push(task('Rust: Clippy', 'cargo', ['clippy', '--all-targets', '--all-features']));
  }

  if (stack.go) {
    out.push(task('Go: Test', 'go', ['test', './...'], { group: 'test' }));
    if (mode !== 'minimal') out.push(task('Go: Vet', 'go', ['vet', './...']));
  }

  if (stack.terraform) {
    out.push(task('Terraform: Validate', 'terraform', ['validate']));
    if (mode !== 'minimal') out.push(task('Terraform: Plan', 'terraform', ['plan']));
  }

  return { version: '2.0.0', tasks: out };
}

function launch(stack, intelligence, mode = 'auto') {
  if (mode === 'none') return { version: '0.2.0', configurations: [] };
  const configurations = [];

  if (stack.node) {
    if (stack.scripts?.dev && mode === 'auto') {
      const pm = intelligence.runtime?.packageManager?.name || stack.packageManager;
      const args = (pm === 'npm' || pm === 'pnpm') ? ['run', 'dev'] : ['dev'];
      configurations.push({
        name: 'Node: Dev Script',
        type: 'node-terminal',
        request: 'launch',
        command: [pm, ...args].join(' '),
        cwd: '${workspaceFolder}'
      });
    }
    configurations.push({
      name: 'Node/TS: Current File',
      type: 'node',
      request: 'launch',
      program: '${file}',
      cwd: '${workspaceFolder}',
      console: 'integratedTerminal',
      skipFiles: ['<node_internals>/**'],
      sourceMaps: true
    });
  }

  if (stack.python) {
    configurations.push({
      name: 'Python: Current File',
      type: 'debugpy',
      request: 'launch',
      program: '${file}',
      cwd: '${workspaceFolder}',
      console: 'integratedTerminal'
    });
    if (stack.framework?.fastapi && mode === 'auto') {
      configurations.push({
        name: 'Python: FastAPI',
        type: 'debugpy',
        request: 'launch',
        module: 'uvicorn',
        args: ['main:app', '--reload'],
        cwd: '${workspaceFolder}',
        console: 'integratedTerminal'
      });
    }
  }

  if (stack.powershell) configurations.push({
    name: 'PowerShell: Current File',
    type: 'PowerShell',
    request: 'launch',
    script: '${file}',
    args: []
  });

  if (stack.go) configurations.push({
    name: 'Go: Current Package',
    type: 'go',
    request: 'launch',
    mode: 'auto',
    program: '${fileDirname}'
  });

  return { version: '0.2.0', configurations };
}

module.exports = {
  applyFolderSettings,
  recommendations,
  mergeRecommendations,
  tasks,
  launch
};
