# Release and Publishing

## Tag-based release policy

**Last known release tag:** `v0.7.0`. No new release tag is created by this change.

Pull requests and merges only run validation and create short-lived downloadable VSIX test artifacts. They **do not** publish to Marketplace or create GitHub releases. The PR-only `CodeSight A2 VSIX Validation (non-release)` workflow is for installation acceptance, not a release.

A release requires an explicitly approved version bump on `main` followed by a new `vX.Y.Z` Git tag matching `package.json.version`. The existing `Publish VS Code Extension` workflow triggers **only** on pushed version tags. A tag currently publishes a **Marketplace pre-release** and creates a GitHub pre-release. Stable Marketplace publication requires a separate reviewed workflow change.

```text
PR → CI + VSIX test artifact → clean VS Code acceptance
                                 ↓ approval
Version bump PR → merge main → tag vX.Y.Z → tag workflow
                                 ↓
                         Marketplace pre-release
                         + GitHub pre-release
```

## Release gate

Before tagging: all required checks pass; install the exact candidate in VS Code; verify commands, navigation, trust boundaries, multi-root behavior, icon and large-repository performance; record failures and fixes. See [A2 acceptance](CODESIGHT_A2_VSIX_ACCEPTANCE.md).

## Identity and credentials

Publisher: `clusterassets` · package: `cassets` · extension ID: `clusterassets.cassets`.

Marketplace credentials stay in the protected `visual-studio-marketplace` environment and GitHub secrets. Never commit credentials or publish from a test workflow.
