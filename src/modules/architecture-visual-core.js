'use strict';
const { neighborhood } = require('./architecture-view-core');

// Stable bounded breadth-first layers; edges retain original source evidence.
function layout(graph, selected, direction = 'both', depth = 1, type = 'all', kind = 'all') {
  const projected = neighborhood(graph, selected, direction, depth, 90);
  const visible = projected.nodes.filter(n => n.id === selected || type === 'all' || n.type === type);
  const ids = new Set(visible.map(n => n.id));
  const filtered = projected.edges.filter(e => ids.has(e.from) && ids.has(e.to) && (kind === 'all' || e.kind === kind));
  const edges = filtered.slice(0, 180);
  const distance = new Map([[selected, 0]]);
  let frontier = [selected];
  for (let level = 1; level <= 4 && frontier.length; level++) {
    const current = new Set(frontier);
    const next = [];
    for (const edge of filtered) {
      const candidates = [];
      if ((direction === 'both' || direction === 'outgoing') && current.has(edge.from)) candidates.push(edge.to);
      if ((direction === 'both' || direction === 'incoming') && current.has(edge.to)) candidates.push(edge.from);
      for (const id of candidates) if (!distance.has(id)) { distance.set(id, level); next.push(id); }
    }
    frontier = next;
  }
  const ordered = visible.slice(0, 90).sort((a,b) => (distance.get(a.id) ?? 5) - (distance.get(b.id) ?? 5) || a.id.localeCompare(b.id));
  const counts = new Map();
  const nodes = ordered.map(n => {
    const col = distance.get(n.id) ?? 5;
    const row = counts.get(col) || 0;
    counts.set(col, row + 1);
    return { ...n, x: 20 + col * 240, y: 20 + row * 90, width: 190, height: 60 };
  });
  return { nodes, edges, truncated: projected.truncated || visible.length > 90 || filtered.length > 180,
    width: Math.max(260, (Math.max(0, ...counts.keys()) + 1) * 240 + 20),
    height: Math.max(170, Math.max(0, ...counts.values()) * 90 + 30) };
}
module.exports = { layout };
