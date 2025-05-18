import * as vscode from 'vscode';
import { CompletionProvider } from '../src/extension/completions';
import { MistralHoverProvider } from '../src/extension/hoverProvider';
import { YaqlSignatureProvider } from '../src/extension/signatureProvider';



describe('Provider Unit Tests', () => {
  // Stub minimal of a TextDocument
  const text = `---
version: '2.0'
workflows:
  wf1:
    tasks:
      t1:
        action: std.echo output="<% $.input %>"
`;
  const doc = {
    getText: () => text,
    languageId: 'yaml',
    uri: vscode.Uri.file('test.yaml'),
    lineAt: (n: number) => ({ text: text.split('\n')[n] } as any),
    offsetAt: (pos: vscode.Position) => {
      const lines = text.split('\n');
      let off = 0;
      for (let i = 0; i < pos.line; i++) {
        off += lines[i].length + 1; // +1 for the'\n'
      }
      return off + pos.character;
    }
  } as unknown as vscode.TextDocument;

  it('CompletionProvider propose workflow names', async () => {
    const provider = new CompletionProvider();
    const pos = new vscode.Position(2, 4);

    const result = await provider.provideCompletionItems(doc, pos);

    const items: vscode.CompletionItem[] = Array.isArray(result)
      ? result
      : result instanceof vscode.CompletionList
        ? result.items
        : [];

    // Maintenant on peut tester en toute sécurité
    const labels = items.map(i => i.label);
    expect(labels).toContain('wf1');
  });

  it('HoverProvider display doc for action key', async () => {
    const hoverProv = new MistralHoverProvider();
    // position on “action”
    const pos = new vscode.Position(4, 8);
    const hover = await hoverProv.provideHover(doc, pos);
    expect(hover).toBeDefined();
    const content = hover!.contents;
    if (content instanceof vscode.MarkdownString) {
      expect(content.value).toMatch(/\*\*Mistral\*\* `tasks`/);
    }
  });

  it('SignatureProvider propose map() signature', async () => {
    const sigProv = new YaqlSignatureProvider();

    // stub minimal of a TextDocument containing ONLY "<% map("
    const doc2 = {
      getText: () => '<% map(',
      languageId: 'yaml',
      uri: vscode.Uri.file('test.yaml'),

      // We override lineAt to return a line containing "<% map("
      lineAt: (_: number) => ({ text: '<% map(' } as any),

      // offsetAt is not used by the provider, but if you call yamlUtils.offsetAt :
      offsetAt: (pos: vscode.Position) => {
        return pos.character;
      }
    } as unknown as vscode.TextDocument;

    const pos = new vscode.Position(0, '<% map('.length);
    const help = await sigProv.provideSignatureHelp(doc2, pos);

    expect(help).toBeDefined();
    expect(help!.signatures[0].label).toBe('map(list, func)');
  });
});