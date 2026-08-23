const vscode = require('vscode');
const { exists, readJson, find } = require('./utils');
const { normalizeWorkspacePatterns, buildGraph, topologicalOrder } = require('./workspace-graph-core');

async function collectNodePackages(folder, rootPackage, maxPackages = 200) {
  const packages = [];
  if (rootPackage) {
    packages.push({
      name: rootPackage.name || '(root)',
      path: '.',
      private: rootPackage.private,
      dependencies: rootPackage.dependencies,
      devDependencies: rootPackage.devDependencies,
      peerDependencies: rootPackage.peerDependencies,
      optionalDependencies: rootPackage.optionalDependencies,
      scripts: rootPackage.scripts || {}
    });
  }

  const patterns = normalizeWorkspacePatterns(rootPackage?.workspaces);
  let manifests = [];

  if (patterns.length) {
    // VS Code glob expansion is simpler and safer than executing a package manager.
    manifests = await find(folder, '**/package.json', maxPackages + 1);
  } else {
    const pnpmWorkspace = await exists(vscode.Uri.joinPath(folder.uri, 'pnpm-workspace.yaml'));
    if (pnpmWorkspace) manifests = await find(folder, '**/package.json', maxPackages + 1);
  }

  for (const uri of manifests.slice(0, maxPackages)) {
    if (uri.fsPath === vscode.Uri.joinPath(folder.uri, 'package.json').fsPath) continue;
    const pkg = await readJson(uri);
    if (!pkg) continue;
    const rel = vscode.workspace.asRelativePath(uri, false).replace(/\/package\.json$/, '').replace(/\\package\.json$/, '');
    packages.push({
      name: pkg.name || rel,
      path: rel,
      private: pkg.private,
      dependencies: pkg.dependencies,
      devDependencies: pkg.devDependencies,
      peerDependencies: pkg.peerDependencies,
      optionalDependencies: pkg.optionalDependencies,
      scripts: pkg.scripts || {}
    });
  }

  const graph = buildGraph(packages);
  const topo = topologicalOrder(graph);
  return { packages, graph, topo, truncated: manifests.length > maxPackages };
}

async function analyze(folder, stack, intelligence, maxPackages = 200) {
  if (!stack.node || !intelligence.summary?.monorepo) {
    return { detected: false, packages: [], graph: { nodes: [], edges: [], outgoing: {} }, topo: { order: [], cyclic: false }, truncated: false };
  }
  const result = await collectNodePackages(folder, stack.package, maxPackages);
  return { detected: true, ...result };
}

module.exports = { analyze, collectNodePackages };
