# Release labels

Create these repository labels:

| Label | Purpose |
|---|---|
| `release:major` | Breaking change; next major version |
| `release:minor` | Backwards-compatible feature; next minor version |
| `release:patch` | Fix/docs/chore; next patch version |
| `release:skip` | Merge without Marketplace publication |
| `dependencies` | Dependency update |

The release workflow resolves the bump in this order:

1. `release:skip`
2. `release:major`
3. `release:minor`
4. `release:patch`
5. Conventional PR title inference (`feat` => minor, `!` => major, otherwise patch)

This lets maintainers override automated inference without editing workflow files.
