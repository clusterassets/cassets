const vscode = require("vscode");
const { detect } = require("./modules/detectors");
const { analyze } = require("./modules/intelligence");
const templates = require("./modules/templates");
const { defaultManifest, enabled } = require("./modules/policy");
const {
  exists,
  readJson,
  writeJson,
  readText,
  writeText,
  ensureDir,
  sha256,
} = require("./modules/utils");
const workspace = require("./modules/workspace");
const { extensionPlan } = require("./modules/capabilities");
const { evaluate } = require("./modules/health");
const prerequisites = require("./modules/prerequisites");
const workspaceGraphModule = require("./modules/workspace-graph");
const onboarding = require("./modules/onboarding");

function cassetsConfig() {
  return vscode.workspace.getConfiguration("cassets");
}

let healthStatusItem;

function intelligenceOptions() {
  const c = cassetsConfig();
  return {
    scanEnvironmentVariables: c.get(
      "intelligence.scanEnvironmentVariables",
      true,
    ),
    maxEnvironmentFiles: c.get("intelligence.maxEnvironmentFiles", 120),
  };
}

async function inspectFolder(folder) {
  const stack = await detect(folder);
  const intelligence = cassetsConfig().get("intelligence.enabled", true)
    ? await analyze(folder, stack, intelligenceOptions())
    : {
        runtime: {},
        tools: {
          node: { test: [], lint: [], format: [], build: [] },
          monorepo: { detected: false, workspaces: [], tools: [] },
        },
        ownership: { formatter: null, linter: null, test: [] },
        environmentVariables: [],
        summary: {
          monorepo: false,
          monorepoTools: [],
          testFrameworks: [],
          formatter: null,
          linter: null,
        },
      };
  return { stack, intelligence };
}

async function fullInspection(folder, checkPrerequisites = false) {
  const { stack, intelligence } = await inspectFolder(folder);
  const workspaceGraph = cassetsConfig().get("workspaceGraph.enabled", true)
    ? await workspaceGraphModule.analyze(
        folder,
        stack,
        intelligence,
        cassetsConfig().get("workspaceGraph.maxPackages", 200),
      )
    : {
        detected: false,
        packages: [],
        graph: { nodes: [], edges: [], outgoing: {} },
        topo: { order: [], cyclic: false },
        truncated: false,
      };

  const prereqResult = checkPrerequisites
    ? await prerequisites.evaluate(stack, intelligence)
    : null;

  return { stack, intelligence, workspaceGraph, prerequisites: prereqResult };
}

async function getManifest(folder, stack, create) {
  const uri = vscode.Uri.joinPath(folder.uri, ".cassets.json");
  const existing = await readJson(uri);
  if (existing) return { uri, manifest: existing };
  const manifest = defaultManifest(stack);
  manifest.schemaVersion = 2;
  if (create) await writeJson(uri, manifest);
  return { uri, manifest };
}

async function stateFor(folder) {
  const uri = vscode.Uri.joinPath(folder.uri, ".vscode", "cassets.state.json");
  const state = (await readJson(uri)) || {
    version: 2,
    generated: {},
    dismissed: [],
  };
  return { uri, state };
}

function templateSettings() {
  const c = cassetsConfig();
  return {
    gitignore: c.get("templates.gitignore", true),
    editorconfig: c.get("templates.editorconfig", true),
    gitattributes: c.get("templates.gitattributes", true),
    envExample: c.get("templates.envExample", "auto"),
    npmignore: c.get("templates.npmignore", "auto"),
    githubCi: c.get("templates.githubCi", "auto"),
    contributing: c.get("templates.contributing", false),
    agents: c.get("templates.agents", "auto"),
  };
}

async function initializeFile(
  folder,
  state,
  kind,
  relativePath,
  content,
  restore,
) {
  const uri = vscode.Uri.joinPath(folder.uri, ...relativePath.split("/"));
  const generated = state.generated?.[kind];

  if (generated && !(await exists(uri)) && !restore) {
    state.dismissed = [...new Set([...(state.dismissed || []), kind])];
    return false;
  }
  if ((state.dismissed || []).includes(kind) && !restore) return false;
  if (await exists(uri)) return false;

  const parent = relativePath.split("/").slice(0, -1);
  if (parent.length)
    await ensureDir(vscode.Uri.joinPath(folder.uri, ...parent));

  await writeText(uri, content);
  state.generated ||= {};
  state.generated[kind] = {
    path: relativePath,
    ownership: "initialized",
    sha256: sha256(content),
    createdAt: new Date().toISOString(),
  };
  state.dismissed = (state.dismissed || []).filter((x) => x !== kind);
  return true;
}

