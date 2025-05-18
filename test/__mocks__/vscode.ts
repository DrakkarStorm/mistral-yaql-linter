/** Minimal VS Code API mocks for Jest unit tests */

export class Position {
  constructor(public line: number, public character: number) { }
}

export class Range {
  constructor(public start: Position, public end: Position) { }
}

export enum CompletionItemKind {
  Function,
  Variable,
  Keyword,
  Snippet,
  Value
}

export class CompletionItem {
  constructor(public label: string, public kind: CompletionItemKind) { }
}

export class CompletionList {
  constructor(public items: CompletionItem[]) { }
}

export class MarkdownString {
  constructor(public value: string) { }
}

export class Hover {
  constructor(public contents: (MarkdownString | string)[], public range?: Range) { }
}

export class SignatureHelp {
  signatures: any[] = [];
  activeSignature = 0;
  activeParameter = 0;
}

export class SignatureInformation {
  constructor(public label: string, public documentation: MarkdownString) { }
}

export interface TextDocument {
  getText(): string;
  languageId: string;
  uri: Uri;
  lineAt(line: number): { text: string };
}

export class Uri {
  static file(path: string) {
    return { fsPath: path, toString: () => path } as Uri;
  }
}

