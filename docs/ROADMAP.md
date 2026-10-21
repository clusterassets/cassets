# Roadmap

## v0.1 — Workspace Bootstrap
Initial VS Code workspace automation.

## v0.2 — Project Baseline Engine
Professional project baselines and ownership rules.

## v0.3 — Marketplace Release Candidate
Public-safe onboarding and packaging.

## v0.4 — Public Repository Automation
CI/CD, security checks, semantic releases and Marketplace publication.

## v0.5 — Developer Intelligence Engine
Runtime, package-manager, tooling ownership, environment discovery and richer health.

## v0.6 — Contributor & Workspace Orchestrator
Prerequisite checks, contributor onboarding, first-run recommendations and Node workspace graphs.

## v0.7 — Native-First Workstation Engine

- professional VS Code user baseline for fresh/corporate machines
- existing explicit user settings preserved as developer-owned
- native capability inventory and coverage indicator
- extension-gap reporting instead of extension-pack behavior
- stack-aware watcher/search exclusions for repository performance
- workstation health view
- non-blocking first-run consent lifecycle
- CI/release workflow alignment with protected `main` and tag-based Marketplace publication

## Planned v0.8 — Multi-Language Graph & Verification Engine

Planned:

- .NET solution/project-reference graph
- Cargo workspace graph
- Go workspace graph
- Maven/Gradle modules
- Python monorepo/workspace support
- dependency-aware build/test ordering
- explicit build/test success verification
- Project Health verification state

## Future direction

Potential:

- profile-aware workstation initialization
- richer extension-capability conflict analysis
- contributor onboarding reports
- framework adapters
- team/organization policy packs
- optional enterprise governance while keeping the open-source core useful

## Release safety: purpose-driven project files

- Opening, rescanning, and trusting a workspace are inspection-only operations, regardless of the legacy `cassets.mode` value.
- Repository file generation requires an explicit developer command; existing project files remain developer-owned.
- Each proposed file must have a documented consumer, concrete purpose, necessity, ownership model, and verification path.
- `.cassets/` project intelligence and policies are optional and require deliberate initialization. Local indexes are preferred to committed generated artifacts.
- `AGENTS.md`, `CONTRIBUTING.md`, skills, and Tree-sitter-backed indexes must not be created without a concrete use case and an identified consumer.

## Proposed product pillars (implementation pending)

1. Project Understanding: read-only stack, entry-point, script, and dependency discovery.
2. Workspace Doctor: actionable prerequisite and configuration diagnosis.
3. Run/Test/Debug: reuse existing commands and VS Code native facilities; verify outcomes.
4. Change Impact: source-linked impact analysis with bounded, incremental indexing.

Future agent integration may expose bounded code context and policy checks. Index summaries must never replace source-level verification. New parser or MCP dependencies require a separate design and performance review.