async function applyBaseline(
  folder,
  stack,
  intelligence,
  manifest,
  restore = false,
) {
  const { uri: stateUri, state } = await stateFor(folder);
  const settings = templateSettings();
  let changed = false;

  const items = [
    ["gitignore", ".gitignore", templates.gitignore(stack)],
    ["editorconfig", ".editorconfig", templates.editorconfig()],
    ["gitattributes", ".gitattributes", templates.gitattributes()],
    [
      "envExample",
      ".env.example",
      templates.envExample(intelligence.environmentVariables),
    ],
    ["npmignore", ".npmignore", templates.npmignore()],
    ["contributing", "CONTRIBUTING.md", templates.contributing(stack)],
    ["agents", "AGENTS.md", templates.agents(stack)],
  ];

  for (const [kind, path, content] of items) {
    if (enabled(kind, stack, manifest, settings)) {
      changed =
        (await initializeFile(folder, state, kind, path, content, restore)) ||
        changed;
    }
  }

  const ci = templates.ci(stack);
  if (ci && enabled("githubCi", stack, manifest, settings)) {
    changed =
      (await initializeFile(
        folder,
        state,
        "githubCi",
        ".github/workflows/ci.yml",
        ci,
        restore,
      )) || changed;
  }

  state.version = 2;
  state.lastScan = new Date().toISOString();
  state.detected = {
    node: stack.node,
    python: stack.python,
    dotnet: stack.dotnet,
    rust: stack.rust,
    go: stack.go,
    java: stack.java,
    docker: stack.docker,
    terraform: stack.terraform,
    ansible: stack.ansible,
    kubernetes: stack.kubernetes,
  };
  state.intelligence = {
    runtime: intelligence.runtime,
    summary: intelligence.summary,
    environmentVariables: intelligence.environmentVariables,
  };
  await writeJson(stateUri, state);
  return changed;
}

async function bootstrapFolder(
  folder,
  { restore = false, explicit = false } = {},
) {
  const { stack, intelligence } = await inspectFolder(folder);
  if (!vscode.workspace.isTrusted)
    return { folder, stack, intelligence, restricted: true, changed: false };

  const mode = cassetsConfig().get("mode", "review");
  if (!explicit && mode !== "auto") {
    await updateHealthStatus(folder, stack, intelligence);
    return { folder, stack, intelligence, restricted: false, changed: false };
  }

  const dotVscode = vscode.Uri.joinPath(folder.uri, ".vscode");
  await ensureDir(dotVscode);
  let changed = false;

  await workspace.applyFolderSettings(folder, stack, intelligence);

  const taskMode = cassetsConfig().get("tasks.mode", "auto");
  const taskUri = vscode.Uri.joinPath(dotVscode, "tasks.json");
  if (!(await exists(taskUri)) && taskMode !== "none") {
    await writeJson(taskUri, workspace.tasks(stack, intelligence, taskMode));
    changed = true;
  }

  const debugMode = cassetsConfig().get("debug.mode", "auto");
  const launchUri = vscode.Uri.joinPath(dotVscode, "launch.json");
  if (!(await exists(launchUri)) && debugMode !== "none") {
    await writeJson(
      launchUri,
      workspace.launch(stack, intelligence, debugMode),
    );
    changed = true;
  }

  changed =
    (await workspace.mergeRecommendations(
      vscode.Uri.joinPath(dotVscode, "extensions.json"),
      workspace.recommendations(stack, intelligence),
    )) || changed;

  const { manifest } = await getManifest(folder, stack, true);
  changed =
    (await applyBaseline(folder, stack, intelligence, manifest, restore)) ||
    changed;

  if (cassetsConfig().get("mcp.enabled", false)) {
    const mcpUri = vscode.Uri.joinPath(dotVscode, "mcp.json");
    if (!(await exists(mcpUri))) {
      await writeJson(mcpUri, { servers: {} });
      changed = true;
    }
  }

  await updateHealthStatus(folder, stack, intelligence);
  return { folder, stack, intelligence, restricted: false, changed };
}

