// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { MistralDefinitionProvider } from './definitionProvider';
import { DiagnosticsManager } from './diagnosticProvider';

/**
 * Activate the VS Code extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "mistral-yaql-linter" is now active');

    const diagnosticsManager = new DiagnosticsManager(context);

    // Register the YAQL and Mistral language features
    registerLanguageFeatures(context);

    // Register commands
    registerCommands(context, diagnosticsManager);

    // Set up document change listeners
    setupDocumentListeners(context, diagnosticsManager);
}

function registerLanguageFeatures(context: vscode.ExtensionContext) {
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
export function deactivate() { }
