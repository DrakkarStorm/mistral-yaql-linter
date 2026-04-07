# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**mistral-yaql-linter** is a VS Code extension that provides real-time linting, auto-completion, snippets, signatures, and diagnostics for OpenStack Mistral v2 workflows (YAQL/Jinja). The extension also includes a standalone CLI tool for linting workflows in CI/CD pipelines.

## Development Commands

### Build & Compilation
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode compilation
- `npm run build` - Alternative build command
- `npm run build:bin` - Build standalone CLI binary

### Testing & Quality
- `npm test` - Run Jest tests with coverage
- `npm run lint` - Run ESLint (max 0 warnings enforced)

### VS Code Extension Development
- `npm run vscode:prepublish` - Prepublish hook (runs compile)
- `npm run package` - Package extension as .vsix
- `npm run deploy` - Publish to VS Code marketplace

### CLI Binary
- `npm run build:bin` - Creates standalone binaries in `out/bin/` for Linux, macOS, and Windows
- `mistral-linter` - CLI command after installation

## Architecture Overview

### Core Components

**Extension Entry Point** (`src/extension/extension.ts`)
- Activates on YAML files
- Registers language providers (completion, hover, signature help, diagnostics)
- Sets up commands: `mistral-yaql-linter.validateDocument` and `mistral-yaql-linter.showDiagram`

**Core Validation** (`src/core/validator.ts`)
- `MistralValidator` class handles workflow validation
- Validates Mistral v2 structure, task mappings, YAQL expressions
- Detects orphan tasks, missing references, naming violations

**YAQL Parser** (`src/core/yaqlParser.ts`)
- Parses YAQL expressions (`<% ... %>`) within workflows
- Validates variable references and function calls

**Language Server Features**
- **Completions** (`src/extension/completions.ts`) - Task names, variables, YAQL functions
- **Hover** (`src/extension/hoverProvider.ts`) - Documentation for YAQL functions and Mistral keys
- **Signature Help** (`src/extension/signatureProvider.ts`) - YAQL function signatures
- **Diagnostics** (`src/extension/diagnosticProvider.ts`) - Real-time error reporting

**Diagram Generation** (`src/core/diagramGenerator.ts`)
- Generates Graphviz DOT notation from Mistral workflows
- Creates workflow visualization via `mistral-yaql-linter.showDiagram` command
- Requires Graphviz installation for rendering

**CLI Tool** (`src/bin/cli.ts`)
- Standalone command-line interface
- Commands: `init`, `lint`, `fix`, `diagram`
- Can be packaged as binary with `pkg`

### File Structure Patterns

- `src/core/` - Core validation and parsing logic (framework-agnostic)
- `src/extension/` - VS Code-specific language server features
- `src/bin/` - CLI application entry point
- `test/` - Jest test files with fixture workflows in `test/fixtures/`

### Key Dependencies

- **js-yaml** - YAML parsing and manipulation
- **yaml-ast-parser** - AST-based YAML parsing for precise error locations
- **commander** - CLI argument parsing
- **vscode** - VS Code extension API

### Configuration

The extension supports these settings:
- `mistralYaqlLinter.enable` - Enable/disable globally
- `mistralYaqlLinter.validateOnSave` - Auto-validate on save
- `mistralYaqlLinter.validateOnType` - Auto-validate while typing

### Testing Strategy

- Unit tests in `test/` directory using Jest
- Mock VS Code API in `test/__mocks__/vscode.ts`
- Test fixtures for valid/invalid workflows in `test/fixtures/`
- Tests cover validation logic, language providers, and CLI functionality

### Workflow File Support

Recognizes these file patterns as Mistral workflows:
- `*.yaml`, `*.yml`
- `*.mistral`, `*.mistral.yaml`, `*.mistral.yml`

Validates Mistral v2 format with required `version: "2.0"` field and proper workflow structure.