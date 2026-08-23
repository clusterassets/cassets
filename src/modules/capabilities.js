function extensionPlan(stack, intelligence) {
  const plan = [];

  function add(id, capability, reason, official = true) {
    plan.push({ id, capability, reason, official });
  }

  if (stack.node) {
    if (intelligence.ownership.linter === 'eslint') {
      add('dbaeumer.vscode-eslint', 'lint', 'Repository uses ESLint.');
    }
    if (intelligence.ownership.formatter === 'prettier') {
      add('esbenp.prettier-vscode', 'format', 'Repository uses Prettier.', false);
    }
    if (intelligence.ownership.formatter === 'biome' || intelligence.ownership.linter === 'biome') {
      add('biomejs.biome', 'format/lint', 'Repository uses Biome.');
    }
  }

  if (stack.python) {
    add('ms-python.python', 'python-runtime', 'Python project detected.');
    add('ms-python.vscode-pylance', 'python-language', 'Python project detected.');
    add('ms-python.debugpy', 'python-debug', 'Python project detected.');
    if (intelligence.ownership.formatter === 'ruff' || intelligence.ownership.linter === 'ruff') {
      add('charliermarsh.ruff', 'python-format/lint', 'Repository uses Ruff.', false);
    }
  }

  if (stack.dotnet) {
    add('ms-dotnettools.csharp', 'csharp-language', '.NET/C# project detected.');
    add('ms-dotnettools.csdevkit', 'dotnet-project', '.NET/C# project detected.');
  }
  if (stack.rust) add('rust-lang.rust-analyzer', 'rust-language', 'Rust project detected.');
  if (stack.go) add('golang.go', 'go-language', 'Go project detected.');
  if (stack.java) add('redhat.java', 'java-language', 'Java project detected.');
  if (stack.powershell) add('ms-vscode.powershell', 'powershell-language', 'PowerShell files detected.');
  if (stack.terraform) add('hashicorp.terraform', 'terraform-language', 'Terraform files detected.');
  if (stack.ansible) add('redhat.ansible', 'ansible-language', 'Ansible project detected.');
  if (stack.docker) add('ms-azuretools.vscode-containers', 'containers', 'Container files detected.');
  if (stack.kubernetes) add('ms-kubernetes-tools.vscode-kubernetes-tools', 'kubernetes', 'Helm/Kubernetes project detected.');

  // YAML is broadly useful only when YAML-heavy project types are present.
  if (stack.ansible || stack.kubernetes || stack.docker) {
    add('redhat.vscode-yaml', 'yaml-language', 'YAML-based infrastructure/configuration detected.');
  }

  const seen = new Set();
  return plan.filter(item => !seen.has(item.id) && seen.add(item.id));
}

module.exports = { extensionPlan };
