# Configuration

DevReady settings use the `cassets.*` namespace.

## Operating mode

```json
{
  "cassets.mode": "review"
}
```

- `review` — detect automatically; apply setup explicitly.
- `auto` — after opt-in, create safe missing baselines.
- `observe` — analysis only.

## Developer Intelligence

```json
{
  "cassets.intelligence.enabled": true,
  "cassets.intelligence.scanEnvironmentVariables": true,
  "cassets.intelligence.maxEnvironmentFiles": 120
}
```

## Workspace graph

```json
{
  "cassets.workspaceGraph.enabled": true,
  "cassets.workspaceGraph.maxPackages": 200
}
```

## Tasks and debugging

```json
{
  "cassets.tasks.mode": "auto",
  "cassets.debug.mode": "auto"
}
```

Supported values:

- `auto`
- `minimal`
- `none`

## Templates

```json
{
  "cassets.templates.gitignore": true,
  "cassets.templates.editorconfig": true,
  "cassets.templates.gitattributes": true,
  "cassets.templates.envExample": "auto",
  "cassets.templates.npmignore": "auto",
  "cassets.templates.githubCi": "auto",
  "cassets.templates.contributing": false,
  "cassets.templates.agents": "auto"
}
```

## Prerequisites

```json
{
  "cassets.prerequisites.checkOnOpen": false
}
```

Disabled by default to keep workspace opening lightweight.

## MCP

```json
{
  "cassets.mcp.enabled": false
}
```

MCP generation is disabled by default for public installations.

## Repository-level policy

`.cassets.json` stores repository-level DevReady policy independently of the developer's personal VS Code settings.
