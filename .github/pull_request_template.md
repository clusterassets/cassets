## Summary

<!-- Use a Conventional Commit-style PR title, for example:
fix(ci): stabilize Linux integration tests
feat(detector): add new project signal
-->

## Release impact

Choose the expected impact. Release labels are classification aids; Marketplace publication happens only from a version tag.

- [ ] No release / repository-only change
- [ ] Patch (`release:patch`)
- [ ] Minor (`release:minor`)
- [ ] Major / breaking (`release:major`)

## Validation

- [ ] `npm run validate`
- [ ] `npm run test:unit`
- [ ] Integration test added/updated when appropriate
- [ ] Existing developer-owned files remain non-destructive
- [ ] No telemetry, credentials, silent installs/uninstalls, or repository uploads introduced
