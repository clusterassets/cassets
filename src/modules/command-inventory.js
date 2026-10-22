'use strict';
const HIGH_RISK = /(?:^|[:\-_])(install|migrate?|migration|seed|reset|deploy|publish|release|drop|destroy|bootstrap|clean)(?:$|[:\-_])/i;
function inventory(packages, manager = 'npm') {
  const entries = [];
  for (const pkg of packages || []) {
    if (!pkg || typeof pkg.path !== 'string') continue;
    for (const [name, script] of Object.entries(pkg.scripts || {})) {
      if (!name || typeof script !== 'string') continue;
      const root = pkg.path === '.';
      const packageName = pkg.name || pkg.path;
      const args = root ? ['run', name] : ['-w', packageName, 'run', name];
      const command = manager + ' ' + args.map(x => /[\s"']/.test(x) ? JSON.stringify(x) : x).join(' ');
      const delegate = root && manager === 'npm' ? /^\s*npm\s+(?:--workspace(?:=|\s+)|-w\s+)([^\s]+)\s+run\s+([^\s;&|]+)/.exec(script) : null;
      entries.push({
        id: pkg.path + ':' + name, name, packageName, path: pkg.path, root,
        script, command, args, manager,
        delegatedTo: delegate ? { package: delegate[1], script: delegate[2] } : null,
        risk: HIGH_RISK.test(name) ? 'sensitive' : 'review'
      });
    }
  }
  return entries;
}
module.exports = { inventory };
