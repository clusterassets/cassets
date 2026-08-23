# Contributor & Workspace Orchestrator

## North-star metric

**Clone-to-first-successful-build time**

CAssets should shorten the time from opening an unfamiliar repository to reaching a verified
development state.

## Safety boundary

Detection:
- may read bounded repository metadata/source signals,
- may check local tool availability with `--version`-style commands,
- does not install runtimes,
- does not run repository scripts,
- does not trust README text as executable instructions,
- does not execute package-manager lifecycle scripts during detection.

Execution:
- happens only after explicit developer confirmation,
- uses a visible integrated terminal,
- runs a command inferred from trusted repository metadata such as `package.json#scripts`,
- remains user-controlled and cancellable.

## Contributor flow

```text
Clone / Open
   ↓
Detect stack
   ↓
Detect runtime versions
   ↓
Check local prerequisites
   ↓
Analyze monorepo/workspace relationships
   ↓
Infer safe commands
   ↓
Show first-success recommendation
   ↓
Developer confirms
   ↓
Visible integrated terminal
```

## Workspace graph

v0.6 initially focuses on Node-compatible workspaces. It reads package manifests and builds
internal dependency edges when one workspace package depends on another by package name.

No package-manager command is executed to discover the graph.

## Future expansion

- Python workspaces/monorepos
- .NET solution/project references
- Cargo workspaces
- Go workspaces
- Maven/Gradle multi-module graphs
- richer "first successful test/build" verification
