## 5. CI/CD

- [ ] **A CI pipeline is configured.**
  - It runs on pull requests and changes to protected branches.
  - It starts from a clean checkout.
  - Dependency caching improves speed without weakening reproducibility.
  - Required jobs have clear names and fail correctly.

- [ ] **CI runs the canonical test command.**
  - It executes the same test workflow documented for local use.
  - Test failures block merging.
  - Required databases or services are provided through controlled CI infrastructure.

- [ ] **CI runs linting, formatting checks, and static analysis.**
  - Linting and formatting failures block merging.
  - Strict type checking runs where applicable.
  - CI uses the same configuration as local development.

- [ ] **The build process is automated.**
  - A canonical build command exists.
  - CI verifies that distributable artifacts, packages, binaries, images, or deployable applications build successfully.
  - Build output is reproducible and does not depend on undocumented local files.

- [ ] **A deployment or release pipeline exists for deployable projects.**
  - Deployment is automated for the environments supported by the project.
  - Environment-specific configuration is separated from source code.
  - Production deployment requires appropriate approvals or protected environments.
  - Releases are traceable to a commit, tag, version, and CI run.
  - Rollback or recovery procedures are documented.

- [ ] **Branch protection rules are configured and documented.**
  - Direct pushes to protected branches are restricted.
  - Required CI checks must pass before merging.
  - Required reviews and ownership rules are applied where appropriate.
  - Force pushes and branch deletion are restricted.
  - Administrative bypasses are limited and auditable.
