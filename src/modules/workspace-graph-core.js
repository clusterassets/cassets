function normalizeWorkspacePatterns(workspaces) {
  if (!workspaces) return [];
  if (Array.isArray(workspaces)) return workspaces;
  if (Array.isArray(workspaces.packages)) return workspaces.packages;
  return [];
}

function dependencyNames(pkg = {}) {
  return new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.optionalDependencies || {})
  ]);
}

function buildGraph(packages) {
  const byName = new Map();
  for (const pkg of packages) {
    if (pkg.name) byName.set(pkg.name, pkg);
  }

  const nodes = packages.map(pkg => ({
    name: pkg.name || pkg.path,
    path: pkg.path,
    private: !!pkg.private
  }));

  const edges = [];
  for (const pkg of packages) {
    const from = pkg.name || pkg.path;
    for (const dep of dependencyNames(pkg)) {
      if (byName.has(dep)) edges.push({ from, to: dep });
    }
  }

  const outgoing = new Map(nodes.map(n => [n.name, []]));
  for (const edge of edges) outgoing.get(edge.from)?.push(edge.to);

  return { nodes, edges, outgoing: Object.fromEntries(outgoing) };
}

function topologicalOrder(graph) {
  const indegree = new Map(graph.nodes.map(n => [n.name, 0]));
  for (const edge of graph.edges) indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);

  const queue = [...indegree.entries()].filter(([, n]) => n === 0).map(([n]) => n).sort();
  const out = [];
  const adj = new Map(graph.nodes.map(n => [n.name, []]));
  for (const edge of graph.edges) adj.get(edge.from)?.push(edge.to);

  while (queue.length) {
    const current = queue.shift();
    out.push(current);
    for (const next of adj.get(current) || []) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
    queue.sort();
  }

  return {
    order: out,
    cyclic: out.length !== graph.nodes.length
  };
}

module.exports = {
  normalizeWorkspacePatterns,
  dependencyNames,
  buildGraph,
  topologicalOrder
};
