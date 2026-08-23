# Changelog

> Product name: **CAssets DevReady — Clone. Open. Code.**

## 0.6.0 — Contributor & Workspace Orchestrator

- Added local prerequisite availability checks for detected runtimes and developer tools.
- Added safe contributor onboarding guidance.
- Added "How Do I Run This Repo?" and explicit recommended-task execution.
- Added Node monorepo/workspace package graph analysis.
- Added internal package dependency edges and cycle detection.
- Added workspace graph limit controls.
- Added Project Health prerequisite/workspace readiness signals.
- Added optional prerequisite checks on open.
- Added onboarding and graph unit tests.
- Preserved non-executing detection and explicit-consent command execution.

## 0.5.0 — Developer Intelligence Engine

- Added runtime-version detection for Node.js, Python, .NET, Rust and Go.
- Added package-manager version detection from `package.json#packageManager`.
- Added monorepo detection for workspaces, pnpm workspaces, Turbo, Nx and Lerna.
- Added test, formatter, linter and build-tool ownership analysis.
- Added capability-based extension recommendations.
- Added smarter task generation from actual repository scripts.
- Added smarter launch/debug generation.
- Added bounded environment-variable name discovery without reading environment values.
- Added safe `.env.example` suggestion refresh.
- Added Project Health 2.0 with category scores and optional status-bar score.
- Added intelligence/capability unit tests.
- Expanded metadata watcher coverage.

## 0.4.0 — Public Repository Automation Baseline

- Added PR title validation and semantic release intent.
- Added merge-to-main automatic version resolution and Marketplace publishing.
- Added one-artifact VSIX → Marketplace → GitHub Release flow.
- Added cross-platform integration CI.
- Added CodeQL and dependency review.
- Added Dependabot for npm and GitHub Actions.
- Added release labels with `release:skip`.
- Added Marketplace environment and branch-protection documentation.
- Added release supply-chain controls.


## 0.3.0 — Marketplace Release Candidate

- Added first-run consent and public-safe `review` default.
- Removed automatic unwanted-extension declarations.
- Added advisory Extension Audit.
- Added `.cassets.json` project policy manifest.
- Added generated-file ownership and deletion/dismissal behavior.
- Added stack-aware `.gitignore`, `.editorconfig`, `.gitattributes`, `.env.example`, `.npmignore`, `AGENTS.md`, contributor and CI templates.
- Added Node, Python, .NET, Rust, Go and Java detection.
- Added Project Health.
- MCP generation is disabled by default.
- Added unit/integration test scaffolding, CI and pre-release publishing workflow.

## 0.2.0

- Introduced Project Baseline Engine.

## 0.1.0

- Initial workspace bootstrap prototype.
