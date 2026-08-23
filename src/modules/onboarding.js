function commandForNode(pm, script) {
  return (pm === 'npm' || pm === 'pnpm') ? `${pm} run ${script}` : `${pm} ${script}`;
}

function recommendCommands(stack, intelligence, prereqs) {
  const commands = [];
  const pm = intelligence.runtime?.packageManager?.name || stack.packageManager;

  if (stack.node) {
    commands.push({ kind: 'install', command: `${pm} install`, confidence: 'high' });
    for (const script of ['dev', 'start', 'test', 'build', 'lint']) {
      if (stack.scripts?.[script]) {
        commands.push({ kind: script, command: commandForNode(pm, script), confidence: 'high' });
      }
    }
  }

  if (stack.python) {
    if (intelligence.summary.testFrameworks.includes('pytest')) {
      commands.push({ kind: 'test', command: 'python -m pytest', confidence: 'high' });
    }
    if (stack.framework?.fastapi) {
      commands.push({ kind: 'dev', command: 'python -m uvicorn main:app --reload', confidence: 'medium' });
    }
  }

  if (stack.dotnet) {
    commands.push({ kind: 'restore', command: 'dotnet restore', confidence: 'high' });
    commands.push({ kind: 'build', command: 'dotnet build', confidence: 'high' });
    commands.push({ kind: 'test', command: 'dotnet test', confidence: 'high' });
  }

  if (stack.rust) {
    commands.push({ kind: 'build', command: 'cargo build', confidence: 'high' });
    commands.push({ kind: 'test', command: 'cargo test', confidence: 'high' });
  }

  if (stack.go) {
    commands.push({ kind: 'build', command: 'go build ./...', confidence: 'high' });
    commands.push({ kind: 'test', command: 'go test ./...', confidence: 'high' });
  }

  if (stack.terraform) {
    commands.push({ kind: 'validate', command: 'terraform validate', confidence: 'high' });
  }

  return commands;
}

function buildGuide(folderName, stack, intelligence, prereqs, workspaceGraph) {
  const commands = recommendCommands(stack, intelligence, prereqs);
  const missing = prereqs?.missingRequired || [];

  return {
    folderName,
    ready: !missing.length,
    runtime: intelligence.runtime,
    monorepo: workspaceGraph?.detected || intelligence.summary?.monorepo || false,
    packageCount: workspaceGraph?.packages?.length || 0,
    missingPrerequisites: missing,
    commands,
    firstSuccess:
      commands.find(x => x.kind === 'dev') ||
      commands.find(x => x.kind === 'test') ||
      commands.find(x => x.kind === 'build') ||
      commands[0] ||
      null
  };
}

module.exports = { commandForNode, recommendCommands, buildGuide };
