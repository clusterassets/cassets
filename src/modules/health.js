const vscode = require('vscode');
const { exists } = require('./utils');

async function evaluate(folder, stack, intelligence, prereqs = null, workspaceGraph = null) {
  const root = folder.uri;
  const categories = [];

  async function fileCheck(name, path, weight, category, actionable = true) {
    return {
      name,
      ok: await exists(vscode.Uri.joinPath(root, ...path.split('/'))),
      weight,
      category,
      actionable
    };
  }

  categories.push(
    await fileCheck('Git ignore', '.gitignore', 8, 'repository'),
    await fileCheck('EditorConfig', '.editorconfig', 6, 'editor'),
    await fileCheck('Git attributes', '.gitattributes', 4, 'repository'),
    await fileCheck('VS Code tasks', '.vscode/tasks.json', 8, 'productivity'),
    await fileCheck('VS Code debug configuration', '.vscode/launch.json', 8, 'productivity'),
    await fileCheck('Extension recommendations', '.vscode/extensions.json', 6, 'editor'),
    await fileCheck('CAssets policy', '.cassets.json', 4, 'workspace')
  );

  if (stack.node || stack.python || stack.dotnet || stack.rust || stack.go) {
    categories.push(await fileCheck('CI workflow', '.github/workflows/ci.yml', 10, 'quality'));
  }

  if (stack.envDetected || intelligence.environmentVariables.length) {
    categories.push(await fileCheck('Environment example', '.env.example', 8, 'onboarding'));
  }

  categories.push({
    name: 'Runtime version detected',
    ok: Object.values(intelligence.runtime || {}).some(v => {
      if (!v) return false;
      if (typeof v === 'object') return !!v.version;
      return true;
    }),
    weight: 8,
    category: 'onboarding',
    actionable: false
  });

  categories.push({
    name: 'Test command/framework detected',
    ok: intelligence.summary.testFrameworks.length > 0 ||
      !!stack.scripts?.test || stack.dotnet || stack.rust || stack.go,
    weight: 10,
    category: 'quality',
    actionable: false
  });

  categories.push({
    name: 'Formatter ownership known',
    ok: !!intelligence.ownership.formatter,
    weight: 6,
    category: 'editor',
    actionable: false
  });

  categories.push({
    name: 'Linter ownership known',
    ok: !!intelligence.ownership.linter || (!stack.node && !stack.python),
    weight: 6,
    category: 'quality',
    actionable: false
  });

  if (prereqs) {
    categories.push({
      name: 'Required developer prerequisites available',
      ok: prereqs.ready,
      weight: 12,
      category: 'onboarding',
      actionable: false
    });
  }

  if (intelligence.summary?.monorepo) {
    categories.push({
      name: 'Workspace package graph understood',
      ok: !!workspaceGraph?.detected && !workspaceGraph?.truncated,
      weight: 6,
      category: 'workspace',
      actionable: false
    });
  }

  categories.push({
    name: 'Agent guidance',
    ok: await exists(vscode.Uri.joinPath(root, 'AGENTS.md')),
    weight: 4,
    category: 'ai',
    actionable: true
  });

  const possible = categories.reduce((sum, c) => sum + c.weight, 0);
  const earned = categories.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);

  const byCategory = {};
  for (const check of categories) {
    byCategory[check.category] ||= { earned: 0, possible: 0, checks: [] };
    byCategory[check.category].possible += check.weight;
    if (check.ok) byCategory[check.category].earned += check.weight;
    byCategory[check.category].checks.push(check);
  }
  for (const value of Object.values(byCategory)) {
    value.score = value.possible ? Math.round(value.earned / value.possible * 100) : 100;
  }

  return {
    score: possible ? Math.round(earned / possible * 100) : 100,
    checks: categories,
    categories: byCategory
  };
}

module.exports = { evaluate };
