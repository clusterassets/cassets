# Contributing to CAssets

## Development

Requirements:

- Node.js 20 or newer
- VS Code
- npm

```bash
npm install
npm run validate
npm run test:unit
```

For VS Code integration tests:

```bash
npm run test:integration
```

Press `F5` in VS Code to launch an Extension Development Host.

## Pull requests

- Keep changes focused.
- Add tests for detector, policy, template, or ownership behavior.
- Do not introduce a runtime dependency unless the capability cannot reasonably be implemented with VS Code/Node built-ins.
- Preserve the built-in-first philosophy.
- Never add silent extension uninstallation, secret collection, telemetry, or repository uploads.
- Existing project files must remain developer-owned unless an explicit managed-file feature is designed and documented.

## Release philosophy

CAssets uses Marketplace pre-releases before stable releases. The Marketplace version uses `major.minor.patch`; pre-release status is applied by `vsce --pre-release`.