async function bootstrapAll(options = {}) {
  if (!cassetsConfig().get("enabled", true)) return [];
  const results = [];
  for (const folder of vscode.workspace.workspaceFolders || []) {
    try {
      results.push(await bootstrapFolder(folder, options));
    } catch (error) {
      console.error("[CAssets] bootstrap failure", error);
      vscode.window.showWarningMessage(
        `CAssets could not configure ${folder.name}: ${error.message || error}`,
      );
    }
  }
  if (
    cassetsConfig().get("notifications", true) &&
    results.some((r) => r.changed)
  ) {
    vscode.window.setStatusBarMessage("$(tools) CAssets workspace ready", 4000);
  }
  return results;
}

let consentPromptActive = false;

async function firstRunConsent(context) {
  if (consentPromptActive) {
    return;
  }

  if (
    !vscode.workspace.workspaceFolders?.length ||
    !vscode.workspace.isTrusted
  ) {
    return;
  }

  if (context.globalState.get("cassets.consent.v1")) {
    return;
  }

  consentPromptActive = true;

  try {
    const choice = await vscode.window.showInformationMessage(
      "CAssets DevReady can understand this repository and prepare missing professional workspace files without overwriting existing developer configuration.",
      "Apply Recommended",
      "Observe Only",
      "Not Now",
    );

    if (choice === "Apply Recommended") {
      await vscode.workspace
        .getConfiguration("cassets")
        .update("mode", "auto", vscode.ConfigurationTarget.Global);

      await context.globalState.update("cassets.consent.v1", "auto");

      await bootstrapAll({
        explicit: true,
      });
    } else if (choice === "Observe Only") {
      await vscode.workspace
        .getConfiguration("cassets")
        .update("mode", "observe", vscode.ConfigurationTarget.Global);

      await context.globalState.update("cassets.consent.v1", "observe");
    }

    // "Not Now" intentionally stores nothing.
  } finally {
    consentPromptActive = false;
  }
}

async function updateHealthStatus(folder, stack, intelligence) {
  if (!healthStatusItem || !cassetsConfig().get("health.showStatusBar", true))
    return;
  try {
    const h = await evaluate(folder, stack, intelligence);
    healthStatusItem.text = `$(pulse) CAssets ${h.score}`;
    healthStatusItem.tooltip = `CAssets Project Health: ${h.score}/100 — click for details`;
    healthStatusItem.command = "cassets.projectHealth";
    healthStatusItem.show();
  } catch {}
}

async function projectHealth() {
  for (const folder of vscode.workspace.workspaceFolders || []) {
    const checked = await fullInspection(folder, true);
    const {
      stack,
      intelligence,
      workspaceGraph,
      prerequisites: prereqResult,
    } = checked;
    const h = await evaluate(
      folder,
      stack,
      intelligence,
      prereqResult,
      workspaceGraph,
    );

    const items = [
      {
        label: `$(pulse) Overall ${h.score}/100`,
        description: `${folder.name}`,
        alwaysShow: true,
      },
      ...Object.entries(h.categories)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, category]) => ({
          label: `${category.score === 100 ? "$(check)" : "$(warning)"} ${name}`,
          description: `${category.score}/100`,
          detail:
            category.checks
              .filter((c) => !c.ok)
              .map((c) => `Missing: ${c.name}`)
              .join(" • ") || "Ready",
        })),
    ];

    const picked = await vscode.window.showQuickPick(items, {
      title: `CAssets Project Health — ${folder.name}`,
      placeHolder:
        "Select nothing to close. Apply recommended setup from the Command Palette when desired.",
    });
    if (picked && h.score < 100) {
      const action = await vscode.window.showInformationMessage(
        `CAssets Project Health is ${h.score}/100. Apply safe missing workspace baselines?`,
        "Apply Recommended",
        "Not Now",
      );
      if (action === "Apply Recommended")
        await bootstrapFolder(folder, { explicit: true });
    }
  }
}

function formatRuntime(runtime) {
  return Object.entries(runtime || {})
    .map(([key, value]) => {
      if (value && typeof value === "object") {
        return `${key}: ${value.name || ""}${value.version ? "@" + value.version : ""}`;
      }
      return value ? `${key}: ${value}` : null;
    })
    .filter(Boolean);
}

