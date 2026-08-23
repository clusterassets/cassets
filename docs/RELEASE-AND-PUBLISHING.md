# Release and Publishing

## Pull request pipeline

```text
Pull Request
  ↓
Conventional PR title
  ↓
Manifest validation
  ↓
Unit tests
  ↓
VS Code integration tests
  ↓
Linux / Windows / macOS
  ↓
VSIX packaging
  ↓
Dependency Review
  ↓
CodeQL
```

## Main-branch release

```text
Merge to main
  ↓
Resolve semantic bump
  ↓
Re-test trusted main
  ↓
Update package.json
  ↓
Package VSIX
  ↓
Version commit + vX.Y.Z tag
  ↓
Publish exact VSIX
  ├── Visual Studio Marketplace
  └── GitHub Release
```

## Release labels

- `release:major`
- `release:minor`
- `release:patch`
- `release:skip`

Without an override:

```text
feat:  -> minor
type!: -> major
other  -> patch
```

## Marketplace identity

```text
Publisher: clusterassets
Package: cassets
Extension ID: clusterassets.cassets
```

## GitHub environment

```text
visual-studio-marketplace
```

Publishing credentials must remain in GitHub secrets/environment configuration and never in source control.
