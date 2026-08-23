# Architecture

## High-level architecture

```text
VS Code Extension Host
        │
        ▼
CAssets DevReady
        │
        ├── Stack Detector
        ├── Developer Intelligence Engine
        ├── Capability Planner
        ├── Workspace Graph
        ├── Prerequisite Analyzer
        ├── Policy Engine
        ├── Template Engine
        ├── Workspace Configurator
        ├── Contributor Orchestrator
        └── Project Health
```

## Design principles

### Built-in first
Prefer VS Code built-in capabilities before extensions.

### Repository evidence
Prefer explicit project metadata over generic assumptions.

### Non-executing detection
Repository content is treated as data. Detection does not execute repository lifecycle scripts.

### Developer ownership
Existing project files are preserved. Initialized baselines become developer-owned immediately.

### Explicit execution
Inferred repository commands are displayed and executed only after developer approval.

## Modules

```text
src/modules/
├── detectors.js
├── intelligence-core.js
├── intelligence.js
├── capabilities.js
├── prerequisites.js
├── workspace-graph-core.js
├── workspace-graph.js
├── onboarding.js
├── policy.js
├── templates.js
├── workspace.js
├── health.js
└── utils.js
```

## Data flow

```text
Workspace
  ↓
Stack Detector
  ↓
Repository Stack Model
  ↓
Developer Intelligence
  ↓
Runtime / Tool / Ownership Model
  ↓
Workspace Graph + Prerequisites
  ↓
Contributor Readiness
  ↓
Capability + Policy Engines
  ↓
Tasks / Debug / Templates / Extensions / Health
```
