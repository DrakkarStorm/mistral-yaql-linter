import * as vscode from 'vscode';
import { Kind, YAMLMapping } from 'yaml-ast-parser';
import { mistralKeyDocs, yaqlFunctionDocs } from '../core/completionsData';
import { getYAMLNodeAt, offsetAt } from './yamlUtils';

/** Provides hover information for Mistral workflows. */
export class MistralHoverProvider implements vscode.HoverProvider {
  /**
   * Returns hover information for the given position.
   * @param document The document to provide hover information for.
   * @param position The position to provide hover information for.
   * @returns Hover information for the given position.
   */
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const text = document.getText();
    const off = offsetAt(document, position);
    const node = getYAMLNodeAt(text, off);
    if (!node) { return; }

    // 1) Hover YAQL function when inside a YAQL expression scalar
    if (node.kind === Kind.SCALAR) {
      const val = node.value.toString();
      const fnMatch = /([a-zA-Z_]\w*)\(/.exec(val);
      if (fnMatch) {
        const fn = fnMatch[1];
        const info = yaqlFunctionDocs[fn];
        if (info) {
          return new vscode.Hover(
            new vscode.MarkdownString(
              `**YAQL** \`${info.signature}\` ${info.documentation}`
            )
          );
        }
      }
    }

    // 2) Hover Mistral key when cursor is over mapping key scalar
    if (
      node.kind === Kind.SCALAR &&
      node.parent?.kind === Kind.MAPPING
    ) {
      const mapping = node.parent as YAMLMapping;
      if (mapping.key === node) {
        const key = mapping.key.value.toString();
        const docText = mistralKeyDocs[key];
        if (docText) {
          return new vscode.Hover(
            new vscode.MarkdownString(
              `**Mistral** \`${key}\` ${docText}`
            )
          );
        }
      }
    }

    return;
  }
}

