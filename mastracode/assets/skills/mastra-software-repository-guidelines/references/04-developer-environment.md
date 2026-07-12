## 4. Developer Environment

- [ ] **A dependency lock file is committed.**
  - Dependency resolution is reproducible across machines and CI.
  - The lock file matches the selected package manager.
  - CI uses frozen, immutable, or locked dependency installation where supported.
  - Application repositories commit lock files unless the ecosystem has a documented reason not to.

- [ ] **Runtime and toolchain versions are pinned.**
  - The repository declares supported versions for languages, runtimes, package managers, and important build tools.
  - Local development and CI use compatible versions.
  - Version declarations are updated deliberately rather than drifting implicitly.

- [ ] **Environment variables are documented in a safe example file.**
  - A `.env.example`, `.env.template`, or equivalent file lists required variables.
  - Each variable has a safe placeholder and, where useful, a short explanation.
  - Required and optional values are distinguishable.
  - Real credentials, tokens, keys, and production secrets are never committed.

- [ ] **A canonical setup command or script exists.**
  - It installs dependencies and performs repeatable local initialization.
  - It is safe to run more than once where practical.
  - It validates prerequisites and reports useful errors.
  - Required manual steps are documented.

- [ ] **A canonical development command exists.**
  - It starts the application or development workflow with the expected local configuration.
  - It does not rely on undocumented shell state or machine-specific paths.
  - Required supporting services are started automatically or documented clearly.

- [ ] **A containerized development or build environment exists where useful.**
  - The container definition is version controlled and buildable.
  - Runtime versions and system dependencies are explicit.
  - Development, CI, and production containers use compatible foundations.
  - Images do not include unnecessary secrets, caches, or development files.
