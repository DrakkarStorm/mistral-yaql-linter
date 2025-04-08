// The module 'vscode' contains the VS Code extensibility API
import * as yaml from 'js-yaml';
import * as vscode from 'vscode';
import { DiagnosticsManager } from './diagnostics';
import { MistralDefinitionProvider } from './providers/definitionProvider';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "mistral-yaql-linter" is now active');

    // Initialize the diagnostics manager
    const diagnosticsManager = new DiagnosticsManager(context);

    // Register the YAQL and Mistral language features
    registerLanguageFeatures(context, diagnosticsManager);

    // Register commands
    registerCommands(context, diagnosticsManager);

    // Set up document change listeners
    setupDocumentListeners(context, diagnosticsManager);
}

function registerLanguageFeatures(context: vscode.ExtensionContext, diagnosticsManager: DiagnosticsManager) {
    // Register the definition provider for Mistral files
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            [{ language: 'yaml', pattern: '**/*.{yaml,yml,mistral,mistral.yaml,mistral.yml}' }],
            new MistralDefinitionProvider()
        )
    );
}

function registerCommands(context: vscode.ExtensionContext, diagnosticsManager: DiagnosticsManager) {
    console.log('Registering commands...');
    // Register the validate command
    context.subscriptions.push(
        vscode.commands.registerCommand('mistral-yaql-linter.validateDocument', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                diagnosticsManager.validateDocument(editor.document);
                vscode.window.showInformationMessage('YAQL & Mistral validation complete');
            }
        })
    );
}

function setupDocumentListeners(context: vscode.ExtensionContext, diagnosticsManager: DiagnosticsManager) {
    // Validate all open YAML documents on activation
    vscode.workspace.textDocuments.forEach(document => {
        if (document.languageId === 'yaml') {
            diagnosticsManager.validateDocument(document);
        }
    });

    // Validate YAML documents when they are opened
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(document => {
            if (document.languageId === 'yaml') {
                diagnosticsManager.validateDocument(document);
            }
        })
    );

    // Validate YAML documents when they are saved
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(document => {
            if (document.languageId === 'yaml') {
                diagnosticsManager.validateDocument(document);
            }
        })
    );

    // Validate YAML documents when they are edited, with debounce
    let timeout: NodeJS.Timeout | undefined = undefined;
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const document = event.document;
            if (document.languageId === 'yaml') {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = undefined;
                }
                timeout = setTimeout(() => {
                    diagnosticsManager.validateDocument(document);
                }, 500);
            }
        })
    );

    // Clear diagnostics when documents are closed
    context.subscriptions.push(
        vscode.workspace.onDidCloseTextDocument(document => {
            diagnosticsManager.clearDiagnostics(document);
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Simple YAML validator function (will be replaced by more comprehensive validation)
export function lintDocument(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    // Reset current diagnostics for the document
    const diagnostics: vscode.Diagnostic[] = [];

    // Get file content
    const docContent = document.getText();

    try {
        // Try to parse the YAML; if syntax is incorrect, an exception will be thrown
        yaml.load(docContent);
    } catch (e: any) {
        // Extract the error position, if available (js-yaml often provides a "mark" object)
        const line = e.mark ? e.mark.line : 0;
        const col = e.mark ? e.mark.column : 0;
        const range = new vscode.Range(line, col, line, col + 1);

        // Create a diagnostic with the error message
        const diagnostic = new vscode.Diagnostic(range, e.message, vscode.DiagnosticSeverity.Error);
        diagnostics.push(diagnostic);
    }

    // Apply diagnostics to the document
    diagnosticCollection.set(document.uri, diagnostics);
}