async function showIntelligence() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const { stack, intelligence } = await inspectFolder(folder);

  const lines = [
    `Repository: ${folder.name}`,
    ...formatRuntime(intelligence.runtime),
    `Monorepo: ${intelligence.summary.monorepo ? "yes" : "no"}`,
    intelligence.summary.monorepoTools.length
      ? `Monorepo tools: ${intelligence.summary.monorepoTools.join(", ")}`
      : null,
    intelligence.summary.testFrameworks.length
      ? `Tests: ${intelligence.summary.testFrameworks.join(", ")}`
      : null,
    intelligence.ownership.formatter
      ? `Formatter: ${intelligence.ownership.formatter}`
      : null,
    intelligence.ownership.linter
      ? `Linter: ${intelligence.ownership.linter}`
      : null,
    intelligence.environmentVariables.length
      ? `Environment variables: ${intelligence.environmentVariables.length} detected`
      : null,
  ].filter(Boolean);

  await vscode.window.showQuickPick(
    lines.map((line) => ({ label: line })),
    {
      title: "CAssets Project Intelligence",
      placeHolder:
        "Detected from repository configuration; no repository content is uploaded.",
    },
  );
}

async function showEnvironmentVariables() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const { intelligence } = await inspectFolder(folder);

  if (!intelligence.environmentVariables.length) {
    vscode.window.showInformationMessage(
      "CAssets: no environment-variable references detected in the bounded scan.",
    );
    return;
  }

  await vscode.window.showQuickPick(
    intelligence.environmentVariables.map((name) => ({ label: name })),
    {
      title: `CAssets Environment Variables — ${intelligence.environmentVariables.length} detected`,
      placeHolder:
        "Names only. CAssets does not collect environment-variable values.",
    },
  );
}

async function refreshEnvExample() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder || !vscode.workspace.isTrusted) return;
  const { intelligence } = await inspectFolder(folder);
  const uri = vscode.Uri.joinPath(folder.uri, ".env.example");
  const proposed = templates.envExample(intelligence.environmentVariables);

  if (!(await exists(uri))) {
    await writeText(uri, proposed);
    vscode.window.showInformationMessage(
      `CAssets created .env.example with ${intelligence.environmentVariables.length} detected variable name(s).`,
    );
    return;
  }

  const existing = await readText(uri);
  const existingNames = new Set(
    existing
      .split(/\r?\n/)
      .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
      .filter(Boolean),
  );
  const missing = intelligence.environmentVariables.filter(
    (name) => !existingNames.has(name),
  );

  if (!missing.length) {
    vscode.window.showInformationMessage(
      "CAssets: .env.example already covers all detected variable names.",
    );
    return;
  }

  const action = await vscode.window.showInformationMessage(
    `CAssets detected ${missing.length} variable name(s) missing from .env.example. Append names without values?`,
    "Append",
    "Cancel",
  );
  if (action === "Append") {
    await writeText(
      uri,
      existing.replace(/\s*$/, "\n") +
        missing.map((name) => `${name}=`).join("\n") +
        "\n",
    );
    vscode.window.showInformationMessage(
      `CAssets appended ${missing.length} environment-variable name(s).`,
    );
  }
}

async function checkPrerequisites() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const { stack, intelligence } = await inspectFolder(folder);
  const result = await prerequisites.evaluate(stack, intelligence);

  const items = result.checks.map((check) => ({
    label: `${check.available ? "$(check)" : check.required ? "$(error)" : "$(warning)"} ${check.label}`,
    description: check.available
      ? check.version || "available"
      : check.required
        ? "required and missing"
        : "optional and missing",
    detail: check.reason,
  }));

  await vscode.window.showQuickPick(items, {
    title: `CAssets Developer Prerequisites — ${result.ready ? "Ready" : `${result.missingRequired.length} missing`}`,
    placeHolder:
      "CAssets checks availability only. It does not install tools automatically.",
  });
}

async function showWorkspaceGraph() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const { stack, intelligence } = await inspectFolder(folder);
  const graph = await workspaceGraphModule.analyze(
    folder,
    stack,
    intelligence,
    cassetsConfig().get("workspaceGraph.maxPackages", 200),
  );

  if (!graph.detected) {
    vscode.window.showInformationMessage(
      "CAssets: no supported workspace/monorepo package graph detected.",
    );
    return;
  }

  const items = graph.packages.map((pkg) => {
    const deps = graph.graph.outgoing[pkg.name || pkg.path] || [];
    return {
      label: `$(package) ${pkg.name || pkg.path}`,
      description: pkg.path,
      detail: deps.length
        ? `Workspace dependencies: ${deps.join(", ")}`
        : "No internal workspace dependencies detected",
    };
  });

  await vscode.window.showQuickPick(items, {
    title: `CAssets Workspace Graph — ${graph.packages.length} package(s)${graph.topo.cyclic ? " • cycle detected" : ""}`,
    placeHolder: graph.truncated
      ? "Package scan reached configured limit."
      : "Select a package to inspect its internal dependencies.",
  });
}

