const vscode = require('vscode');
const crypto = require('crypto');

async function exists(uri) {
  try { await vscode.workspace.fs.stat(uri); return true; } catch { return false; }
}
async function readText(uri) {
  return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
}
async function writeText(uri, value) {
  await vscode.workspace.fs.writeFile(uri, Buffer.from(value, 'utf8'));
}
async function readJson(uri) {
  try { return JSON.parse(await readText(uri)); } catch { return undefined; }
}
async function writeJson(uri, value) {
  await writeText(uri, JSON.stringify(value, null, 2) + '\n');
}
async function ensureDir(uri) {
  await vscode.workspace.fs.createDirectory(uri);
}
async function find(folder, glob, max = 40) {
  return vscode.workspace.findFiles(
    new vscode.RelativePattern(folder, glob),
    '**/{node_modules,.git,dist,build,coverage,.next,.nuxt,.turbo,.venv,__pycache__,bin,obj,target,vendor}/**',
    max
  );
}
function unique(values) { return [...new Set(values)]; }
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
module.exports = { exists, readText, writeText, readJson, writeJson, ensureDir, find, unique, sha256 };
