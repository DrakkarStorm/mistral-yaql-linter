import * as vscode from 'vscode';
import { Position as CorePosition, Range as CoreRange } from '../core/types';
import { MistralValidator as CoreValidator, MistralValidationError } from '../core/validator';

/**
 * Adapter between core linter logic and VS Code API.
 * Converts core Range/Position into vscode.Range/Position.
 */
export class MistralValidator extends CoreValidator {
  /**
   * Transforms a Range from core/types.ts into a vscode.Range
   */
  public toVSRange(coreRange: CoreRange): vscode.Range {
    const { start, end } = coreRange;
    return new vscode.Range(
      new vscode.Position(start.line, start.character),
      new vscode.Position(end.line, end.character)
    );
  }

  /**
   * Transforms a Position from core/types.ts into a vscode.Position
   */
  public toVSPosition(corePosition: CorePosition): vscode.Position {
    return new vscode.Position(corePosition.line, corePosition.character);
  }

  /**
   * Converts a core error into a vscode.Diagnostic
   */
  public toDiagnostic(err: MistralValidationError): vscode.Diagnostic {
    const range = this.toVSRange(err.range);
    return new vscode.Diagnostic(range, err.message, vscode.DiagnosticSeverity.Error);
  }
}
