# Task 0011: Apply repository guidelines and secure releases

**Branch**: `feature/secure-mastracode-remote-release`
**Depends on**: none
**Source**: talk-it-through 2026-07-12 · **User stories**: validate MastraCode Remote on fork-owned infrastructure; protect the public package from unauthorized publication; keep inherited Mastra workflows from running on unavailable private infrastructure; give vulnerability reporters a private contact route; preserve the working application while repository safeguards change

## What to build

Bring the publishable `mastracode/` workspace and its release path into line with the applicable Software Repository Guidelines. Pull requests must run package-scoped checks on GitHub-hosted infrastructure before merging. npm publication must use trusted GitHub publishing with provenance and no long-lived npm token. Existing upstream workflows must remain disabled for this fork.

Keep this task out of the TUI, Telegram, tool-execution, skill-sync, and stored-state behavior. The existing application regression suite and package smoke check must prove that repository and release changes do not alter the working app. Do not retrofit unrelated monorepo packages or add generic files that have no active use in this repository.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `08-recommended-canonical-commands.md`, `09-expected-repository-files.md`, `10-definition-of-done.md`

- [x] A clean GitHub-hosted CI job runs the documented MastraCode build, strict typecheck, lint, formatting check, focused tests, coverage report, required TUI end-to-end proof, security checks, and publication-package verification on pull requests.
- [x] Canonical root-level package-scoped commands have documented local equivalents and fail correctly in CI.
- [x] Coverage produces human-readable and machine-readable output, is stored by CI, and has a baseline regression policy for the affected MastraCode production code.
- [x] Existing linting, formatting, strict typing, hooks, and test configuration are reused. Add a compatible root `.editorconfig` because the repository does not have one.
- [x] Dead-code and dependency checks use the narrowest practical MastraCode scope, with explicit exclusions for generated files, bundled skills, and public extension surfaces.
- [x] Publication verification records archive integrity and size so unexpected package-content or size changes are visible before release.
- [ ] `main` requires the fork-owned CI check and pull-request review. Force pushes and branch deletion are blocked.
- [x] Repository ownership names the actual fork maintainer instead of upstream maintainers who do not administer this repository.
- [x] Dependency vulnerability monitoring and prioritized security updates are enabled without activating unrelated inherited workflows.
- [x] Secret scanning and push protection remain enabled, and publication does not require a long-lived npm token stored in GitHub or the repository.
- [x] A committed security policy explains private vulnerability reporting and supported release handling.
- [ ] npm publication is traceable to a commit, package version, archive integrity, workflow run, and provenance statement.

## AFK tasks

- [x] Record the current package-scoped test, TUI end-to-end, build, and publication-smoke baseline before changing repository or release configuration.
- [x] Add a fork-safe CI workflow using GitHub-hosted Node 22 and the repository's pinned pnpm version.
- [x] Limit required validation to `mastracode/`, directly affected shared core code, package metadata, lockfile, workflow, and plan changes while allowing manual execution.
- [x] Add or expose canonical package-scoped commands for formatting checks, strict type checking, tests, coverage, integration proof, build, and the complete local check without replacing established commands.
- [x] Configure coverage output and a documented regression policy that does not force unrelated monorepo packages into this task.
- [x] Add the missing root editor settings and a narrowly configured dead-code/dependency check where the existing toolchain supports reliable results.
- [x] Add automated dependency vulnerability, source security, and secret checks that report actionable findings without scanning unrelated deployers, examples, or services.
- [x] Update repository ownership for this fork and add a concise private security-reporting policy.
- [x] Add a manually triggered npm release workflow that verifies the exact package archive before publishing through npm trusted publishing with provenance.
- [x] Extend publication verification to prove the archive has no install lifecycle script, local credentials, or unintended executable, and to report its integrity and unpacked size.
- [x] Add automated checks for workflow configuration, provenance inputs, archive integrity output, and the absence of npm tokens from committed configuration.
- [x] Document the canonical local commands that correspond to each required CI job.
- [x] Run the existing focused TUI and Telegram regression suite plus isolated package install smoke proof after the repository changes.

## Human-in-the-loop tasks

- [ ] [confirm-security] Approve changing GitHub Actions permissions, workflow enablement, branch protection, dependency security updates, npm trusted-publisher authorization, and npm account publication requirements after the committed workflows and exact permission changes are shown. These actions change external trust boundaries and package publication authority.

## Acceptance criteria

- [ ] A pull request changing MastraCode cannot merge until the fork-owned required check passes.
- [ ] Inherited workflows that depend on Mastra's private runners remain disabled in `SrdjanCoric/mastra`.
- [ ] `main` rejects force pushes and deletion and requires pull-request validation.
- [ ] GitHub reports `SrdjanCoric` as the effective code owner for repository changes.
- [ ] Secret scanning, push protection, dependency security updates, and the scoped security workflow are enabled.
- [ ] npm shows no unexpected maintainer, publication requires strong authentication, and the trusted publisher is restricted to the intended repository and release workflow.
- [ ] A non-publishing proof verifies archive contents, integrity, size, provenance arguments, and the absence of install lifecycle scripts.
- [ ] The security policy gives reporters a private route and identifies the supported `0.2.x` release line.
- [ ] The checked-in application regression suite and package smoke test pass without changing TUI, Telegram, skills, state, or execution behavior.
- [ ] Existing uncommitted `0.2.2` release edits are preserved and are not mixed into this task's implementation commit.
- [ ] Task 0011 is merged and closed before task 0012 starts, then the workflow pauses so the user can test the app.

## Implementation log

- Added a GitHub-hosted pull-request workflow for the MastraCode workspace. It runs formatting, lint, strict type checking, the full unit suite with coverage, the MastraCode build, the shared Telegram TUI scenarios, CodeQL, dependency review, release-configuration checks, and isolated package verification.
- Added root commands for the complete validation path. Coverage now writes text, JSON, and LCOV reports and enforces the measured baseline floors of 59% statements, 53% branches, 59% functions, and 60% lines.
- Added a manual release workflow that uses the protected `npm-release` environment, OIDC, provenance, a version guard, and one verified archive. The archive verifier reports SHA-256, compressed size, and unpacked size while rejecting install scripts, local state, unexpected binaries, and archives over the checked-in budgets.
- Added `.editorconfig`, `.node-version`, fork ownership, a private-reporting security policy, and a scoped CodeQL configuration. Existing ESLint and TypeScript checks continue to cover unused local code. A broad unused-export or dependency scanner was not added because MastraCode loads extensions dynamically and the repository has no established scanner or exclusion model for that surface.
- Enabled Dependabot alerts, automatic security fixes, private vulnerability reporting, secret scanning, and push protection. GitHub Actions now allows GitHub-owned and repository-local actions; all inherited upstream workflows are disabled.
- Verified `pnpm check:mastracode`. The unit suite passed with 205 files and 2,090 tests. The two Telegram TUI integration scenarios passed, the 50-task MastraCode build passed, and package verification produced a 2.46 MB archive below the 5 MB compressed budget.
- Recorded the minor stale command-border artifact reported after task 0008 in task 0012. It is a display cleanup issue and does not affect command execution or task 0011.