async function showOnboarding() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const inspected = await fullInspection(folder, true);
  const guide = onboarding.buildGuide(
    folder.name,
    inspected.stack,
    inspected.intelligence,
    inspected.prerequisites,
    inspected.workspaceGraph,
  );

  const items = [];
  if (!guide.ready) {
    for (const missing of guide.missingPrerequisites) {
      items.push({
        label: `$(error) Missing: ${missing.label}`,
        description: missing.command,
        detail: missing.reason,
      });
    }
  }

  for (const cmd of guide.commands) {
    items.push({
      label: `$(terminal) ${cmd.kind}`,
      description: cmd.command,
      detail: `Confidence: ${cmd.confidence}`,
    });
  }

  await vscode.window.showQuickPick(items, {
    title: `CAssets Contributor Onboarding — ${guide.ready ? "Prerequisites ready" : "Setup required"}`,
    placeHolder: guide.firstSuccess
      ? `Suggested first success: ${guide.firstSuccess.command}`
      : "No safe run command inferred.",
  });
}

async function howToRun() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const inspected = await fullInspection(folder, true);
  const guide = onboarding.buildGuide(
    folder.name,
    inspected.stack,
    inspected.intelligence,
    inspected.prerequisites,
    inspected.workspaceGraph,
  );

  if (!guide.ready) {
    const missing = guide.missingPrerequisites.map((x) => x.label).join(", ");
    vscode.window.showWarningMessage(
      `CAssets: install/activate required prerequisites first: ${missing}.`,
    );
    return;
  }

  if (!guide.firstSuccess) {
    vscode.window.showInformationMessage(
      "CAssets could not infer a safe first-run command. Check the repository README.",
    );
    return;
  }

  const action = await vscode.window.showInformationMessage(
    `Suggested first successful run: ${guide.firstSuccess.command}`,
    "Copy Command",
    "Run in Terminal",
    "Show Full Onboarding",
  );

  if (action === "Copy Command") {
    await vscode.env.clipboard.writeText(guide.firstSuccess.command);
  } else if (action === "Run in Terminal") {
    const terminal = vscode.window.createTerminal({
      name: "CAssets",
      cwd: folder.uri.fsPath,
    });
    terminal.show();
    terminal.sendText(guide.firstSuccess.command, false);
  } else if (action === "Show Full Onboarding") {
    await showOnboarding();
  }
}

async function runRecommended() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;

  const inspected = await fullInspection(folder, true);
  if (!inspected.prerequisites.ready) {
    vscode.window.showWarningMessage(
      'CAssets: required developer prerequisites are missing. Run "CAssets: Check Developer Prerequisites".',
    );
    return;
  }

  const commands = onboarding.recommendCommands(
    inspected.stack,
    inspected.intelligence,
    inspected.prerequisites,
  );
  if (!commands.length) {
    vscode.window.showInformationMessage(
      "CAssets: no safe recommended repository command was inferred.",
    );
    return;
  }

  const preferDev = cassetsConfig().get("recommendedTask.preferDev", true);
  const recommended =
    (preferDev ? commands.find((x) => x.kind === "dev") : null) ||
    commands.find((x) => x.kind === "test") ||
    commands.find((x) => x.kind === "build") ||
    commands[0];

  const approved = await vscode.window.showInformationMessage(
    `Run "${recommended.command}" in the integrated terminal?`,
    "Run",
    "Cancel",
  );

  if (approved === "Run") {
    const terminal = vscode.window.createTerminal({
      name: "CAssets Recommended",
      cwd: folder.uri.fsPath,
    });
    terminal.show();
    terminal.sendText(recommended.command, true);
  }
}

