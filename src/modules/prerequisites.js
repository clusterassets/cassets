const vscode = require('vscode');
const cp = require('child_process');

function checkCommand(command, args = ['--version']) {
  return new Promise(resolve => {
    let child;
    try {
      child = cp.spawn(command, args, {
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch {
      resolve({ available: false, version: null });
      return;
    }

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ available: false, version: null, timeout: true });
    }, 3500);

    child.stdout?.on('data', d => { stdout += d.toString(); });
    child.stderr?.on('data', d => { stderr += d.toString(); });

    child.on('error', () => {
      clearTimeout(timer);
      resolve({ available: false, version: null });
    });

    child.on('close', code => {
      clearTimeout(timer);
      const text = (stdout || stderr).trim().split(/\r?\n/)[0] || null;
      resolve({ available: code === 0, version: text });
    });
  });
}

async function evaluate(stack, intelligence) {
  const checks = [];

  async function add(id, label, command, args, required = true, reason = '') {
    const result = await checkCommand(command, args);
    checks.push({ id, label, command, required, reason, ...result });
  }

  if (stack.node) {
    await add('node', 'Node.js', 'node', ['--version'], true, 'Node project detected.');
    const pm = intelligence.runtime?.packageManager?.name || stack.packageManager;
    if (pm) await add(`pm:${pm}`, pm, pm, ['--version'], true, `Repository package manager is ${pm}.`);
  }
  if (stack.python) await add('python', 'Python', 'python', ['--version'], true, 'Python project detected.');
  if (stack.dotnet) await add('dotnet', '.NET SDK', 'dotnet', ['--version'], true, '.NET project detected.');
  if (stack.rust) await add('cargo', 'Cargo', 'cargo', ['--version'], true, 'Rust project detected.');
  if (stack.go) await add('go', 'Go', 'go', ['version'], true, 'Go project detected.');
  if (stack.java) {
    await add('java', 'Java', 'java', ['-version'], true, 'Java project detected.');
    if (intelligence.tools?.java?.maven) await add('maven', 'Maven', 'mvn', ['-version'], true, 'Maven project detected.');
    if (intelligence.tools?.java?.gradle) await add('gradle', 'Gradle', 'gradle', ['--version'], true, 'Gradle project detected.');
  }
  if (stack.terraform) await add('terraform', 'Terraform', 'terraform', ['version'], true, 'Terraform configuration detected.');
  if (stack.ansible) await add('ansible', 'Ansible', 'ansible', ['--version'], true, 'Ansible project detected.');
  if (stack.docker) await add('docker', 'Docker', 'docker', ['--version'], false, 'Container configuration detected.');

  return {
    checks,
    ready: checks.filter(x => x.required).every(x => x.available),
    missingRequired: checks.filter(x => x.required && !x.available),
    missingOptional: checks.filter(x => !x.required && !x.available)
  };
}

module.exports = { checkCommand, evaluate };
