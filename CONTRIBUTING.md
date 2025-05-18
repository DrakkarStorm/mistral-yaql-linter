# Contributing to mistral-yaql-linter

Thank you for your interest in contributing! Whether it’s bug reports, feature requests, documentation improvements, or code patches, your help is always appreciated.

---

## Table of Contents

- [Contributing to mistral-yaql-linter](#contributing-to-mistral-yaql-linter)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [How to Report Bugs](#how-to-report-bugs)
  - [How to Request Features](#how-to-request-features)
  - [Development Setup](#development-setup)
  - [Pull Request Process](#pull-request-process)
  - [Review \& Merge](#review--merge)
  - [Acknowledgments](#acknowledgments)
---

## Code of Conduct

This project follows the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
Please read it to understand expected behavior when participating in the community.

---

## How to Report Bugs

1. Search [existing issues](https://github.com/DrakkarStorm/mistral-yaql-linter/issues) to avoid duplicates.
2. Open a new issue with the **Bug Report** template:
   - **Title**: concise summary
   - **Description**: what you expected vs. what happened
   - **Steps to Reproduce**: minimal example workflow or code snippet
   - **Environment**: OS, Node.js version, extension version

---

## How to Request Features

1. Check for similar feature requests in the [issues list](https://github.com/DrakkarStorm/mistral-yaql-linter/issues).
2. Open a new issue with the **Feature Request** template:
   - **Motivation**: why this is useful
   - **Proposed Solution**: rough sketch of how it might work
   - **Alternatives**: other approaches you considered

---

## Development Setup

1. **Clone** the repository:
   ```bash
   git clone https://github.com/DrakkarStorm/mistral-yaql-linter.git
   cd mistral-yaql-linter
2. **Install** dependencies:
   ```bash
   npm install
3. **Build** the project:
    ```bash
    npm run build
4. **Run Test**:
   ```bash
   npm test
5. **Open** in VS Code (for extension features):
   - Press **F5** in the extension folder to launch the Development Host.
   - Open a Mistral workflow file (`.yaml` or `.yml`) to see the extension in action.

## Writing Code & Tests

- New features or bug fixes should include unit tests (Jest).
- Place core tests under test/*.test.ts and mocks under test/__mocks__/.
- If you add new functionality in src/extension, add corresponding tests in test/providers.test.ts, test/hover.test.ts, etc.

---
## Coding Style & Conventions

- **TypeScript** in src/, target ES2019, strict mode on.
- **Linting**: follow ESLint rules (npm run lint).
- **YAQL/YAML** logic in src/core; VS Code integration in src/extension.
- **Snippets** under .vscode/*.code-snippets.
- Keep functions small and pure where possible.

## Commit Messages & Versioning

We follow **Conventional Commits**:
```doc
<type>(<scope>): <short summary>

<body> (optional, more detailed description)

<footer> (e.g. BREAKING CHANGE: ...)
```

- **feat**: new feature
- **fix**: bug fix
- **docs**: documentation only
- **chore**: build or tooling changes
- **test**: adding or updating tests
- **refactor**: code change without feature/fix

Releases are managed by semantic-release, versioned via **SemVer**. Do not manually bump package.json—the CI will handle it.

---

## Pull Request Process

1. Fork the repo and create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
2. Commit changes following Conventional Commits.
3. Push your branch to GitHub and open a PR against main.
4. Fill out the PR template:
   - **What** and **why**
   - Link to relevant issues
   - Include screenshots or logs if relevant
5. The CI will run lint, build, and tests automatically.

## Review & Merge

- At least one core maintainer review is required.
- Address comments promptly.
- Once approved and CI is green, PRs will be merged by maintainer.
- A release will be published automatically on merge to main.

## Acknowledgments

Thank you to all [contributors](https://github.com/DrakkarStorm/mistral-yaql-linter/graphs/contributors) for their support.
Inspired by OpenStack Mistral and the vibrant VS Code community.

Feel free to reach out if you have any questions or suggestions. Happy coding!