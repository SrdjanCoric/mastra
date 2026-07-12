## 2. Testing

- [ ] **A maintained test framework is configured.**
  - Test discovery is deterministic.
  - Shared test configuration is committed to the repository.
  - Test-only dependencies are separated from production dependencies when supported.

- [ ] **The repository contains meaningful automated tests.**
  - Tests contain real assertions and verify production behavior.
  - Test files follow consistent naming and directory conventions.
  - Empty, skipped, placeholder, or assertion-free tests are not treated as useful coverage.

- [ ] **A canonical test command exists.**
  - Tests can be run from the repository root.
  - The command exits with a non-zero status when a test fails.
  - A monorepo root command runs or delegates to all relevant workspaces.
  - Focused commands may also exist for unit, integration, end-to-end, or affected tests.

- [ ] **Test coverage reporting is configured.**
  - Coverage includes production code and intentionally excludes generated or vendored code.
  - Human-readable and machine-readable reports are produced when supported.
  - CI publishes or stores the coverage result.
  - A reasonable minimum threshold or regression policy is defined.

- [ ] **Integration or end-to-end tests exist where the project has integration boundaries.**
  - Important workflows are tested across modules, services, databases, queues, filesystems, or external interfaces.
  - Higher-level tests are separated clearly from unit tests.
  - External dependencies use controlled environments, fixtures, test containers, emulators, or documented test doubles.

- [ ] **Tests are reliable and valuable.**
  - Tests cover critical behavior, failure paths, validation, and edge cases.
  - Tests are deterministic and isolated.
  - Tests do not depend on execution order, local machine state, real production data, or undocumented services.
  - Flaky tests are fixed rather than retried indefinitely or ignored.
  - Test names describe behavior and expected outcomes.
