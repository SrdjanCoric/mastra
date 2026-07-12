# Task 0024: Prepare MastraCode Remote 0.2.5

**Branch**: `release/mastracode-remote-0.2.5`
**Depends on**: 0023
**Source**: managed workflow continuation, 2026-07-13 · **User stories**: publish the merged workflow, Telegram, TUI, and terminal-image fixes through the trusted release path

## What to build

Prepare `mastracode-remote@0.2.5` from the merged post-0.2.4 work. Update package metadata and concise release notes, verify the packed archive in isolation, and merge the release preparation through the protected branch workflow. Publication follows as a separate confirmed operation through the GitHub Actions trusted-publishing workflow.

## Software Repository Guidelines

**Applicable references**: `references/00-overview.md`, `references/02-testing.md`, `references/03-documentation.md`, `references/05-ci-cd.md`, `references/07-security.md`, `references/10-definition-of-done.md`

- [x] Keep the package version, metadata regression test, changelog, and requested release version aligned.
- [x] Run the canonical package checks and verify the exact packed archive before merge.
- [x] Keep publication configured on the protected `npm-release` environment with OIDC provenance and no npm token.
- [x] Record the release-PR validation requirements and local archive proof before merge.

## AFK tasks

- [x] Bump `mastracode-remote` and its metadata expectation to `0.2.5`.
- [x] Add release notes covering persistent/unbounded managed workflows, Telegram delivery and verification, compact TUI activity, and terminal image fixes.
- [x] Review the README against the shipped behavior and update it only if the existing guidance is stale.
- [x] Build and verify the exact `mastracode-remote-0.2.5.tgz` archive in an isolated install.
- [x] Run package-scoped quality, test, performance, release-configuration, and publication-package checks.
- [x] Review and close out the release preparation in the implementation pull request.

## Acceptance criteria

- [x] `mastracode/package.json`, package metadata tests, and changelog identify `0.2.5`.
- [x] The exact archive contains registry-compatible dependencies, installs in isolation, exposes the expected CLI, and does not alter legacy state.
- [x] Required CI and release-configuration checks are mandatory merge gates for the release PR.
- [x] The release branch is ready for the trusted `0.2.5` release workflow without further source changes.

## Implementation evidence

- `pnpm check:mastracode` passed with 209 test files and 2,132 tests. The active-display benchmark processed 20,000 chunks in 150.9ms with two visible rebuilds.
- Release configuration verification passed for the protected `npm-release` environment, OIDC publication, provenance, and exact-archive publishing.
- The package gate verified `mastracode-remote-0.2.5.tgz` with SHA-256 `bac0494100f369d0799b8c52611bf31b6174c3b2ba747e2b1e78b412dfc5672c`, 2,478,578 archive bytes, and 11,035,326 unpacked bytes.
- The README already documents persistent managed workflows, Telegram replies during active work, separate verification-code messages, terminal-only image support, and the current limitations. No README change was needed.
- Automatic task review found no standards, specification, correctness, or security issues. The version bump is limited to package metadata, release notes, the metadata regression assertion, and plan closeout.
