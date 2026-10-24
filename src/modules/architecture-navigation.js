'use strict';
const path = require('node:path').posix;

// Canonical relative paths are the only IDs accepted from a webview.
// URI resolution remains with VS Code and is scoped to the captured workspace folder.
function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.length > 2048 || value.includes('\\') ||
      value.includes('\\0') || value.startsWith('/') || /^[a-z]+:/i.test(value)) return false;
  const parts = value.split('/');
  return parts.every(part => part && part !== '.' && part !== '..') && path.normalize(value) === value;
}
function knownSource(graph, value) {
  return safeRelative(value) && graph.nodes.some(n => n.id === value);
}
function boundedLine(line, count) {
  const parsed = Number(line);
  return Math.max(0, Math.min(Math.max(0, count - 1), Number.isSafeInteger(parsed) ? parsed - 1 : 0));
}
module.exports = { safeRelative, knownSource, boundedLine };
