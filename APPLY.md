# Apply these GitHub files

## Replace

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/dependency-review.yml`
- `.github/workflows/publish.yml`
- `.github/dependabot.yml`
- `.github/pull_request_template.md`
- `.github/RELEASE-LABELS.md`

## Delete

Delete the old:

```text
.github/workflows/test.yml
```

`ci.yml` now contains the extension verification, Linux/Windows integration matrix, and VSIX packaging. Keeping both would duplicate checks.

## GitHub settings

Enable:

```text
Settings → Security / Advanced Security → Dependency graph
```

Dependency Review will fail until Dependency Graph is enabled.

## Ruleset

After the new workflow has run once, update the `main` ruleset to require the new PR checks shown by GitHub, normally:

- `PR title`
- `Verify`
- `VS Code integration (ubuntu-latest)`
- `VS Code integration (windows-latest)`
- `Package VSIX`
- `Analyze JavaScript`
- `Dependency Review`

Remove old required checks including:

- macOS integration
- old `CI / verify`
- old duplicated push variants
- old `Validate PR title (push)`
- any check produced by the deleted `test.yml`

Use the exact check names displayed by GitHub after the first PR run.

## Release

Normal branch pushes do not publish.

A tag push publishes:

```bash
git tag -a v0.6.1 -m "CAssets DevReady v0.6.1"
git push origin v0.6.1
```

The tag must equal `package.json.version`.
