function defaultManifest(stack) {
  return {
    version: 1,
    profile: 'professional',
    templates: {
      gitignore: true,
      editorconfig: true,
      gitattributes: true,
      envExample: 'auto',
      npmignore: 'auto',
      githubCi: 'auto',
      contributing: false,
      agents: 'auto'
    },
    dismissed: [],
    detectedAtCreation: {
      node: stack.node,
      python: stack.python,
      dotnet: stack.dotnet,
      rust: stack.rust,
      go: stack.go,
      java: stack.java,
      docker: stack.docker,
      terraform: stack.terraform,
      ansible: stack.ansible,
      kubernetes: stack.kubernetes
    }
  };
}

function enabled(kind, stack, manifest, settings) {
  if ((manifest.dismissed || []).includes(kind)) return false;
  const value = manifest.templates?.[kind] ?? settings[kind];

  if (value === true || value === 'always') return true;
  if (value === false || value === 'never') return false;

  if (kind === 'envExample') return !!stack.envDetected;
  if (kind === 'npmignore') return !!stack.publishableNpm;
  if (kind === 'githubCi') return !!(stack.node || stack.python || stack.dotnet || stack.rust || stack.go);
  if (kind === 'agents') return !!(stack.node || stack.python || stack.dotnet || stack.rust || stack.go || stack.java);
  return false;
}

module.exports = { defaultManifest, enabled };
