// src/extension/signatureProvider.ts
import * as vscode from 'vscode';
import { yaqlFunctionDocs } from '../core/completionsData';

/**
 * Precompute SignatureInformation for each YAQL function.
 */
const signatureInfos: Record<string, vscode.SignatureInformation> = Object.entries(
  yaqlFunctionDocs
).reduce((acc, [fn, { signature, documentation }]) => {
  acc[fn] = new vscode.SignatureInformation(
    signature,
    new vscode.MarkdownString(documentation)
  );
  return acc;
}, {} as Record<string, vscode.SignatureInformation>);

/**
 * Provides signature help for YAQL functions when typing within `<% ... %>`.
 */
export class YaqlSignatureProvider implements vscode.SignatureHelpProvider {
  provideSignatureHelp(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.SignatureHelp> {
    // Get the text on the current line up to the cursor
    const lineText = document.lineAt(position.line).text.substring(0, position.character);

    // Only trigger inside a YAQL tag
    if (!/<%[^%]*$/.test(lineText)) {
      return;
    }

    // Match function name before the last '('
    const fnMatch = /([a-zA-Z_]\w*)\($/.exec(lineText);
    if (!fnMatch) {
      return;
    }
    const fn = fnMatch[1];

    // Lookup the precomputed signature info
    const sigInfo = signatureInfos[fn];
    if (!sigInfo) {
      return;
    }

    // Build and return SignatureHelp
    const help = new vscode.SignatureHelp();
    help.signatures = [sigInfo];
    help.activeSignature = 0;
    help.activeParameter = 0;
    return help;
  }
}