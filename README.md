# CAssets DevReady

> **Clone. Open. Code.**

**CAssets DevReady** turns VS Code and an unfamiliar repository into a professionally prepared development workspace.

It is designed for individual developers, open-source contributors, freelancers, and teams that want to spend less time configuring editors, extensions, tasks, debugging, CI basics, environment templates, and local prerequisites—and more time building software.

## Identity

```text
Product name:   CAssets DevReady
Tagline:        Clone. Open. Code.
Publisher:      ClusterAssets
Package name:   cassets
Extension ID:   clusterassets.cassets
Marketplace:    CAssets DevReady — Clone. Open. Code.
Repository:     clusterassets/cassets
```

The package name remains `cassets`, so the Marketplace identity stays short and stable while the product has a clearer public name.

---

## Why DevReady?

A new or unfamiliar repository often begins with configuration work:

```text
Clone
  ↓
Find runtime and version
  ↓
Find package manager
  ↓
Install editor extensions
  ↓
Configure formatting/linting
  ↓
Find build/test/dev commands
  ↓
Configure tasks/debugging
  ↓
Prepare environment templates
  ↓
Understand monorepo structure
  ↓
Start coding
```

DevReady aims for:

```text
git clone ...
code .
  ↓
DevReady understands the repository
  ↓
Developer reviews/accepts recommendations
  ↓
Ready to work
```

### North-star metric

> **Clone-to-first-successful-build time**

---

## Design philosophy

DevReady follows this priority:

```text
1. VS Code built-in capability
2. Existing repository configuration
3. Official language/tool extension
4. DevReady-generated missing baseline
5. Third-party extension only when it adds meaningful capability
```

DevReady does not replace engineering judgment. It automates repeatable expert setup.

---

## Current capabilities

### Repository and stack intelligence

DevReady currently recognizes signals for:

- JavaScript / TypeScript / Node.js
- Python
- .NET / C#
- Rust
- Go
- Java
- PowerShell and shell
- React
- Vite
- Next.js
- FastAPI
- npm / pnpm / yarn / Bun
- npm/pnpm workspaces
- Turbo / Nx / Lerna
- Vitest / Jest / Playwright
- ESLint / Prettier / Biome / Ruff
- Docker / Compose
- Terraform
- Ansible
- Helm / Kubernetes

### Runtime and tooling intelligence

DevReady can infer:

- runtime versions
- package manager and package-manager version
- test framework
- formatter owner
- linter owner
- build tools
- supported monorepo structure
- environment-variable **names**
- relevant VS Code extension capabilities

Repository contents stay local.

Environment-variable values are not collected.

### Workspace preparation

When relevant and missing, DevReady can initialize:

```text
.cassets.json
.gitignore
.editorconfig
.gitattributes
.env.example
.npmignore
AGENTS.md
CONTRIBUTING.md
.github/workflows/ci.yml
.vscode/settings.json
.vscode/tasks.json
.vscode/launch.json
.vscode/extensions.json
```

Existing developer-owned files are preserved.

### Contributor onboarding

DevReady can answer:

> **How do I run this repository?**

It can:

- check local prerequisite availability
- explain missing tools
- analyze supported workspace package relationships
- infer safe commands from project metadata
- recommend a first-successful dev/test/build command
- execute that command only after explicit confirmation

---

## Important commands

Open the Command Palette with `Ctrl+Shift+P` or `Cmd+Shift+P`.

| Command | Purpose |
|---|---|
| `CAssets: Apply Professional User Settings` | Apply conservative professional VS Code user defaults |
| `CAssets: Apply Recommended Workspace Setup` | Create safe missing project/workspace baselines |
| `CAssets: Project Health` | Inspect development-readiness score |
| `CAssets: Show Project Intelligence` | View runtime/tool/project intelligence |
| `CAssets: Check Developer Prerequisites` | Check local runtime/tool availability |
| `CAssets: How Do I Run This Repo?` | Recommend the first useful run command |
| `CAssets: Show Contributor Onboarding` | Show prerequisite and run guidance |
| `CAssets: Show Workspace Package Graph` | Inspect supported monorepo relationships |
| `CAssets: Run Recommended Task` | Run an inferred command after approval |
| `CAssets: Extension Audit` | Show capability-driven extension recommendations |
| `CAssets: Show Detected Environment Variables` | Show detected environment-variable names |
| `CAssets: Refresh .env.example Suggestions` | Append missing names after approval |
| `CAssets: Restore Missing Generated Templates` | Explicitly restore initialized templates |
| `CAssets: Re-scan Workspace` | Re-run detection |
| `CAssets: Open .cassets.json` | Open project DevReady policy |

