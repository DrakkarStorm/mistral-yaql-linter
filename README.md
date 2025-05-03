# mistral-yaql-linter

This is the Visual Studio Code extension **mistral-yaql-linter**, which provides real‑time linting and diagnostics for OpenStack Mistral v2 workflows (YAQL/Jinja) directly in your editor.

## Features

- **Syntax & Semantic Validation** of Mistral v2 YAML:
  - Detects invalid task mappings, missing keys, duplicate names, orphan tasks, improper indentation.
  - Validates YAQL expressions (`<% ... %>`) for unknown variables, bad references, and task() calls.
- **Advanced Checks**:
  - `with-items` support, concurrency limits, pause/wait timers, join strategies.
  - Detects orphaned or unreachable tasks and enforces naming conventions `[a-z0-9_]+`.
- **Real‑time Diagnostics**:
  - Underlines errors and warnings inline, with hover messages and quick‑fix suggestions.

## Roadmap

- **Command‑Line Interface**:
  - `mistral-linter` CLI to lint workflows from terminal or CI pipelines.
- **Auto‑Fix & Formatting Helpers**:
  - Placeholder for upcoming `fix` command to transform lists to mappings, correct naming, etc.
- **Auto‑Completion**:
  - suggestions for task names, variables, and YAQL functions.
- **Extension Language Server**:
  - Code Navigation: jump to task definitions, find references, and more.
  - Refactoring: rename tasks, extract subworkflows, etc.
  - Documentation: hover tooltips for tasks, variables, and YAQL functions.
- **Jinja2 Support**:
  - basic syntax highlighting and validation for Jinja2 expressions.

## Requirements

- **Node.js** >=16
- **Visual Studio Code** >=1.99
- **js-yaml** (bundled)

Install dependencies and build the extension before running:

```bash
npm clean-install
npm run compile
```

Execute the extension in a new VS Code window:
1. Go to the Debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D`).
2. Select `Run Extension` from the dropdown.
3. Press `F5` to start debugging (or click the green arrow).

## Extension Settings

This extension contributes the following settings in `settings.json`:

| Setting                         | Type    | Default | Description                                      |
| ------------------------------- | ------- | ------- | ------------------------------------------------ |
| `mistralYaqlLinter.enable`      | boolean | true    | Enable/disable the linter globally.              |
| `mistralYaqlLinter.maxProblems` | number  | 100     | Maximum number of diagnostics reported per file. |
| `mistralYaqlLinter.strict`      | boolean | false   | Treat warnings as errors for CI enforcement.     |

## Known Issues
- Extremely large workflows (>500 lines) may incur a small performance hit on initial load.

## Following extension guidelines

Ensure that you've read through VS Code’s extension guidelines and follow best practices for publishing.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author this README using Visual Studio Code. Useful shortcuts:

- Split editor: `Ctrl+\` (Windows/Linux) or `Cmd+\` (macOS)
- Toggle preview: `Ctrl+Shift+V` (Windows/Linux) or `Shift+Cmd+V` (macOS)

## For more information

- [VS Code API Documentation](https://code.visualstudio.com/api)
- [OpenStack Mistral v2 Language Reference](https://docs.openstack.org/mistral/latest/user/wf_lang_v2.html)
- [StackStorm YAQL Reference](https://docs.stackstorm.com/mistral_yaql.html)

**Enjoy linting your Mistral workflows!**

