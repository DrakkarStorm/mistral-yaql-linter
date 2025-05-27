// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { CompletionProvider } from './completions';
import { MistralDefinitionProvider } from './definitionProvider';
import { DiagnosticsManager } from './diagnosticProvider';
import { DiagramManager } from './diagramPanel';
import { MistralHoverProvider } from './hoverProvider';
import { YaqlSignatureProvider } from './signatureProvider';

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

    // Set up completion provider
    setupCompletionProvider(context);

    // Set up hover provider
    setupHoverProvider(context);

    // Set up signature help provider
    setupSignatureHelpProvider(context);
}

// Add this function to register language features
function registerLanguageFeatures(context: vscode.ExtensionContext) {
    // Register the definition provider for Mistral files
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            [{ language: 'yaml', pattern: '**/*.{yaml,yml,mistral,mistral.yaml,mistral.yml}' }],
            new MistralDefinitionProvider()
        )
    );
}

// Add this function to register commands
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

    const diagramManager = new DiagramManager(context);

    context.subscriptions.push(
        vscode.commands.registerCommand('mistral-yaql-linter.showDiagram', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                diagramManager.showDiagram();
                vscode.window.showInformationMessage('Diagram panel opened');
            }
        })
    );
}

// Add this function to handle document changes and validation
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

// Setup the completion provider for YAML documents.
function setupCompletionProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'yaml', scheme: 'file' },
            new CompletionProvider(),
            '<', '%', '$', ':'
        )
    );
}

// Setup the hover provider for YAML documents.
function setupHoverProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            { language: 'yaml', scheme: 'file' },
            new MistralHoverProvider()
        ),
    );
}

// Setup the signature help provider for YAML documents.
function setupSignatureHelpProvider(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            { language: 'yaml', scheme: 'file' },
            new YaqlSignatureProvider(),
            '(', ','  // triggers
        )
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }
