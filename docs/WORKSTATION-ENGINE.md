# Workstation Engine

CAssets DevReady v0.7 introduces a **native-first Workstation Engine** for fresh or corporate VS Code installations.

The goal is not to reproduce a personal Settings Sync profile. The goal is to provide a professional, lightweight development baseline using VS Code itself before recommending additional extensions.

## Decision order

```text
Required developer capability
  ↓
VS Code already provides it?
  ├─ yes → configure/use the native capability
  └─ no
      ↓
Repository tooling already provides it?
      ├─ yes → use repository tooling
      └─ no → recommend the smallest capability-owning extension
```

DevReady never silently installs or uninstalls extensions.

## Initialize a workstation

Run:

```text
CAssets: Initialize Developer Workstation
```

The command applies only missing CAssets professional user defaults. Existing explicit user choices are treated as developer-owned and preserved.

The baseline intentionally excludes:

- themes and icon themes
- fonts
- keyboard shortcuts
- personal accounts
- AI/provider settings
- extension-specific settings
- Git identity

## Native capability audit

Run:

```text
CAssets: Native Capability Audit
```

The audit reports capabilities already supplied by VS Code and separates them from repository-specific capability gaps that may require an extension.

Examples of native capabilities include source control, diff/merge surfaces, workspace search, Quick Open, Peek navigation, the integrated terminal, tasks, debugger UI, JavaScript/TypeScript language services, JSON, Markdown, Emmet, snippets, Workspace Trust, Profiles, Sticky Scroll, bracket guides, and large-file optimization.

The displayed percentage is a capability-coverage indicator, not a performance benchmark.

## Workstation Health

Run:

```text
CAssets: Workstation Health
```

Each baseline setting is classified as:

```text
aligned        recommended value explicitly configured
preserved      developer already has a different explicit value
not configured no explicit value exists yet
```

A preserved setting is not treated as an error. DevReady does not overwrite developer-owned choices merely to increase a score.

## Stack-aware workspace performance

Run:

```text
CAssets: Optimize Workspace Performance
```

DevReady can add `files.watcherExclude` and `search.exclude` only when the workspace does not already own those settings. Patterns are selected from the detected stack, for example:

- Node: `node_modules`, `.next`, `.nuxt`, `.turbo`, `dist`, `coverage`
- Python: `.venv`, `venv`, `__pycache__`, pytest/mypy/Ruff caches
- .NET: `bin`, `obj`
- Rust: `target`
- Go: `vendor`
- Java: `target`, `.gradle`, `build`
- Terraform: `.terraform`

Existing workspace-level or workspace-folder-level exclusions win.

## Corporate/fresh-laptop use case

```text
Fresh office laptop
  ↓
Install VS Code
  ↓
Install CAssets DevReady
  ↓
Initialize Developer Workstation
  ↓
Open repository
  ↓
DevReady detects project requirements
  ↓
Use VS Code native capabilities first
  ↓
Recommend only unresolved capability gaps
```

This gives developers a professional baseline without requiring their personal Settings Sync account on a corporate machine.
