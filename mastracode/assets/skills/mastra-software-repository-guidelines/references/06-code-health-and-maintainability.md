## 6. Code Health and Maintainability

- [ ] **Dependency freshness is monitored.**
  - Dependencies and lock files are updated regularly.
  - Outdated or unsupported dependencies are visible to maintainers.
  - Major upgrades are reviewed deliberately rather than applied blindly.
  - The repository does not depend on abandoned packages when maintained alternatives are available.

- [ ] **Dead and unused code detection is configured.**
  - Unused imports, variables, exports, modules, files, dependencies, and unreachable code are detected where the ecosystem supports it.
  - Generated code and intentional public extension points are excluded explicitly.
  - Detection runs locally or in CI on a regular basis.

- [ ] **Artifact size or bundle analysis is configured where size matters.**
  - Frontend bundles, libraries, binaries, mobile packages, container images, or other shipped artifacts are measured as appropriate.
  - Unexpected size regressions are visible in CI or release workflows.
  - Size budgets are defined for performance-sensitive artifacts.
  - This item may be marked not applicable only when the repository produces no size-sensitive artifact.
