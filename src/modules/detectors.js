const vscode = require('vscode');
const { exists, readJson, readText, find } = require('./utils');

async function detect(folder) {
  const root = folder.uri;
  const packageUri = vscode.Uri.joinPath(root, 'package.json');
  const pyprojectUri = vscode.Uri.joinPath(root, 'pyproject.toml');

  const [
    node, pnpm, yarn, bun, npmLock, pyproject, requirements,
    csproj, sln, cargo, goMod, pom, gradle,
    dockerFiles, composeFiles, terraform, ansibleCfg, ansiblePlaybooks,
    helm, powershell, shell, envFile, envLocal, gitDir,
    viteTs, viteJs, nextJs, nextMjs, nextTs
  ] = await Promise.all([
    exists(packageUri),
    exists(vscode.Uri.joinPath(root, 'pnpm-lock.yaml')),
    exists(vscode.Uri.joinPath(root, 'yarn.lock')),
    exists(vscode.Uri.joinPath(root, 'bun.lockb')),
    exists(vscode.Uri.joinPath(root, 'package-lock.json')),
    exists(pyprojectUri),
    exists(vscode.Uri.joinPath(root, 'requirements.txt')),
    find(folder, '**/*.csproj', 10),
    find(folder, '**/*.sln', 10),
    exists(vscode.Uri.joinPath(root, 'Cargo.toml')),
    exists(vscode.Uri.joinPath(root, 'go.mod')),
    exists(vscode.Uri.joinPath(root, 'pom.xml')),
    find(folder, '**/{build.gradle,build.gradle.kts}', 10),
    find(folder, '**/Dockerfile', 10),
    find(folder, '**/{compose,docker-compose}*.{yml,yaml}', 10),
    find(folder, '**/*.tf', 30),
    exists(vscode.Uri.joinPath(root, 'ansible.cfg')),
    find(folder, '**/playbook*.{yml,yaml}', 20),
    find(folder, '**/Chart.yaml', 10),
    find(folder, '**/*.ps1', 20),
    find(folder, '**/*.sh', 20),
    exists(vscode.Uri.joinPath(root, '.env')),
    exists(vscode.Uri.joinPath(root, '.env.local')),
    exists(vscode.Uri.joinPath(root, '.git')),
    exists(vscode.Uri.joinPath(root, 'vite.config.ts')),
    exists(vscode.Uri.joinPath(root, 'vite.config.js')),
    exists(vscode.Uri.joinPath(root, 'next.config.js')),
    exists(vscode.Uri.joinPath(root, 'next.config.mjs')),
    exists(vscode.Uri.joinPath(root, 'next.config.ts'))
  ]);

  let pkg = null;
  if (node) pkg = await readJson(packageUri);

  let pyText = '';
  if (pyproject) {
    try { pyText = await readText(pyprojectUri); } catch {}
  }

  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const scripts = pkg?.scripts || {};

  let packageManager = 'npm';
  if (pnpm) packageManager = 'pnpm';
  else if (yarn) packageManager = 'yarn';
  else if (bun) packageManager = 'bun';

  const framework = {
    typescript: !!deps.typescript || await exists(vscode.Uri.joinPath(root, 'tsconfig.json')),
    react: !!deps.react,
    vite: viteTs || viteJs || !!deps.vite,
    next: nextJs || nextMjs || nextTs || !!deps.next,
    eslint: !!deps.eslint || /\beslint\b/.test(scripts.lint || ''),
    vitest: !!deps.vitest || /\bvitest\b/.test(scripts.test || ''),
    jest: !!deps.jest || /\bjest\b/.test(scripts.test || ''),
    fastapi: /fastapi/i.test(pyText),
    pytest: /pytest/i.test(pyText) || await exists(vscode.Uri.joinPath(root, 'pytest.ini')),
    ruff: /ruff/i.test(pyText)
  };

  const publishableNpm = !!pkg && pkg.private !== true &&
    typeof pkg.name === 'string' &&
    (Array.isArray(pkg.files) || pkg.name.startsWith('@') || !!pkg.publishConfig);

  return {
    git: gitDir,
    node,
    packageManager,
    package: pkg,
    scripts,
    publishableNpm,
    python: pyproject || requirements,
    dotnet: csproj.length > 0 || sln.length > 0,
    rust: cargo,
    go: goMod,
    java: pom || gradle.length > 0,
    docker: dockerFiles.length > 0 || composeFiles.length > 0,
    terraform: terraform.length > 0,
    ansible: ansibleCfg || ansiblePlaybooks.length > 0,
    kubernetes: helm.length > 0,
    powershell: powershell.length > 0,
    shell: shell.length > 0,
    envDetected: envFile || envLocal,
    framework
  };
}

module.exports = { detect };
