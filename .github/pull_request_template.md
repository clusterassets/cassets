## Summary

<!-- Use a Conventional Commit-style PR title. -->

## Release impact

Apply one label when you want to override automatic inference:

- `release:major`
- `release:minor`
- `release:patch`
- `release:skip`

Without a release label:
- `feat:` -> minor
- `type!:` -> major
- everything else -> patch

## Validation

- [ ] `npm run validate`
- [ ] `npm run test:unit`
- [ ] Integration test added/updated when appropriate
- [ ] Existing developer-owned files remain non-destructive
- [ ] No telemetry, credentials, silent installs/uninstalls, or repository uploads introduced
