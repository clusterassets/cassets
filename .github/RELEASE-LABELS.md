# Release labels

These labels classify the expected impact of a change.

| Label | Purpose |
|---|---|
| `release:major` | Breaking change; next release should increment major |
| `release:minor` | Backwards-compatible feature; next release should increment minor |
| `release:patch` | Fix/docs/chore; next release should increment patch |
| `release:skip` | Repository-only change; no extension release expected |
| `dependencies` | Dependency update |

## Important

The labels do **not** currently change `package.json`, create tags, or publish automatically.

CAssets DevReady uses a protected-main, tag-based publishing model:

```text
Change PR
  ↓
CI + review
  ↓
merge to main
  ↓
maintainer prepares version bump through a PR
  ↓
merge version PR
  ↓
push vX.Y.Z tag
  ↓
publish.yml
  ↓
Marketplace + GitHub pre-release
```

The `publish.yml` workflow verifies that the pushed tag exactly matches `package.json.version`.
