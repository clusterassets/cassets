const assert = require("node:assert/strict");
const vscode = require("vscode");

suite("CAssets Extension", function () {
  let extension;

  suiteSetup(async function () {
    this.timeout(20000);

    extension = vscode.extensions.getExtension("clusterassets.cassets");

    assert.ok(extension, "clusterassets.cassets should be discoverable");

    await extension.activate();
  });

  test("extension is discoverable", function () {
    assert.ok(extension);
  });

  test("extension is active", function () {
    assert.equal(extension.isActive, true);
  });

  test("commands are registered", async function () {
    this.timeout(10000);

    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "cassets.applyProfessionalSettings",
      "cassets.bootstrapWorkspace",
      "cassets.restoreTemplates",
      "cassets.rescanWorkspace",
      "cassets.projectHealth",
      "cassets.showStack",
      "cassets.openManifest",
      "cassets.extensionAudit",

      "cassets.showIntelligence",
      "cassets.showEnvironmentVariables",
      "cassets.refreshEnvExample",

      "cassets.howToRun",
      "cassets.checkPrerequisites",
      "cassets.showWorkspaceGraph",
      "cassets.runRecommended",
      "cassets.showOnboarding",
    ];

    for (const command of expectedCommands) {
      assert.ok(
        commands.includes(command),
        `Expected command to be registered: ${command}`,
      );
    }
  });
});
