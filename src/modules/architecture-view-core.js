'use strict';

// Pure, bounded graph projections shared by the Explorer UI and tests.
function neighborhood(graph, selected, direction = 'both', depth = 1, limit = 120) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const ids = new Set(nodes.map(n => n.id));
  if (!ids.has(selected)) return { nodes: [], edges: [], truncated: false };
  const max = Math.max(1, Math.min(300, limit));
  const hops = Math.max(1, Math.min(4, depth));
  const reached = new Set([selected]);
  let frontier = [selected], truncated = false;
  for (let i = 0; i < hops && frontier.length; i++) {
    const next = [];
    for (const edge of edges) {
      if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
      const target = (direction === 'both' || direction === 'outgoing') && frontier.includes(edge.from) ? edge.to :
        (direction === 'both' || direction === 'incoming') && frontier.includes(edge.to) ? edge.from : null;
      if (target && !reached.has(target)) {
        if (reached.size >= max) { truncated = true; continue; }
        reached.add(target); next.push(target);
      }
    }
    frontier = next;
  }
  return { nodes: nodes.filter(n => reached.has(n.id)),
    edges: edges.filter(e => reached.has(e.from) && reached.has(e.to)), truncated };
}

function detail(graph, id) {
  const node = graph.nodes.find(n => n.id === id);
  if (!node) return null;
  const incoming = graph.edges.filter(e => e.to === id);
  const outgoing = graph.edges.filter(e => e.from === id);
  const unresolved = graph.unresolved.filter(e => e.from === id);
  const external = graph.external.filter(e => e.from === id);
  return { node, incoming, outgoing, unresolved, external };
}
module.exports = { neighborhood, detail };
