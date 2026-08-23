# Security Policy

## Supported versions

Until CAssets reaches 1.0, only the latest Marketplace pre-release is supported.

## Reporting a vulnerability

Please do not publish exploitable security details in a public issue.

Report security concerns through the repository's private security reporting mechanism when enabled, or through the security contact published by ClusterAssets.

Include:

- affected CAssets version,
- VS Code version and operating system,
- reproduction steps,
- whether the issue can overwrite developer-owned files, execute commands, expose secrets, or cross Workspace Trust boundaries.

## Security design

CAssets:

- respects VS Code Workspace Trust,
- does not write baseline files in Restricted Mode,
- does not overwrite existing baseline files,
- has no telemetry,
- does not upload repository content,
- does not silently install/uninstall extensions,
- keeps MCP generation disabled by default,
- does not embed API keys, tokens, or credentials.

Generated CI and development files are templates and should be reviewed like any other code before production use.

## Release supply-chain controls

- Marketplace publication occurs only after CI and release-gate tests pass.
- The release workflow packages one VSIX and publishes that same artifact to the Marketplace and GitHub Release.
- Marketplace secrets are scoped to the `visual-studio-marketplace` GitHub Environment.
- Pull requests from forks never receive Marketplace credentials.
- Release execution checks out trusted `main`, never contributor PR head code with publishing credentials.
