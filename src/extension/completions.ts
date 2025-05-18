import * as vscode from 'vscode';
import { Kind, YAMLMapping } from 'yaml-ast-parser';
import { MistralHelper } from '../core/helpers';
import { getPath, getYAMLNodeAt, offsetAt } from './yamlUtils';

export class CompletionProvider implements vscode.CompletionItemProvider {
  private core = new MistralHelper();

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | vscode.CompletionList | undefined {
    const text = document.getText();
    const off = offsetAt(document, position);
    const node = getYAMLNodeAt(text, off);
    if (!node) { return; }

    const path = getPath(node);

    // 1) Workflow names
    if (path.length === 1 && path[0] === 'workflows') {
      const items = this.core.getWorkflowNames(text)
        .map(wf => new vscode.CompletionItem(wf, vscode.CompletionItemKind.Value));
      return items;
    }

    // 2) Task names under requires/on-success/etc.
    if (path.includes('requires')) {
      const wf = path[1];
      const items = this.core.getTaskNames(text, wf)
        .map(t => new vscode.CompletionItem(t, vscode.CompletionItemKind.Value));
      return items;
    }

    // 3) YAQL variables after "$."
    if (node.kind === Kind.SCALAR && node.value.startsWith('$.')) {
      const items = this.core.getDeclaredVariables(text)
        .map(v => {
          const it = new vscode.CompletionItem(v, vscode.CompletionItemKind.Variable);
          it.insertText = v;
          return it;
        });
      return items;
    }

    // 4) Mistral keys in task mapping key
    if (
      node.kind === Kind.SCALAR &&
      node.parent?.kind === Kind.MAPPING &&
      (node.parent as YAMLMapping).key === node &&
      path.includes('tasks')
    ) {
      const keys = ['action', 'workflow', 'publish', 'on-success', 'on-error', 'join', 'with-items'];
      return keys.map(k => new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword));
    }

    return;
  }
}