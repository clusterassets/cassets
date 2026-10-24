'use strict';
const { neighborhood } = require('./architecture-view-core');

// Deterministic, bounded, no external layout dependencies.
function layout(graph, selected, direction = 'both', depth = 1, type = 'all') {
  const projected = neighborhood(graph, selected, direction, depth, 90);
  const visible = projected.nodes.filter(n => n.id === selected || type === 'all' || n.type === type);
  const ids = new Set(visible.map(n => n.id));
  const nodes = visible.slice(0, 90).map((n, index) => {
    const col = index % 5, row = Math.floor(index / 5);
    return { ...n, x: 20 + col * 215, y: 20 + row * 92, width: 190, height: 60 };
  });
  const edges = projected.edges.filter(e => ids.has(e.from) && ids.has(e.to)).slice(0, 180);
  return { nodes, edges, truncated: projected.truncated || visible.length > 90 || projected.edges.length > 180,
    width: 1100, height: Math.max(170, Math.ceil(nodes.length / 5) * 92 + 35) };
}
module.exports = { layout };
