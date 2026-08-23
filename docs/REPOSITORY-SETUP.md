# Public repository setup

## Recommended GitHub settings

### General

- Default branch: `main`
- Enable Issues
- Enable Discussions when community usage starts
- Enable vulnerability reporting / private security advisories
- Prefer **Squash merging**
- Automatically delete head branches after merge

### Branch rules for `main`

Require:

- Pull request before merging
- At least 1 approving review
- Dismiss stale approvals when new commits are pushed
- Conversation resolution
- Status checks:
  - Validate PR title
  - Unit / manifest validation (Node 20)
  - Unit / manifest validation (Node 22)
  - VS Code integration (ubuntu-latest)
  - VS Code integration (windows-latest)
  - VS Code integration (macos-latest)
  - Package VSIX
  - CodeQL
  - Dependency Review
- Block force pushes
- Block branch deletion

The release workflow creates a version commit on `main`. If your branch rules block `GITHUB_TOKEN`
writes, create a narrowly scoped GitHub App/fine-grained release token and store it as
`RELEASE_GITHUB_TOKEN`, allowing only repository Contents read/write. Configure the ruleset so the
release identity may bypass only the version/tag automation requirement.

## Marketplace environment

Create GitHub Environment:

`visual-studio-marketplace`

Recommended protection:

- Restrict deployment branch to `main`
- Optional required reviewer while CAssets is pre-release
- Keep Marketplace credentials at environment scope

## Required secret (current GitHub Actions path)

`VSCE_PAT`

Use the minimum Visual Studio Marketplace publishing scope possible.

Microsoft is retiring global Azure DevOps PATs on December 1, 2026. Migrate long-lived publishing
to Microsoft Entra ID / workload identity as Microsoft's Marketplace tooling supports your chosen
CI topology. CAssets keeps publishing isolated in one workflow so the credential mechanism can be
replaced without changing release/version logic.

## Optional secret

`RELEASE_GITHUB_TOKEN`

Only needed when the default `GITHUB_TOKEN` cannot push the release version commit/tag because of
repository rules.

## Release behavior

Every trusted merge to `main`:

1. CI already passed on the PR.
2. Release workflow checks the merged commit/associated PR.
3. Resolves semantic bump from release label or Conventional PR title.
4. Re-runs validation/unit/integration tests from trusted `main`.
5. Updates `package.json`.
6. Packages VSIX.
7. Commits version.
8. Creates `vX.Y.Z` tag.
9. Publishes VSIX to Visual Studio Marketplace.
10. Creates GitHub Release and attaches the exact VSIX.

Use `release:skip` for documentation/repository-only merges that should not publish.
