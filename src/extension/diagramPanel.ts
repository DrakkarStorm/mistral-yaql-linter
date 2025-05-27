import { spawnSync } from 'child_process';
import * as vscode from 'vscode';
import { generateDotFromYaml } from '../core/diagramGenerator';

/**
 * Manages the "Show Diagram" command: runs `dot` to produce SVG and displays it.
 */
export class DiagramManager {
  private panel?: vscode.WebviewPanel;

  constructor(private context: vscode.ExtensionContext) {
  }

  public async showDiagram() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'yaml') {
      return vscode.window.showWarningMessage(
        'Please open a Mistral YAML file to view its workflow diagram.'
      );
    }

    const yamlText = editor.document.getText();
    const dot = generateDotFromYaml(yamlText);

    let svg: string;
    try {
      svg = this.renderDotAsSvg(dot);
    } catch (err: any) {
      return vscode.window.showErrorMessage(err.message);
    }

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Two);
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'mistralDiagram',
        'Mistral Workflow Diagram',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: false },
        { enableScripts: false /* No scripts needed */ }
      );
      this.panel.onDidDispose(() => (this.panel = undefined), null, this.context.subscriptions);
    }

    // Inject the raw SVG into the Webview
    this.panel.webview.html = this.getWebviewContent(svg);

    return;
  }

  /**
   * Calls Graphviz CLI (`dot -Tsvg`) to convert DOT into SVG text.
   * Throws on error.
   */
  private renderDotAsSvg(dot: string): string {
    const result = spawnSync('dot', ['-Tsvg'], {
      input: dot,
      encoding: 'utf8'
    });

    if (result.error) {
      throw new Error(`Graphviz error: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`dot exited with code ${result.status}: ${result.stderr}`);
    }
    return result.stdout;
  }

  /**
   * Wraps the SVG into a minimal HTML page.
   */
  private getWebviewContent(svg: string): string {
    // Note: pas de CSP `script-src` nécessaire car on n'exécute aucun script
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mistral Workflow Diagram</title>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: auto; }
    svg { width: 100%; height: auto; }
  </style>
</head>
<body>
  ${svg}
</body>
</html>`;
  }
}