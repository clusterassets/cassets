# CAssets DevReady Developer Experience North Star

## Goal

**Clone. Open. Code.**

CAssets should remove repeatable environment/setup decisions while keeping the developer in control.

## Capability hierarchy

1. Use VS Code built-in capability.
2. Respect repository configuration.
3. Prefer official language/tool extensions when core VS Code cannot supply the capability.
4. Generate only missing professional baseline configuration.
5. Recommend third-party tools only when they add a meaningful capability.

## What CAssets should automate

- Workspace Trust-aware onboarding
- Stack/framework/package-manager detection
- Formatter/linter recommendations
- Build/test/lint tasks
- Debug launch profiles
- Workspace extension recommendations
- `.gitignore`, `.editorconfig`, `.gitattributes`
- Environment example files without secrets
- CI baseline
- Agent guidance
- project health
- contributor clone-to-first-build guidance
- redundant-extension advisory, never silent uninstall
- multi-root workspace handling
- safe regeneration and ownership tracking

## What CAssets must not pretend to automate

- Domain architecture
- business requirements
- project-specific deployment topology
- production secrets
- destructive migrations
- arbitrary shell commands merely because a repository contains config files
- blind replacement of maintainers' existing configuration

The product succeeds when an expert developer agrees with the generated baseline and a less
experienced developer benefits from those expert defaults without losing visibility or control.
