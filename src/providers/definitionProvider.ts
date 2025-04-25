import * as yaml from 'js-yaml';
import * as vscode from 'vscode';

export class MistralDefinitionProvider implements vscode.DefinitionProvider {

  /**
   * Provide definition for a symbol in the document, typically for task references.
   * @param document The document in which the command was invoked.
   * @param position The position at which the command was invoked.
   * @param token A cancellation token.
   */
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.Definition | null {
    // Get the current word at the cursor position
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
      return null;
    }

    const word = document.getText(wordRange);

    // Check if we're on a task reference in an on-success, on-error, or on-complete section
    const lineText = document.lineAt(position.line).text;
    const isTaskReference = /(?:on-success|on-error|on-complete)\s*:.*?\b([\w-]+)\b/.test(lineText);

    if (isTaskReference) {
      return this.findTaskDefinition(document, word);
    }

    // Check if we're on a workflow reference
    const isWorkflowReference = /workflow\s*:.*?\b([\w-]+)\b/.test(lineText);

    if (isWorkflowReference) {
      return this.findWorkflowDefinition(document, word);
    }

    return null;
  }

  /**
   * Find the definition of a task in the document
   */
  private findTaskDefinition(document: vscode.TextDocument, taskName: string): vscode.Location | null {
    try {
      const docText = document.getText();
      const yamlDoc = yaml.load(docText) as any;

      if (!yamlDoc || typeof yamlDoc !== 'object' || !yamlDoc.workflows) {
        return null;
      }

      // Check all workflows for the task
      for (const [workflowName, workflow] of Object.entries(yamlDoc.workflows)) {
        if (typeof workflow !== 'object' || !Array.isArray((workflow as any).tasks)) {
          continue;
        }

        const tasks = (workflow as any).tasks;
        const taskIndex = tasks.findIndex((task: any) => task.name === taskName);

        if (taskIndex !== -1) {
          // Find the position of this task in the text
          const taskMatch = new RegExp(`(^|\\n)\\s*-\\s*name\\s*:\\s*${taskName}\\b`, 'm').exec(docText);

          if (taskMatch) {
            // Calculate line number
            const textBeforeMatch = docText.substring(0, taskMatch.index);
            const lines = textBeforeMatch.split('\n');
            const line = lines.length - 1;
            const character = lines[lines.length - 1].length;

            const position = new vscode.Position(line, character + taskMatch[0].indexOf(taskName));
            return new vscode.Location(document.uri, position);
          }
        }
      }
    } catch (error) {
      console.error('Error finding task definition:', error);
    }

    return null;
  }

  /**
   * Find the definition of a workflow in the document
   */
  private findWorkflowDefinition(document: vscode.TextDocument, workflowName: string): vscode.Location | null {
    try {
      const docText = document.getText();
      const yamlDoc = yaml.load(docText) as any;

      if (!yamlDoc || typeof yamlDoc !== 'object' || !yamlDoc.workflows) {
        return null;
      }

      // Check if the workflow exists
      if (!yamlDoc.workflows[workflowName]) {
        return null;
      }

      // Find the position of this workflow in the text
      const workflowMatch = new RegExp(`(^|\\n)\\s*${workflowName}\\s*:`, 'm').exec(docText);

      if (workflowMatch) {
        // Calculate line number
        const textBeforeMatch = docText.substring(0, workflowMatch.index);
        const lines = textBeforeMatch.split('\n');
        const line = lines.length - 1;
        const character = lines[lines.length - 1].length;

        const position = new vscode.Position(line, character + workflowMatch[0].indexOf(workflowName));
        return new vscode.Location(document.uri, position);
      }
    } catch (error) {
      console.error('Error finding workflow definition:', error);
    }

    return null;
  }
}