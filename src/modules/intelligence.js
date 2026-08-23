const vscode = require('vscode');
const { exists, readText, readJson, find, unique } = require('./utils');
const {
  normalizeVersion,
  parseGoVersion,
  parsePythonRequires,
  packageManagerFromField,
  classifyNodeTools,
  inferMonorepo,
  extractEnvNames
} = require('./intelligence-core');

async function readIfExists(uri) {
  if (!(await exists(uri))) return '';
  try { return await readText(uri); } catch { return ''; }
}

async function detectRuntime(folder, stack) {
  const root = folder.uri;
  const runtime = {};

  if (stack.node) {
    const nvm = normalizeVersion(await readIfExists(vscode.Uri.joinPath(root, '.nvmrc')));
    const nodeVersion = normalizeVersion(await readIfExists(vscode.Uri.joinPath(root, '.node-version')));
    runtime.node = nvm || nodeVersion || stack.package?.engines?.node || null;

    const pmField = packageManagerFromField(stack.package?.packageManager);
    runtime.packageManager = {
      name: pmField?.name || stack.packageManager,
      version: pmField?.version || null
    };
  }

  if (stack.python) {
    const pyVersion = normalizeVersion(await readIfExists(vscode.Uri.joinPath(root, '.python-version')));
    const pyproject = await readIfExists(vscode.Uri.joinPath(root, 'pyproject.toml'));
    runtime.python = pyVersion || parsePythonRequires(pyproject) || null;
  }

  if (stack.dotnet) {
    const globalJson = await readJson(vscode.Uri.joinPath(root, 'global.json'));
    runtime.dotnet = globalJson?.sdk?.version || null;
  }

  if (stack.rust) {
    const rustToolchain = await readIfExists(vscode.Uri.joinPath(root, 'rust-toolchain.toml')) ||
      await readIfExists(vscode.Uri.joinPath(root, 'rust-toolchain'));
    const channel = /channel\s*=\s*["']([^"']+)["']/.exec(rustToolchain);
    runtime.rust = channel?.[1] || normalizeVersion(rustToolchain) || null;
  }

  if (stack.go) {
    runtime.go = parseGoVersion(await readIfExists(vscode.Uri.joinPath(root, 'go.mod')));
  }

  if (stack.java) {
    runtime.java = stack.package?.engines?.java || null;
  }

  return runtime;
}

async function detectRepoTools(folder, stack) {
  const root = folder.uri;
  const [pnpmWorkspace, turboJson, nxJson, lernaJson, pom, gradle, gradlew] = await Promise.all([
    exists(vscode.Uri.joinPath(root, 'pnpm-workspace.yaml')),
    exists(vscode.Uri.joinPath(root, 'turbo.json')),
    exists(vscode.Uri.joinPath(root, 'nx.json')),
    exists(vscode.Uri.joinPath(root, 'lerna.json')),
    exists(vscode.Uri.joinPath(root, 'pom.xml')),
    exists(vscode.Uri.joinPath(root, 'build.gradle')) || exists(vscode.Uri.joinPath(root, 'build.gradle.kts')),
    exists(vscode.Uri.joinPath(root, 'gradlew')) || exists(vscode.Uri.joinPath(root, 'gradlew.bat'))
  ]);

  return {
    node: classifyNodeTools(stack.package || {}),
    java: { maven: pom, gradle: gradle || gradlew },
    monorepo: inferMonorepo(stack.package || {}, {
      pnpmWorkspace,
      turbo: turboJson || !!stack.package?.devDependencies?.turbo,
      nx: nxJson || !!stack.package?.devDependencies?.nx,
      lerna: lernaJson || !!stack.package?.devDependencies?.lerna
    })
  };
}

async function discoverEnv(folder, limit = 120) {
  const files = await find(
    folder,
    '**/*.{js,jsx,ts,tsx,mjs,cjs,py,cs,rs,go,java,json,jsonc,yml,yaml,toml}',
    limit
  );
  const names = new Set();
  for (const uri of files) {
    try {
      const text = await readText(uri);
      for (const name of extractEnvNames(text)) names.add(name);
    } catch {}
  }
  return [...names].sort();
}

async function analyze(folder, stack, options = {}) {
  const [runtime, tools] = await Promise.all([
    detectRuntime(folder, stack),
    detectRepoTools(folder, stack)
  ]);

  const environmentVariables = options.scanEnvironmentVariables === false
    ? []
    : await discoverEnv(folder, options.maxEnvironmentFiles || 120);

  const ownership = {
    formatter:
      tools.node.format.includes('biome') ? 'biome' :
      tools.node.format.includes('prettier') ? 'prettier' :
      stack.python && stack.framework?.ruff ? 'ruff' :
      stack.dotnet ? 'dotnet-format/built-in' :
      stack.rust ? 'rustfmt' :
      stack.go ? 'gofmt' : null,
    linter:
      tools.node.lint.includes('biome') ? 'biome' :
      tools.node.lint.includes('eslint') ? 'eslint' :
      stack.python && stack.framework?.ruff ? 'ruff' :
      stack.rust ? 'clippy' :
      stack.go ? 'go-vet/staticcheck' : null,
    test: unique([
      ...tools.node.test,
      ...(stack.framework?.pytest ? ['pytest'] : []),
      ...(stack.dotnet ? ['dotnet-test'] : []),
      ...(stack.rust ? ['cargo-test'] : []),
      ...(stack.go ? ['go-test'] : [])
    ])
  };

  return {
    runtime,
    tools,
    ownership,
    environmentVariables,
    summary: {
      monorepo: tools.monorepo.detected,
      monorepoTools: tools.monorepo.tools,
      testFrameworks: ownership.test,
      formatter: ownership.formatter,
      linter: ownership.linter
    }
  };
}

module.exports = {
  analyze,
  normalizeVersion,
  parseGoVersion,
  parsePythonRequires,
  packageManagerFromField,
  classifyNodeTools,
  inferMonorepo,
  extractEnvNames
};
