'use strict';
const vscode = require('vscode');

const ACTIONS = [
  ['Architecture Explorer', 'cassets.architectureExplorer', 'type-hierarchy', 'Inspect source dependencies and evidence'],
  ['Project Overview', 'cassets.projectUnderstanding', 'project', 'Understand the current workspace'],
  ['Workspace Doctor', 'cassets.runWorkspaceDoctor', 'pulse', 'Inspect workspace readiness'],
  ['Workspace Package Graph', 'cassets.showWorkspaceGraph', 'references', 'Explore package relationships'],
  ['How to Run', 'cassets.howToRun', 'play', 'Find supported development commands']
];

class CodeSightSidebarProvider {
  getTreeItem(item) { return item; }
  getChildren() {
    return ACTIONS.map(([label, command, icon, description]) => {
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.iconPath = new vscode.ThemeIcon(icon);
      item.tooltip = description;
      item.description = '';
      item.command = { command, title: label };
      return item;
    });
  }
}
module.exports = { CodeSightSidebarProvider };