async function showStack() {
  const summaries = [];
  for (const folder of vscode.workspace.workspaceFolders || []) {
    const { stack, intelligence } = await inspectFolder(folder);
    const active = Object.entries(stack)
      .filter(([k, v]) => typeof v === "boolean" && v)
      .map(([k]) => k);
    if (stack.node)
      active.push(
        `package-manager:${intelligence.runtime?.packageManager?.name || stack.packageManager}`,
      );
    if (intelligence.summary.monorepo) active.push("monorepo");
    summaries.push(
      `${folder.name}: ${active.join(", ") || "generic workspace"}`,
    );
  }
  vscode.window.showInformationMessage(
    summaries.length
      ? summaries.join(" | ")
      : "CAssets: no workspace folder open.",
  );
}

async function openManifest() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const { stack } = await inspectFolder(folder);
  const { uri } = await getManifest(folder, stack, true);
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}

async function extensionAudit() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const { stack, intelligence } = await inspectFolder(folder);
  const plan = extensionPlan(stack, intelligence);
  const missing = plan.filter(
    (item) => !vscode.extensions.getExtension(item.id),
  );
  const installed = plan.filter(
    (item) => !!vscode.extensions.getExtension(item.id),
  );

  const items = [
    ...missing.map((item) => ({
      label: `$(add) ${item.id}`,
      description: item.capability,
      detail: `Recommended: ${item.reason}`,
    })),
    ...installed.map((item) => ({
      label: `$(check) ${item.id}`,
      description: item.capability,
      detail: `Installed: ${item.reason}`,
    })),
  ];

  if (!items.length) {
    vscode.window.showInformationMessage(
      "CAssets Extension Audit: no additional language/tool extension is required for the detected stack.",
    );
    return;
  }

  await vscode.window.showQuickPick(items, {
    title: "CAssets Extension Capability Audit",
    placeHolder: `${missing.length} recommended extension(s) not currently installed. CAssets never silently installs or uninstalls extensions.`,
  });
}

async function setUser(key, value, force = false) {
  try {
    const config = vscode.workspace.getConfiguration();
    const inspected = config.inspect(key);
    if (force || !inspected || inspected.globalValue === undefined) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  } catch (error) {
    console.warn(`[CAssets] skipped user setting ${key}`, error);
  }
}

async function applyProfessionalSettings() {
  const settings = [
    ["editor.smoothScrolling", true],
    ["editor.cursorSmoothCaretAnimation", "on"],
    ["editor.cursorBlinking", "phase"],
    ["editor.renderControlCharacters", true],
    ["editor.bracketPairColorization.enabled", true],
    ["editor.guides.bracketPairs", "active"],
    ["editor.linkedEditing", true],
    ["editor.autoIndent", "full"],
    ["editor.acceptSuggestionOnEnter", "off"],
    ["editor.acceptSuggestionOnCommitCharacter", false],
    ["editor.suggestSelection", "recentlyUsedByPrefix"],
    ["editor.stickyScroll.enabled", true],
    ["editor.minimap.enabled", false, true],
    ["editor.largeFileOptimizations", true, true],
    ["editor.definitionLinkOpensInPeek", true],
    ["editor.gotoLocation.multipleDefinitions", "peek"],
    ["editor.gotoLocation.multipleImplementations", "peek"],
    ["editor.gotoLocation.multipleReferences", "peek"],
    ["editor.tabCompletion", "on"],
    ["editor.suggest.preview", true],
    ["editor.inlineSuggest.enabled", true],
    ["workbench.editor.enablePreview", false],
    ["workbench.editor.enablePreviewFromQuickOpen", false],
    ["window.restoreWindows", "all"],
    ["explorer.compactFolders", false],
    ["files.autoSave", "onFocusChange"],
    ["files.trimTrailingWhitespace", true],
    ["files.insertFinalNewline", true],
    ["search.followSymlinks", false],
    ["search.smartCase", true],
    ["terminal.integrated.shellIntegration.enabled", true],
    ["terminal.integrated.enableMultiLinePasteWarning", "auto"],
    ["terminal.integrated.persistentSessionReviveProcess", "onExit"],
    ["terminal.integrated.scrollback", 20000],
    ["debug.onTaskErrors", "showErrors"],
    ["diffEditor.renderSideBySide", true],
    ["security.workspace.trust.untrustedFiles", "prompt", true],
  ];
  for (const [key, value, force] of settings)
    await setUser(key, value, !!force);
  vscode.window.showInformationMessage(
    "CAssets professional user settings applied. Existing explicit user choices are preserved where possible.",
  );
}

