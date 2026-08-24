# CAssets DevReady

> **Clone. Open. Code.**

**CAssets DevReady** is a native-first developer readiness engine for Visual Studio Code.

It prepares a fresh VS Code installation and an unfamiliar repository for productive development while deliberately avoiding unnecessary extensions, personal Settings Sync, destructive automation, and hidden repository changes.

**Created and architected by [Vivek Rao Bhosale](https://www.linkedin.com/in/kp-vivek-rao-bhosale/) under [ClusterAssets](https://clusterassets.com).**

---

## Product identity

```text
Product          CAssets DevReady
Tagline          Clone. Open. Code.
Publisher        ClusterAssets
Creator          Vivek Rao Bhosale
Package          cassets
Extension ID     clusterassets.cassets
Repository       github.com/clusterassets/cassets
Website          clusterassets.com
```

**ClusterAssets** remains the publisher and product brand so the ecosystem can scale across multiple products, contributors, and future commercial offerings.

**Vivek Rao Bhosale** is the creator and principal architect behind the product vision, technical concepts, architecture, and innovation direction of ClusterAssets products and open-source initiatives.

---

# Why CAssets DevReady?

Developers regularly receive a new office laptop, join a new project, clone an unfamiliar repository, or work in an environment where personal VS Code Settings Sync is inappropriate or unavailable.

A typical setup experience looks like this:

```text
Receive laptop
   ↓
Install VS Code
   ↓
Reconfigure editor settings
   ↓
Install familiar extensions
   ↓
Clone repository
   ↓
Discover runtime/version
   ↓
Discover package manager
   ↓
Understand project structure
   ↓
Find build/test/dev commands
   ↓
Configure tasks/debugging
   ↓
Configure environment templates
   ↓
Start coding
```

DevReady aims to reduce that to:

```text
Install VS Code
   ↓
Install CAssets DevReady
   ↓
Initialize Developer Workstation
   ↓
Clone / Open repository
   ↓
DevReady understands the project
   ↓
Review only the missing capability gaps
   ↓
Build / Test / Code
```

### North-star metric

> **Clone-to-first-successful-build time**

The product is successful when a developer reaches a verified working repository faster, with less configuration and less editor overhead.

---

# Native-first philosophy

DevReady does **not** begin by asking:

> Which extensions should we install?

It begins with:

> Can Visual Studio Code already provide this capability?

The decision order is:

```text
1. VS Code built-in capability
2. Existing developer/user configuration
3. Existing repository configuration
4. Official language/tool integration when genuinely required
5. DevReady-generated missing baseline
6. Third-party extension only for a meaningful capability gap
```

This keeps VS Code lighter and avoids turning every workstation into the same large extension pack.

DevReady is not an extension bundle.

It is a **capability resolver and developer-readiness engine**.

---

# Fresh office laptop without personal Settings Sync

A key use case is a developer receiving a clean corporate machine.

Personal Settings Sync may be unavailable, undesirable, or inappropriate on that device.

DevReady provides a professional workstation baseline without copying the developer's personal environment.

```text
Fresh office laptop
       ↓
Install VS Code
       ↓
Install CAssets DevReady
       ↓
CAssets: Initialize Developer Workstation
       ↓
Native professional VS Code baseline
       ↓
Open repository
       ↓
Stack-aware optimization
       ↓
Capability gap analysis
       ↓
Recommend only what VS Code cannot provide
```

DevReady intentionally avoids configuring personal choices such as:

```text
Theme
Fonts
Icon theme
Keybindings
Personal accounts
Git identity
AI providers
MCP providers
Personal Settings Sync
Extension-specific preferences
```

The goal is a **professional development baseline**, not a personal workstation clone.

---

# Workstation Engine

Starting with v0.7.0, DevReady includes a native-first Workstation Engine.

For each supported setting:

```text
Does VS Code already provide the desired behavior by default?
   ↓ yes
Write nothing

Has the developer explicitly configured the setting?
   ↓ yes
Preserve it

Otherwise
   ↓
Apply the professional DevReady baseline
```

This is important because a clean `settings.json` is often better than a large copied configuration.

DevReady should configure only what is necessary.

### Workstation capabilities

The Workstation Engine focuses on VS Code-native areas such as:

- editor navigation
- definitions, references, and peek workflows
- suggestions and language-service ergonomics
- bracket guides
- sticky scroll
- diff and merge behavior
- search behavior
- file handling
- terminal ergonomics
- debugging behavior
- large-file handling
- Workspace Trust
- watcher optimization
- repository-aware search exclusions

See [Workstation Engine](docs/WORKSTATION-ENGINE.md).

---

# Native capability audit

DevReady recognizes capabilities already available in VS Code and avoids recommending replacement extensions when native functionality is sufficient.

Examples include:

```text
Git / Source Control
Diff editor
Merge editor
Timeline
Workspace search
Quick Open
Integrated terminal
Tasks
Debugger UI
Testing surface
JavaScript / TypeScript language service
JSON tooling
Markdown tooling
Emmet
Snippets
Workspace Trust
Profiles
Bracket guides
Sticky Scroll
Large-file optimization
```

A repository-specific audit can conceptually produce:

```text
Native capability coverage        92%

Provided by VS Code               24
Provided by repository tooling     3
External capability gaps           2

Recommended because required:
  ESLint
  Prettier
```

DevReady does **not** silently install those extensions.

---

# Stack-aware performance optimization

Large repositories can make VS Code unnecessarily expensive when generated folders, dependency trees, caches, or build outputs are watched and searched.

DevReady can recognize common repository artifacts such as:

### Node.js / JavaScript

```text
node_modules
.next
.nuxt
.turbo
dist
coverage
```

### Python

```text
.venv
venv
__pycache__
.pytest_cache
.mypy_cache
.ruff_cache
```

### .NET

```text
bin
obj
```

### Rust

```text
target
```

### Go

```text
vendor
```

### Java / JVM

```text
target
.gradle
build
```

### Terraform

```text
.terraform
```

When appropriate, DevReady can use those signals to improve:

```json
"files.watcherExclude"
"search.exclude"
```

Existing workspace configuration always wins.

---

# Repository intelligence

DevReady recognizes signals for:

- JavaScript
- TypeScript
- Node.js
- React
- Vite
- Next.js
- Python
- FastAPI
- .NET / C#
- Rust
- Go
- Java
- PowerShell
- shell scripts
- npm
- pnpm
- yarn
- Bun
- npm/pnpm workspaces
- Turbo
- Nx
- Lerna
- Vitest
- Jest
- Playwright
- ESLint
- Prettier
- Biome
- Ruff
- Docker / Compose
- Terraform
- Ansible
- Helm
- Kubernetes

### Runtime and tooling intelligence

DevReady can infer repository signals such as:

- runtime versions
- package manager
- package-manager version
- test framework
- formatter ownership
- linter ownership
- build tools
- monorepo structure
- workspace package relationships
- environment-variable **names**
- relevant VS Code capability gaps

Repository contents remain local.

Environment-variable values are not collected.

---

# Workspace preparation

When relevant and missing, DevReady can initialize safe project/workspace baselines such as:

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

These are not blindly overwritten.

---

# Developer ownership model

DevReady follows a strict ownership rule:

```text
Existing file
→ developer-owned
→ preserve it

DevReady-created baseline
→ initialized once
→ developer-owned afterward

Developer modifies generated file
→ preserve modification

Developer deletes generated file
→ treat deletion as intentional
→ do not silently recreate

Developer explicitly requests restore
→ restore missing generated baseline
```

Use:

```text
CAssets: Restore Missing Generated Templates
```

when restoration is intentional.

This keeps DevReady from fighting the developer or repository.

---

# Contributor onboarding

DevReady can help answer one of the first questions in an unfamiliar repository:

> **How do I run this repo?**

It can:

- identify local prerequisites
- check whether required tools are available
- explain missing prerequisites
- inspect supported workspace relationships
- infer safe commands from repository metadata
- recommend a useful dev/test/build command
- run a recommended command only after explicit developer approval

The command runs in a visible terminal.

---

# Project readiness

DevReady distinguishes between understanding a repository and proving that it works.

The long-term readiness model is:

```text
UNKNOWN
   ↓
DETECTED
   ↓
READY
   ↓
VERIFYING
   ↓
VERIFIED
```

A failed verification should identify what failed rather than simply reporting that the repository is unhealthy.

Example:

```text
@company/core        ✓
@company/database    ✓
@company/api         ✗ build failed
@company/web         BLOCKED by @company/api
```

This verification model is an active direction for the v0.7+ development line.

---

# Commands

Open the Command Palette using:

```text
Ctrl+Shift+P
```

or on macOS:

```text
Cmd+Shift+P
```

| Command | Purpose |
|---|---|
| `CAssets: Initialize Developer Workstation` | Apply the native-first professional VS Code baseline while preserving explicit choices |
| `CAssets: Workstation Health` | Inspect workstation baseline alignment |
| `CAssets: Native Capability Audit` | Show native VS Code capability coverage and repository-specific gaps |
| `CAssets: Optimize Workspace Performance` | Add safe stack-aware watcher/search exclusions when appropriate |
| `CAssets: Apply Professional User Settings` | Compatibility alias for workstation initialization |
| `CAssets: Apply Recommended Workspace Setup` | Create safe missing project/workspace baselines |
| `CAssets: Project Health` | Inspect development-readiness status |
| `CAssets: Show Project Intelligence` | View detected runtime/tool/project intelligence |
| `CAssets: Check Developer Prerequisites` | Check local runtime/tool availability |
| `CAssets: How Do I Run This Repo?` | Recommend the first useful run command |
| `CAssets: Show Contributor Onboarding` | Show prerequisites and run guidance |
| `CAssets: Show Workspace Package Graph` | Inspect supported workspace relationships |
| `CAssets: Run Recommended Task` | Run an inferred command after explicit approval |
| `CAssets: Extension Audit` | Show capability-driven extension recommendations |
| `CAssets: Show Detected Environment Variables` | Show detected environment-variable names |
| `CAssets: Refresh .env.example Suggestions` | Append missing names after approval |
| `CAssets: Restore Missing Generated Templates` | Explicitly restore missing initialized templates |
| `CAssets: Re-scan Workspace` | Re-run repository detection |
| `CAssets: Open .cassets.json` | Open project-level DevReady policy |

See [Command Reference](docs/COMMANDS.md).

---

# Operating modes

Default public mode:

```json
{
  "cassets.mode": "review"
}
```

| Mode | Behavior |
|---|---|
| `review` | Detect automatically; developer explicitly applies setup |
| `auto` | After opt-in, create safe missing baselines |
| `observe` | Analyze only; do not create project baselines automatically |

Public installations default to **review**.

---

# Security and trust

DevReady treats repository contents as data, not instructions.

During detection it may:

```text
✓ read bounded repository metadata/configuration
✓ inspect supported source patterns
✓ inspect repository structure
✓ check local tool versions such as node --version
```

It does not automatically:

```text
✗ npm install
✗ pnpm install
✗ pip install
✗ cargo install
✗ docker compose up
✗ terraform apply
✗ database migrations
✗ execute README instructions
✗ execute arbitrary repository scripts
✗ upload repository contents
✗ collect environment-variable values
✗ silently install extensions
✗ silently uninstall extensions
```

### Workspace Trust

Restricted Mode is treated as a safety boundary.

When the workspace is not trusted, DevReady should limit itself to safe detection and avoid project writes or repository command execution.

### Command execution

Repository command execution requires an explicit developer action and occurs in a visible terminal.

See [Security and Trust](docs/SECURITY-AND-TRUST.md).

---

# Project policy

DevReady can create `.cassets.json` to make repository-level policy explicit and reproducible.

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

# CI, security, and Marketplace publishing

The public repository uses protected-main development and automated validation.

Current automation includes:

- Conventional PR-title validation
- Marketplace manifest validation
- unit tests
- VS Code integration tests on Linux and Windows
- Linux headless integration through Xvfb
- runtime dependency audit
- VSIX packaging
- Dependency Review
- CodeQL
- Dependabot
- tag/version verification
- Visual Studio Marketplace publishing
- GitHub pre-release creation

The release path is deliberately simple:

```text
Feature / Fix branch
       ↓
Pull Request
       ↓
CI + Security checks
       ↓
Review
       ↓
Protected main
       ↓
Version bump through release PR
       ↓
Merge
       ↓
Push vX.Y.Z tag
       ↓
publish.yml
       ↓
Validate + Test + Audit
       ↓
Package VSIX
       ├──────────────┐
       ↓              ↓
Marketplace      GitHub Pre-release
```

The pushed tag must exactly match `package.json.version`.

See [Release and Publishing](docs/RELEASE-AND-PUBLISHING.md).

---

# Documentation

Start with [docs/README.md](docs/README.md).

- [Product Overview](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [How It Works](docs/HOW-IT-WORKS.md)
- [Workstation Engine](docs/WORKSTATION-ENGINE.md)
- [Commands](docs/COMMANDS.md)
- [Configuration](docs/CONFIGURATION.md)
- [Security and Trust](docs/SECURITY-AND-TRUST.md)
- [Developer Intelligence](docs/DEVELOPER-INTELLIGENCE.md)
- [Contributor Orchestrator](docs/CONTRIBUTOR-ORCHESTRATOR.md)
- [Developer Experience](docs/DEVELOPER-EXPERIENCE.md)
- [Release and Publishing](docs/RELEASE-AND-PUBLISHING.md)
- [Repository Setup](docs/REPOSITORY-SETUP.md)
- [Roadmap](docs/ROADMAP.md)
- [v0.7 Test Plan](docs/V0.7-TEST-PLAN.md)

---

# About ClusterAssets

**ClusterAssets** is a developer-focused technology brand building tools, frameworks, infrastructure, and AI-assisted engineering products intended to simplify software development and improve developer productivity.

Its focus is not limited to a single extension or framework. ClusterAssets explores reusable developer infrastructure, data-first development, AI engineering, repository intelligence, workflow optimization, and other product ideas that reduce unnecessary engineering friction.

### Product vision and technical direction

The product ideas, technical concepts, architecture, and innovation direction behind **ClusterAssets** are conceived and led by **Vivek Rao Bhosale**.

Vivek is the **Creator and Principal Architect** behind the ClusterAssets product ecosystem and its open-source initiatives.

His focus includes:

- developer infrastructure
- developer productivity
- full-stack application architecture
- distributed systems
- AI engineering
- repository and execution intelligence
- data-first development
- practical automation that preserves developer control

CAssets DevReady is one part of that broader product vision.

---

# Creator & Principal Architect

## Vivek Rao Bhosale

**Creator and Principal Architect — ClusterAssets**

CAssets DevReady originated from a practical developer-experience problem: developers repeatedly spend valuable time rebuilding editor configuration, rediscovering repository requirements, installing overlapping extensions, and preparing new machines before productive development can begin.

The goal behind DevReady is to turn that repeated setup knowledge into a safe, reusable, native-first developer experience while keeping developers in control of their environment and repository.

### Connect with Vivek

- **LinkedIn:** [Vivek Rao Bhosale](https://www.linkedin.com/in/kp-vivek-rao-bhosale/)
- **Personal GitHub:** [github.com/diskhacker](https://github.com/diskhacker)

### ClusterAssets

- **Website:** [clusterassets.com](https://clusterassets.com)
- **GitHub:** [github.com/clusterassets](https://github.com/clusterassets)
- **LinkedIn:** [linkedin.com/company/clusterassets](https://www.linkedin.com/company/clusterassets)
- **Email:** [info@clusterassets.com](mailto:info@clusterassets.com)

If you are interested in developer tooling, repository intelligence, native-first VS Code productivity, AI engineering, or contributing to ClusterAssets open-source products, discussions and contributions are welcome.

---

# Contributing

Contributions, technical discussions, issue reports, and architecture feedback are welcome.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

---

# Security

Please report security issues according to [SECURITY.md](SECURITY.md).

Do not disclose sensitive vulnerabilities through public issues.

---

# License

CAssets DevReady is released under the **MIT License**.

See [LICENSE](LICENSE).

---

## CAssets DevReady

> **Clone. Open. Code.**

Built under **ClusterAssets**.  
Created and architected by **Vivek Rao Bhosale**.
