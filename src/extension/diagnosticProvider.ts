import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { MistralValidationError } from '../core/validator';
import { YaqlParser, YaqlParsingError } from '../core/yaqlParser';
import { MistralValidator } from './adapter';

export class DiagnosticsManager {
  private diagnosticsCollection: vscode.DiagnosticCollection;
  private yaqlParser: YaqlParser;
  private mistralValidator: MistralValidator;

  constructor(context: vscode.ExtensionContext) {
    this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('mistral-yaql-linter');
    context.subscriptions.push(this.diagnosticsCollection);

    this.yaqlParser = new YaqlParser();
    this.mistralValidator = new MistralValidator();
  }

  /**
   * Validate a document and update diagnostics
   */
  public validateDocument(document: vscode.TextDocument): void {
    // Clear existing diagnostics
    this.clearDiagnostics(document);

    // Skip non-YAML files
    if (document.languageId !== 'yaml') {
      return;
    }

    const diagnostics: vscode.Diagnostic[] = [];

    try {
      // First validate basic YAML syntax
      try {
        yaml.load(document.getText());
      } catch (e: any) {
        // Extract error position and message from js-yaml
        const line = e.mark ? e.mark.line : 0;
        const col = e.mark ? e.mark.column : 0;
        const range = new vscode.Range(line, col, line, col + 1);

        diagnostics.push(new vscode.Diagnostic(
          range,
          `YAML syntax error: ${e.message}`,
          vscode.DiagnosticSeverity.Error
        ));

        // If basic YAML syntax is invalid, don't proceed with more specific validation
        this.diagnosticsCollection.set(document.uri, diagnostics);
        return;
      }

      // Check if this is likely a Mistral workflow file
      const docText = document.getText();
      const isMistralFile = this.isMistralWorkflowFile(document);

      if (isMistralFile) {
        // Validate Mistral workflow structure
        const errors = this.mistralValidator.validateDocument(document.getText());

        // Convert errors to diagnostics
        for (const error of errors) {
          if (error instanceof YaqlParsingError) {
            const position = this.mistralValidator.toVSPosition(error.position);

            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(position, position.translate(0, 1)),
              `YAQL syntax error: ${error.message}`,
              vscode.DiagnosticSeverity.Error
            ));
          } else if (error instanceof MistralValidationError) {
            const range = this.mistralValidator.toVSRange(error.range);

            diagnostics.push(new vscode.Diagnostic(
              range,
              `Mistral error: ${error.message}`,
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      } else {
        // For non-Mistral YAML files, just validate YAQL expressions
        const yaqlExpressions = this.yaqlParser.extractYaqlExpressions(docText);

        for (const expr of yaqlExpressions) {
          const errors = this.yaqlParser.validateExpression(expr.expression, expr.range.start);

          for (const error of errors) {
            const position = this.mistralValidator.toVSPosition(error.position);

            diagnostics.push(new vscode.Diagnostic(
              new vscode.Range(position, position.translate(0, 1)),
              `YAQL syntax error: ${error.message}`,
              vscode.DiagnosticSeverity.Error
            ));
          }
        }
      }
    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error during validation:", errorMessage);

      diagnostics.push(new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 10),
        `Validation error: ${errorMessage}`,
        vscode.DiagnosticSeverity.Error
      ));
    }

    // Update diagnostics
    this.diagnosticsCollection.set(document.uri, diagnostics);
  }

  /**
   * Clear diagnostics for a document
   */
  public clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticsCollection.delete(document.uri);
  }

  /**
   * Determine if a file is likely a Mistral workflow file
   */
  private isMistralWorkflowFile(document: vscode.TextDocument): boolean {
    // Check filename patterns
    const filename = document.fileName.toLowerCase();
    if (filename.endsWith('.mistral') ||
      filename.endsWith('.mistral.yaml') ||
      filename.endsWith('.mistral.yml')) {
      return true;
    }

    // Check content for Mistral-specific patterns
    const content = document.getText();

    try {
      const yamlDoc = yaml.load(content) as any;

      // Check for Mistral workflow structure
      if (yamlDoc &&
        typeof yamlDoc === 'object' &&
        yamlDoc.version === '2.0' &&
        yamlDoc.workflows) {
        return true;
      }
    } catch (e) {
      console.error("Error parsing YAML:", e);
      // YAML parsing error, can't determine if it's a Mistral file
      return false;
    }

    return false;
  }
}