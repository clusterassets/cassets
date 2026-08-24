# Command Reference

| Command | Description |
|---|---|
| `CAssets: Initialize Developer Workstation` | Apply the native-first professional VS Code baseline while preserving explicit user choices |
| `CAssets: Workstation Health` | Inspect baseline alignment, native defaults and preserved developer-owned settings |
| `CAssets: Native Capability Audit` | Show capabilities already supplied by VS Code and unresolved repository-specific extension gaps |
| `CAssets: Optimize Workspace Performance` | Add stack-aware watcher/search exclusions when the workspace does not already own those settings |
| `CAssets: Apply Professional User Settings` | Compatibility alias for workstation initialization |
| `CAssets: Apply Recommended Workspace Setup` | Create safe missing project/workspace baselines |
| `CAssets: Restore Missing Generated Templates` | Explicitly restore initialized templates |
| `CAssets: Re-scan Workspace` | Re-run repository detection |
| `CAssets: Project Health` | Show readiness/category health |
| `CAssets: Show Detected Stack` | Show high-level detected stack |
| `CAssets: Show Project Intelligence` | Show runtime, package manager, monorepo and tooling intelligence |
| `CAssets: Show Detected Environment Variables` | Show environment-variable names found locally |
| `CAssets: Refresh .env.example Suggestions` | Append missing variable names after approval |
| `CAssets: Extension Audit` | Show capability-driven extension recommendations |
| `CAssets: Check Developer Prerequisites` | Check required local tools and versions |
| `CAssets: How Do I Run This Repo?` | Recommend a first-success command |
| `CAssets: Show Contributor Onboarding` | Show prerequisites and inferred project commands |
| `CAssets: Show Workspace Package Graph` | Inspect supported workspace package relationships |
| `CAssets: Run Recommended Task` | Execute an inferred command after explicit confirmation |
| `CAssets: Open .cassets.json` | Open repository-level DevReady policy |

## Execution rule

Inspection commands do not execute repository scripts.

Any repository command execution requires explicit developer action.