function debounce(fn, ms = 1000) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function registerWatcher(context) {
  if (!cassetsConfig().get("autoRescan", true)) return;
  const watcher = vscode.workspace.createFileSystemWatcher(
    "**/{package.json,pnpm-workspace.yaml,pnpm-lock.yaml,yarn.lock,bun.lockb,package-lock.json,.nvmrc,.node-version,.python-version,pyproject.toml,requirements.txt,global.json,Cargo.toml,rust-toolchain,rust-toolchain.toml,go.mod,pom.xml,build.gradle,build.gradle.kts,turbo.json,nx.json,lerna.json,*.sln,*.csproj,Dockerfile,compose*.yml,compose*.yaml,docker-compose*.yml,docker-compose*.yaml,*.tf,ansible.cfg,playbook*.yml,playbook*.yaml,Chart.yaml,.env,.env.local}",
  );
  const rescan = debounce(() => bootstrapAll());
  watcher.onDidCreate(rescan);
  watcher.onDidChange(rescan);
  watcher.onDidDelete(rescan);
  context.subscriptions.push(watcher);
}

async function activate(context) {
  healthStatusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    20,
  );
  context.subscriptions.push(healthStatusItem);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "cassets.applyProfessionalSettings",
      applyProfessionalSettings,
    ),
    vscode.commands.registerCommand("cassets.bootstrapWorkspace", () =>
      bootstrapAll({ explicit: true }),
    ),
    vscode.commands.registerCommand("cassets.restoreTemplates", () =>
      bootstrapAll({ explicit: true, restore: true }),
    ),
    vscode.commands.registerCommand("cassets.rescanWorkspace", () =>
      bootstrapAll(),
    ),
    vscode.commands.registerCommand("cassets.projectHealth", projectHealth),
    vscode.commands.registerCommand("cassets.showStack", showStack),
    vscode.commands.registerCommand("cassets.openManifest", openManifest),
    vscode.commands.registerCommand("cassets.extensionAudit", extensionAudit),
    vscode.commands.registerCommand(
      "cassets.showIntelligence",
      showIntelligence,
    ),
    vscode.commands.registerCommand(
      "cassets.showEnvironmentVariables",
      showEnvironmentVariables,
    ),
    vscode.commands.registerCommand(
      "cassets.refreshEnvExample",
      refreshEnvExample,
    ),
    vscode.commands.registerCommand("cassets.howToRun", howToRun),
    vscode.commands.registerCommand(
      "cassets.checkPrerequisites",
      checkPrerequisites,
    ),
    vscode.commands.registerCommand(
      "cassets.showWorkspaceGraph",
      showWorkspaceGraph,
    ),
    vscode.commands.registerCommand("cassets.runRecommended", runRecommended),
    vscode.commands.registerCommand("cassets.showOnboarding", showOnboarding),
    vscode.workspace.onDidChangeWorkspaceFolders(() => bootstrapAll()),
    vscode.workspace.onDidGrantWorkspaceTrust(() => firstRunConsent(context)),
  );

  registerWatcher(context);

  /*
   * Never block extension activation on interactive first-run UI.
   *
   * This is important for:
   * - GitHub Actions
   * - VS Code Extension Host tests
   * - remote environments
   * - unattended workspaces
   * - slow startup environments
   */
  void firstRunConsent(context).catch((error) => {
    console.error("[CAssets] first-run consent failed", error);
  });

  /*
   * Passive bootstrap is safe here.
   *
   * In review/observe mode it performs detection without
   * blindly mutating repository-owned configuration.
   */
  try {
    await bootstrapAll();
  } catch (error) {
    console.error("[CAssets] initial workspace scan failed", error);
  }

  const folder = vscode.workspace.workspaceFolders?.[0];

  if (folder && vscode.workspace.isTrusted) {
    try {
      const { stack, intelligence } = await inspectFolder(folder);

      await updateHealthStatus(folder, stack, intelligence);

      if (cassetsConfig().get("prerequisites.checkOnOpen", false)) {
        const result = await prerequisites.evaluate(stack, intelligence);

        if (!result.ready && cassetsConfig().get("notifications", true)) {
          vscode.window.setStatusBarMessage(
            `$(warning) CAssets: ${result.missingRequired.length} prerequisite(s) missing`,
            6000,
          );
        }
      }
    } catch (error) {
      console.error("[CAssets] startup intelligence failed", error);
    }
  }
}

function deactivate() {}
module.exports = { activate, deactivate };
