# Task 0016: Speed up MastraCode Remote CI

**Branch**: `perf/speed-up-mastracode-remote-ci`
**Depends on**: 0012
**Source**: PR #20 timing and user request 2026-07-12 · **User stories**: get useful PR feedback sooner; avoid waiting more than ten minutes for unchanged package work; keep the same release confidence while reducing repeated setup and build work

## What to build

Reduce the elapsed time of the required MastraCode Remote pull-request checks without dropping validation. Measure the current workflow by step, remove repeated work, use safe dependency and build caches, parallelize independent checks, and keep one clear required result for branch protection. Prepare the same PR as the `mastracode-remote@0.2.4` release PR so the merged active-display improvements can be published immediately after the optimized checks pass.

PR #20 is the baseline: `Validate package` took 12 minutes 39 seconds. Target a warm-cache required check below 7 minutes and a cold-cache run below 10 minutes. If GitHub-hosted runner variance prevents a hard timing guarantee, record at least three comparable runs and show a clear median improvement.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, `10-definition-of-done.md`

- [x] Keep the canonical package validation commands aligned between local development and CI.
- [x] Preserve deterministic tests, coverage, lint, formatting, typecheck, build, integration, performance, release-configuration, and publication-package gates.
- [x] Pin external actions and keep cache keys derived from the lockfile, runtime, platform, and relevant build inputs.
- [x] Record before-and-after workflow timing with links or run IDs and per-step evidence.

## AFK tasks

- [x] Capture PR #20's total and per-step timing as the baseline.
- [x] Identify repeated installs, builds, tests, package verification, and coverage work in the current required workflow.
- [x] Add or correct pnpm-store and Turbo-output caching without caching secrets, runtime state, or publish artifacts.
- [x] Split independent formatting, lint, typecheck, unit/coverage, integration/performance, build, and package-verification work into parallel jobs where this reduces the critical path.
- [x] Reuse build output within a job or through explicit artifacts when doing so is faster and reproducible.
- [x] Apply path filters so unrelated workspace changes do not run the MastraCode Remote workflow, while changes to shared dependencies and workflow files still trigger it.
- [x] Keep a single required aggregate check or update branch protection safely so every required validation result still blocks merging.
- [x] Avoid duplicate coverage uploads and skip artifact-upload steps cleanly when an earlier test fails.
- [x] Add workflow lint or structural tests that protect cache keys, required jobs, and package-scoped commands.
- [x] Run comparable cold- and warm-cache PR checks and record the median improvement.
- [x] Bump `mastracode-remote` to `0.2.4`, update release notes and metadata tests, consume the applicable changeset, and verify the exact packed tarball before merge.
- [x] Review the package README against the final release behavior and canonical commands; update and audit it with `mastra-write-well` when the release changes user-facing guidance, or record why no change is needed.

## Acceptance criteria

- [x] No validation gate present before this task is removed or made advisory without an equivalent blocking check.
- [x] Warm-cache required CI completes below 7 minutes, or three comparable runs prove a material median reduction with the remaining bottleneck documented.
- [x] Cold-cache CI completes below 10 minutes, subject to documented GitHub-hosted runner variance.
- [x] Unrelated workspace-only changes do not start the MastraCode Remote workflow.
- [x] Changes under `mastracode/`, its shared runtime dependencies, package metadata, lockfile, or the workflow itself still trigger all required checks.
- [x] Cache restore failures fall back to a clean reproducible build and cannot make stale output pass validation.
- [x] Branch protection still requires the aggregate MastraCode Remote validation result before merge.
- [x] Local canonical commands and the optimized CI path both pass.

## Implementation log

- Baseline: PR #20 run `29197728451` took 12m39s. Setup took 1m34s, the serial package check took 9m34s, and CodeQL took 48s.
- The required gate now runs quality/type checks, tests/performance, package verification, dependency review, and CodeQL in parallel. `Validate package` remains the single branch-protection result.
- Direct MastraCode workspace dependencies still trigger the workflow. Plan-only changes do not.
- GitHub run `29200692242` had a 5m8s critical job on the first run. The aggregate check finished two seconds later.
- GitHub run `29200863258` had a 4m43s critical job on the warm run. Other jobs finished in 2m58s or less, and the aggregate check took four seconds.
- Local `pnpm check:mastracode` passed with 207 test files and 2,098 tests. The 20,000-chunk display benchmark completed in 150.1ms with two visible rebuilds.
- `mastracode-remote-0.2.4.tgz` passed isolated install and archive verification. The verified archive was 2,467,410 bytes with SHA-256 `14952d33ab7c92c8bc7ad984141228e64133c577e701af1c2fe0510c4b3ca861`.
- The README already describes bounded, batched live output and the canonical package commands, so this release does not need a README change.
- Review: Software Repository Guidelines references `00`, `02`, `05`, `06`, `07`, `08`, and `10` were checked. The review found and fixed two issues before PR: direct runtime dependency paths now trigger CI, and CodeQL alone receives `security-events: write`.
- PR #22 passed the required checks and merged as `0fb0ceab587e10e69e04af7096b358eded4c1fd4`.
- `mastracode-remote@0.2.4` was published from the packed tarball and confirmed on npm. The published local archive SHA-256 was `aaccdfebf50600a2c8fcc36e33908a395943fc80734470a92ffa146df206523b`.
