const vscode = require('vscode');
const { exists, readJson, find } = require('./utils');
const { normalizeWorkspacePatterns, workspacePatternMatches, buildGraph, topologicalOrder } = require('./workspace-graph-core');

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
    // Search declared positive patterns rather than allowing unrelated manifests to consume the scan budget.
    const positives = patterns.filter(p => typeof p === 'string' && !p.startsWith('!'));
    const found = await Promise.all(positives.map(p => find(folder, p.replace(/\/$/, '') + '/package.json', maxPackages + 1)));
    manifests = [...new Map(found.flat().map(uri => [uri.toString(), uri])).values()];
  } else {
    const pnpmWorkspace = await exists(vscode.Uri.joinPath(folder.uri, 'pnpm-workspace.yaml'));
    if (pnpmWorkspace) manifests = []; // pnpm YAML pattern parsing is not yet supported; never infer membership.
  }

  let matched = 0;
  let truncated = false;
  for (const uri of manifests) {
    if (uri.fsPath === vscode.Uri.joinPath(folder.uri, 'package.json').fsPath) continue;
    const rel = uri.path.slice(folder.uri.path.replace(/\/$/, '').length + 1).replace(/\\/g, '/').replace(/\/package\.json$/, '');
    if (!workspacePatternMatches(rel, patterns)) continue;
    matched++;
    if (matched > maxPackages) { truncated = true; break; }
    const pkg = await readJson(uri);
    if (!pkg) continue;
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
  return { packages, graph, topo, truncated: truncated || manifests.length > maxPackages };
}

async function analyze(folder, stack, intelligence, maxPackages = 200) {
  if (!stack.node || !normalizeWorkspacePatterns(stack.package?.workspaces).length) {
    return { detected: false, packages: [], graph: { nodes: [], edges: [], outgoing: {} }, topo: { order: [], cyclic: false }, truncated: false };
  }
  const result = await collectNodePackages(folder, stack.package, maxPackages);
  return { detected: true, ...result };
}

module.exports = { analyze, collectNodePackages };
