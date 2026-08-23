import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const required = ['name', 'displayName', 'version', 'publisher', 'engines', 'main', 'description'];
for (const key of required) {
  if (!pkg[key]) throw new Error(`package.json missing required field: ${key}`);
}
if (pkg.name !== pkg.name.toLowerCase() || /\s/.test(pkg.name)) {
  throw new Error('package.json name must be lowercase and contain no spaces');
}
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  throw new Error('Marketplace extension version must be major.minor.patch');
}
for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE', 'SECURITY.md', 'CONTRIBUTING.md', '.vscodeignore', 'images/icon.png']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Marketplace file: ${file}`);
}
for (const file of ['src/extension.js', 'src/modules/detectors.js', 'src/modules/templates.js', 'src/modules/policy.js', 'src/modules/workspace.js', 'src/modules/intelligence.js', 'src/modules/intelligence-core.js', 'src/modules/capabilities.js', 'src/modules/prerequisites.js', 'src/modules/workspace-graph.js', 'src/modules/workspace-graph-core.js', 'src/modules/onboarding.js']) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing runtime file: ${file}`);
}
console.log('CAssets Marketplace validation passed.');
