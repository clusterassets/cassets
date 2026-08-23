import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/integration/**/*.test.js",

  version: "stable",

  workspaceFolder: ".",

  mocha: {
    ui: "tdd",
    timeout: 20000,
    color: true,
  },

  launchArgs: ["--disable-telemetry"],
});
