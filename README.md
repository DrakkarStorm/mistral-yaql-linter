# mistral-yaql-linter

This is the Visual Studio Code extension **mistral-yaql-linter**, which provides real‑time linting, auto-completion, snippets, signatures, and diagnostics for OpenStack Mistral v2 workflows (YAQL/Jinja) directly in your editor.

## Features

- **Command‑Line Interface**:
  - `mistral-linter` CLI to lint workflows from terminal or CI pipelines.
- **Syntax & Semantic Validation** of Mistral v2 YAML:
  - Detects invalid task mappings, missing keys, duplicate names, orphan tasks, improper indentation.
  - Validates YAQL expressions (`<% ... %>`) for unknown variables, bad references, and task() calls.
- **Advanced Checks**:
  - `with-items` support, concurrency limits, pause/wait timers, join strategies.
  - Detects orphaned or unreachable tasks and enforces naming conventions `[a-z0-9_]+`.
- **Real‑time Diagnostics**:
  - Underlines errors and warnings inline, with hover messages.
- **Auto‑Completion**:
  - suggestions for task names, variables, and YAQL functions.
  - snippets for common task patterns and YAQL constructs.
  - signatures for YAQL functions.
  - hover tooltips for task definitions and YAQL functions.
- **Visualization**:
  -  generate a diagram of the workflow directly from the editor.

## Roadmap

- **Auto‑Fix & Formatting Helpers**:
  - Placeholder for upcoming `fix` command to transform lists to mappings, correct naming, etc.
- **Extension Language Server**:
  - Code Navigation: jump to task definitions, find references, and more.
  - Refactoring: rename tasks, extract subworkflows, etc.
- **Jinja2 Support**:
  - basic syntax highlighting and validation for Jinja2 expressions.

## Requirements

- **Node.js** >=16
- **Visual Studio Code** >=1.99
- **js-yaml** (bundled)

### Optional

For the diagram feature, you'll need:
- **Graphviz** for workflow diagrams (https://graphviz.org/download/)

#### macOS

```bash
brew update
brew install graphviz
```

#### Windows

Download and install from https://graphviz.org/download/

#### Linux

```bash
sudo apt-get install graphviz
```

## Installation

Install dependencies and build the extension before running:

```bash
npm clean-install
npm run compile
```

Execute the extension in a new VS Code window:
1. Go to the Debug viewlet (`Ctrl+Shift+D` or `Cmd+Shift+D`).
2. Select `Run Extension` from the dropdown.
3. Press `F5` to start debugging (or click the green arrow).

## Usage

### Commands

- **Mistral: Validate Current File**: `mistral-yaql-linter.validateDocument`
- **Mistral: Show Mistral Workflow Diagram**: `mistral-yaql-linter.showDiagram`

## Extension Settings

This extension contributes the following settings in `settings.json`:

| Setting                            | Type    | Default | Description                                      |
| ---------------------------------- | ------- | ------- | ------------------------------------------------ |
| `mistralYaqlLinter.enable`         | boolean | true    | Enable/disable the linter globally.              |
| `mistralYaqlLinter.validateOnSave` | boolean | true    | Automatically validate on save.                  |
| `mistralYaqlLinter.validateOnType` | boolean | false   | Automatically validate on typing.                |

### Activation & Configuration

These features are enabled by default for YAML/Mistral files. You can tweak them in your user settings:

```jsonc
// settings.json
{
  "mistralYaqlLinter.enable": true,
  "mistralYaqlLinter.validateOnSave": false,
  "mistralYaqlLinter.validateOnType": true
}
```

## Development: Autocompletion, Hover, Signature Help & Snippets

This section describes the advanced editor features provided by the **mistral-yaql-linter** extension and how to use them.


### 1. Contextual Autocompletion

The extension offers completions based on the actual structure of your Mistral file:

* **Workflow names**: as soon as you type `workflow: `, you’ll see a list of the workflows declared in the document.
* **Task names**: under the keys `requires:`, `on-success:`, `on-error:`, you’ll get the names of the tasks in the current workflow.
* **YAQL variables**: type `$.` to see all available variables (inputs, publish, with-items).
* **Mistral keys**: inside a `tasks` block, complete keys like `action`, `with-items`, `publish`, `join`, etc.

> **Example**: place your cursor after `requires:` and press <kbd>Ctrl+Space</kbd> (Windows/Linux) or <kbd>⌃+Space</kbd> (macOS).

---

### 2. Hover Tooltips

When you hover over certain elements, the extension shows a contextual tooltip:

* **YAQL functions** (`len`, `map`, `filter`, etc.): signature and description.
* **Mistral keys** (`action`, `with-items`, `join`, etc.): brief documentation.

> **Example**: hover over `len(` to see its signature `len(collection) → number`.

---

### 3. Signature Help

While typing YAQL function calls, the signature help popup guides you on:

* The function name and its parameters.
* Documentation for each argument.

**Trigger characters**: opening parenthesis `(` or comma `,`.

> **Example**: type `map(` to see `map(list, func)` and its documentation.

---

### 4. Static Snippets

Several ready-to-use **snippets** speed up workflow and task creation:

| Snippet                         | Prefix                       | Description                                           |
| ------------------------------- | ---------------------------- | ----------------------------------------------------- |
| **Workflow Skeleton**           | `mistral-workflow`           | Full Mistral v2 workbook skeleton with metadata.      |
| **Task Skeleton**               | `mistral-task`               | Detailed task template with all common properties.    |
| **Input array**                 | `input-array`                | Auto-generated YAQL input array.                      |
| **Input Mapping with Defaults** | `input-map`                  | Auto-generated YAQL input mapping with defaults.      |
| **With-Items Loop**             | `with-items`                 | Auto-generated YAQL `with-items` loop.                |
| **Retry Block**                 | `retry`                      | Retry policy (`count`, `delay`).                      |
| **On Success / On Error**       | `on-success`, `on-error`     | Define transitions on success or error.               |
| **Join Control Flow**           | `join`                       | Join behavior (`all` or `any`).                       |
| **Pause / Wait**                | `pause-before`, `wait-after` | Delay before/after task execution.                    |
| **Concurrency Limit**           | `concurrency`                | Max concurrent executions for a task.                 |
| **Action Call**                 | `action`                     | Action call with YAQL parameters and literals.        |
| **YAQL Expression**             | `yaql`                       | Insert a `<% … %>` YAQL expression.                   |

> **Tip**: type the **prefix** then press <kbd>Tab</kbd> to trigger the snippet.

## Known Issues
...

## Following extension guidelines

Ensure that you've read through VS Code’s extension guidelines and follow best practices for publishing.

- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Contributing

Want to contribute? Great! Please see the [contributing guide](CONTRIBUTING.md).

## For more information

- [VS Code API Documentation](https://code.visualstudio.com/api)
- [OpenStack Mistral v2 Language Reference](https://docs.openstack.org/mistral/latest/user/wf_lang_v2.html)
- [StackStorm YAQL Reference](https://docs.stackstorm.com/mistral_yaql.html)

**Enjoy linting your Mistral workflows!**

