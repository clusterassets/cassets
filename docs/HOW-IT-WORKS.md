# How It Works

## Repository opening

A trusted workspace is analyzed locally:

```text
Open repository
  ↓
Read bounded metadata
  ↓
Detect stack
  ↓
Detect runtimes/package manager
  ↓
Detect tests/lint/format ownership
  ↓
Detect supported workspace structure
  ↓
Build capability plan
  ↓
Calculate project health
```

Detection does not run repository lifecycle commands.

## Applying recommended setup

`CAssets: Apply Recommended Workspace Setup` creates only relevant missing baseline files/configuration.

Existing files are preserved.

## How Do I Run This Repo?

DevReady:

1. checks required local prerequisites;
2. reads known repository metadata such as package scripts;
3. selects a likely first-success command;
4. displays the command;
5. requires explicit approval before running it.

## Environment discovery

DevReady recognizes supported patterns such as:

```text
process.env.DATABASE_URL
os.getenv("DATABASE_URL")
Environment.GetEnvironmentVariable("DATABASE_URL")
```

Only variable names are retained. Values are not queried.

## Workspace graph

Supported Node workspace relationships are derived from package manifests.

No package-manager command is required for graph discovery.
