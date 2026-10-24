'use strict';
const path = require('node:path').posix;
const nativePath = require('node:path');
const fs = require('node:fs/promises');

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
async function containedSource(rootUri, fileUri) {
  if (rootUri.scheme !== fileUri.scheme || rootUri.authority !== fileUri.authority) return false;
  if (rootUri.scheme !== 'file') return false; // Fail closed when canonicalization is unavailable.
  try {
    const [root, target] = await Promise.all([fs.realpath(rootUri.fsPath), fs.realpath(fileUri.fsPath)]);
    const relative = nativePath.relative(root, target);
    return Boolean(relative) && relative !== '..' && !relative.startsWith('..' + nativePath.sep) && !nativePath.isAbsolute(relative);
  } catch { return false; }
}
module.exports = { safeRelative, knownSource, boundedLine, containedSource };
