## 1. Style and Code Quality

- [ ] **A linter or static analyzer is configured.**
  - It checks the primary languages used in the repository.
  - Its configuration is committed to version control.
  - Generated, vendored, and build-output directories are excluded intentionally.
  - Lint violations cause the command and CI job to fail.

- [ ] **An automatic formatter is configured.**
  - Formatting rules are deterministic and shared by the entire team.
  - The repository provides a command to apply formatting.
  - The repository provides a non-mutating formatting check for CI.
  - The formatter and linter do not enforce conflicting rules.

- [ ] **Strict type checking is enabled where the language supports it.**
  - The strictest practical mode is enabled.
  - New type errors fail local validation and CI.
  - Broad global suppressions are avoided.
  - Necessary suppressions are narrow and documented.

- [ ] **Pre-commit hooks are configured.**
  - Hooks run fast checks such as formatting, linting, and secret detection.
  - Hook configuration is committed to the repository.
  - Setup instructions explain how to install the hooks.
  - CI repeats the important checks because local hooks can be bypassed.

- [ ] **A root `.editorconfig` file exists.**
  - It defines encoding, line endings, final newlines, indentation style, and indentation width.
  - File-specific overrides are included only when necessary.
  - Its rules are compatible with the repository formatter.

- [ ] **Naming conventions are consistent.**
  - Files, directories, modules, types, functions, variables, and tests follow predictable conventions.
  - Equivalent components use equivalent names and locations.
  - Exceptions for generated code, external APIs, database schemas, or legacy code are documented.
