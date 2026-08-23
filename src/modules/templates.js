function gitignore(stack) {
  const out = [
    '# Initialized by CAssets. Edit freely; CAssets will not overwrite this file.',
    '',
    '# OS / editor noise',
    '.DS_Store',
    'Thumbs.db',
    '*.swp',
    '*.swo',
    '',
    '# Environment / secrets',
    '.env',
    '.env.*',
    '!.env.example',
    ''
  ];

  if (stack.node) out.push(
    '# Node.js', 'node_modules/', 'dist/', 'build/', 'coverage/',
    '.next/', '.nuxt/', '.turbo/', '*.tsbuildinfo', ''
  );
  if (stack.python) out.push(
    '# Python', '.venv/', 'venv/', '__pycache__/', '*.py[cod]',
    '.pytest_cache/', '.ruff_cache/', '.mypy_cache/', 'dist/', 'build/', '*.egg-info/', ''
  );
  if (stack.dotnet) out.push('# .NET', 'bin/', 'obj/', '*.user', '*.suo', '.vs/', '');
  if (stack.rust) out.push('# Rust', 'target/', '');
  if (stack.go) out.push('# Go', 'bin/', '*.test', 'coverage.out', '');
  if (stack.java) out.push('# Java', 'target/', '.gradle/', 'build/', '*.class', '');
  if (stack.terraform) out.push(
    '# Terraform', '.terraform/', '*.tfstate', '*.tfstate.*', 'crash.log',
    'override.tf', 'override.tf.json', '*_override.tf', '*_override.tf.json', ''
  );

  return out.join('\n').trimEnd() + '\n';
}

function editorconfig() {
  return `# Initialized by CAssets. Edit freely.
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json,jsonc,yml,yaml,css,scss,html,md}]
indent_style = space
indent_size = 2

[*.{py,cs,ps1,java}]
indent_style = space
indent_size = 4

[Makefile]
indent_style = tab

[*.md]
trim_trailing_whitespace = false
`;
}

function gitattributes() {
  return `# Initialized by CAssets. Edit freely.
* text=auto

*.sh text eol=lf
*.yml text eol=lf
*.yaml text eol=lf
*.json text eol=lf
*.jsonc text eol=lf
*.md text eol=lf

*.png binary
*.jpg binary
*.jpeg binary
*.gif binary
*.webp binary
*.pdf binary
*.zip binary
`;
}

function envExample(names = []) {
  const header = `# Initialized by CAssets.
# Variable names may be detected from source code; values are never collected.
# Copy to .env and replace placeholders locally.
# Never commit credentials or private keys.

`;
  if (!Array.isArray(names) || names.length === 0) {
    return header + 'APP_ENV=development\n';
  }
  return header + names.map(name => `${name}=`).join('\n') + '\n';
}
function npmignore() {
  return `# Initialized by CAssets for a publishable npm package.
.github/
.vscode/
test/
tests/
coverage/
.env*
*.log
`;
}

function agents(stack) {
  const pm = stack.packageManager || 'npm';
  const build = stack.scripts?.build
    ? `${pm} ${pm === 'yarn' || pm === 'bun' ? 'build' : 'run build'}`
    : stack.python ? 'Use the documented Python build command'
    : stack.dotnet ? 'dotnet build'
    : stack.rust ? 'cargo build'
    : stack.go ? 'go build ./...'
    : stack.java ? 'Use the project Maven/Gradle build'
    : 'Use the project build command';

  const test = stack.scripts?.test
    ? `${pm} ${pm === 'yarn' || pm === 'bun' ? 'test' : 'run test'}`
    : stack.python ? 'python -m pytest'
    : stack.dotnet ? 'dotnet test'
    : stack.rust ? 'cargo test'
    : stack.go ? 'go test ./...'
    : stack.java ? 'Use the project Maven/Gradle test command'
    : 'Use the project test command';

  return `# AGENTS.md

This file was initialized by CAssets and is now owned by the repository maintainers.

## Build

\`\`\`bash
${build}
\`\`\`

## Test

\`\`\`bash
${test}
\`\`\`

## Repository rules

- Preserve existing architecture and conventions.
- Prefer focused changes over broad rewrites.
- Do not modify dependency/vendor/generated directories unless the task requires it.
- Never commit credentials, tokens, private keys, or local .env files.
- Run the relevant build, lint, and tests before considering a task complete.
`;
}

function contributing(stack) {
  const pm = stack.packageManager || 'npm';
  const install = stack.node ? `${pm} install`
    : stack.python ? 'python -m pip install -r requirements.txt'
    : stack.dotnet ? 'dotnet restore'
    : stack.rust ? 'cargo fetch'
    : stack.go ? 'go mod download'
    : 'Follow the project README';

  return `# Contributing

Thanks for contributing.

## Setup

\`\`\`bash
${install}
\`\`\`

## Before opening a pull request

- Keep changes focused.
- Add or update tests when behavior changes.
- Run the project's lint, build, and test commands.
- Do not commit credentials, local environment files, generated secrets, or private keys.
- Follow existing repository conventions before introducing new tooling.
`;
}

function ci(stack) {
  if (stack.node) {
    const pm = stack.packageManager;
    const setupPm = pm === 'pnpm'
      ? `      - uses: pnpm/action-setup@v4\n        with:\n          version: latest\n`
      : '';
    const install =
      pm === 'npm' ? 'npm ci' :
      pm === 'pnpm' ? 'pnpm install --frozen-lockfile' :
      pm === 'yarn' ? 'yarn install --immutable' :
      'bun install --frozen-lockfile';

    const setupRuntime = pm === 'bun'
      ? `      - uses: oven-sh/setup-bun@v2\n`
      : `      - uses: actions/setup-node@v4\n        with:\n          node-version: "lts/*"\n          cache: ${pm}\n`;

    const run = script =>
      pm === 'npm' || pm === 'pnpm' ? `${pm} run ${script}` : `${pm} ${script}`;
    const steps = [];
    for (const name of ['lint', 'test', 'build']) if (stack.scripts?.[name]) steps.push(`      - run: ${run(name)}`);

    return `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${setupPm}${setupRuntime}      - run: ${install}
${steps.join('\n')}
`;
  }

  if (stack.python) return `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
      - run: python -m pip install --upgrade pip
      - run: |
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
          if [ -f pyproject.toml ]; then pip install -e . || true; fi
      - run: python -m pytest
`;

  if (stack.dotnet) return `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "8.0.x"
      - run: dotnet restore
      - run: dotnet build --no-restore
      - run: dotnet test --no-build
`;

  if (stack.rust) return `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo check
      - run: cargo test
`;

  if (stack.go) return `name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: "stable"
          cache: true
      - run: go test ./...
`;

  return '';
}

module.exports = { gitignore, editorconfig, gitattributes, envExample, npmignore, agents, contributing, ci };
