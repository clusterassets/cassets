# Security and Trust

## Workspace Trust

DevReady respects VS Code Workspace Trust.

Project mutation is disabled while the workspace is restricted.

## Detection

Detection may read bounded repository metadata and supported source/configuration files.

It does not automatically execute:

- package installation
- lifecycle scripts
- build commands
- test commands
- migrations
- deployments
- README shell commands
- arbitrary repository scripts

## Prerequisite checks

Tool checks use version-style commands such as:

```text
node --version
python --version
dotnet --version
cargo --version
go version
```

They do not install tools.

## Explicit execution

Recommended repository commands are shown before execution.

Execution occurs only after developer confirmation in a visible integrated terminal.

## Secrets

DevReady does not intentionally read or retain environment-variable values.

Environment discovery records names only.

## Extensions

DevReady may recommend extensions. It does not silently install or uninstall them.

## File ownership

Existing baseline files are preserved.

DevReady-created baseline files become developer-owned after creation.

Deleting a generated baseline is interpreted as intentional.
