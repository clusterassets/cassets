# Developer Intelligence Engine

CAssets v0.5 treats repository configuration as signals, not instructions.

## Pipeline

```text
Workspace
  ↓
Bounded signal collection
  ↓
Stack detection
  ↓
Runtime detection
  ↓
Monorepo detection
  ↓
Tool ownership
  ↓
Environment-variable name discovery
  ↓
Capability graph
  ↓
Tasks / debug / extension recommendations / health
```

## Trust model

Repository text is data. CAssets does not execute repository commands merely to detect the stack.

Detection reads bounded configuration/source files through VS Code workspace APIs. Environment-variable
discovery extracts names such as `DATABASE_URL`; it does not query process/environment values.

## Runtime signals

Node.js:
- `.nvmrc`
- `.node-version`
- `package.json#engines.node`
- `package.json#packageManager`

Python:
- `.python-version`
- `pyproject.toml`

.NET:
- `global.json`

Rust:
- `rust-toolchain.toml`
- `rust-toolchain`

Go:
- `go.mod`

## Monorepo signals

- `package.json#workspaces`
- `pnpm-workspace.yaml`
- `turbo.json`
- `nx.json`
- `lerna.json`

## Capability ownership

CAssets aims to select one primary owner per capability where the repository makes that clear.

Examples:

```text
ESLint    -> lint
Prettier  -> format
Biome     -> lint + format
Ruff      -> Python lint + format
rustfmt   -> Rust format
Clippy    -> Rust lint
gofmt     -> Go format
```

CAssets does not silently uninstall competing tools. The Extension Audit is advisory.

## Environment discovery

The scanner is:
- bounded by `cassets.intelligence.maxEnvironmentFiles`
- limited to common source/config extensions
- name-only
- local
- non-executing

Use `CAssets: Refresh .env.example Suggestions` to append newly detected names after confirmation.
