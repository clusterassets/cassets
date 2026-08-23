import fs from 'node:fs';

const bump = process.argv[2] || 'patch';
if (!['major', 'minor', 'patch'].includes(bump)) {
  throw new Error(`Invalid bump '${bump}'. Expected major, minor, or patch.`);
}

const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version);
if (!match) throw new Error(`Unsupported package version: ${pkg.version}`);

let major = Number(match[1]);
let minor = Number(match[2]);
let patch = Number(match[3]);

if (bump === 'major') {
  major += 1; minor = 0; patch = 0;
} else if (bump === 'minor') {
  minor += 1; patch = 0;
} else {
  patch += 1;
}

pkg.version = `${major}.${minor}.${patch}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
process.stdout.write(pkg.version);