See [Command Reference](docs/COMMANDS.md).

---

## Public-safe operating modes

```json
{
  "cassets.mode": "review"
}
```

| Mode | Behavior |
|---|---|
| `review` | Detect automatically; setup is explicitly applied |
| `auto` | After opt-in, create safe missing baselines |
| `observe` | Analyze only; do not create project baselines automatically |

Public installations default to **review**.

---

## File ownership

```text
Existing file
→ developer-owned
→ never replaced by baseline generation

DevReady-created baseline
→ initialized once
→ developer-owned afterward

Developer deletes generated baseline
→ deletion is intentional
→ do not silently recreate it
```

Use `CAssets: Restore Missing Generated Templates` to restore explicitly.

---

## Safety boundary

During detection DevReady may:

```text
✓ read bounded repository metadata/configuration
✓ inspect supported source patterns
✓ check tool versions such as node --version
```

It does not automatically:

```text
✗ npm install
✗ pnpm install
✗ pip install
✗ docker compose up
✗ terraform apply
✗ database migrations
✗ README commands
✗ arbitrary repository scripts
✗ silent extension installation/uninstallation
```

Project-command execution requires explicit developer action and happens in a visible terminal.

See [Security and Trust](docs/SECURITY-AND-TRUST.md).

---

## Fresh VS Code

After installing DevReady on a fresh VS Code installation, run:

```text
CAssets: Apply Professional User Settings
```

This applies conservative professional defaults while preserving explicit developer choices where possible.

Repository-specific configuration remains a separate layer.

```text
CAssets DevReady
      │
      ├── Workstation/User layer
      │     └── professional VS Code defaults
      │
      └── Repository layer
            ├── stack intelligence
            ├── tasks/debugging
            ├── extension capabilities
            ├── project baselines
            └── contributor onboarding
```

---

## Repository policy

DevReady can create `.cassets.json` for reproducible project-level policy.

Example:

```json
{
  "version": 1,
  "profile": "professional",
  "templates": {
    "gitignore": true,
    "editorconfig": true,
    "gitattributes": true,
    "envExample": "auto",
    "npmignore": "auto",
    "githubCi": "auto",
    "contributing": false,
    "agents": "auto"
  },
  "dismissed": []
}
```

See [Configuration](docs/CONFIGURATION.md).

---

## Automated quality and Marketplace publishing

The repository includes workflows for:

- PR-title validation
- manifest validation
- unit tests
- VS Code integration tests
- Linux / Windows / macOS
- VSIX packaging
- Dependency Review
- CodeQL
- Dependabot
- semantic version resolution
- Git tags
- GitHub Releases
- Visual Studio Marketplace publishing

```text
Pull Request
   ↓
CI + Security
   ↓
Merge to main
   ↓
Resolve version bump
   ↓
Re-test trusted main
   ↓
Package VSIX
   ↓
Git tag/version
   ├───────────────┐
   ↓               ↓
Marketplace    GitHub Release
```

See [Release and Publishing](docs/RELEASE-AND-PUBLISHING.md).

---

## Documentation

Start with [docs/README.md](docs/README.md).

- [Product Overview](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [How It Works](docs/HOW-IT-WORKS.md)
- [Commands](docs/COMMANDS.md)
- [Configuration](docs/CONFIGURATION.md)
- [Security and Trust](docs/SECURITY-AND-TRUST.md)
- [Developer Intelligence](docs/DEVELOPER-INTELLIGENCE.md)
- [Contributor Orchestrator](docs/CONTRIBUTOR-ORCHESTRATOR.md)
- [Developer Experience](docs/DEVELOPER-EXPERIENCE.md)
- [Release and Publishing](docs/RELEASE-AND-PUBLISHING.md)
- [Repository Setup](docs/REPOSITORY-SETUP.md)
- [Roadmap](docs/ROADMAP.md)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

MIT

---

**CAssets DevReady — Clone. Open. Code.**
