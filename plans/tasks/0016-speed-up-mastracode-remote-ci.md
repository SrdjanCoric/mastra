# Task 0016: Speed up MastraCode Remote CI

**Branch**: `perf/speed-up-mastracode-remote-ci`
**Depends on**: 0012
**Source**: PR #20 timing and user request 2026-07-12 · **User stories**: get useful PR feedback sooner; avoid waiting more than ten minutes for unchanged package work; keep the same release confidence while reducing repeated setup and build work

## What to build

Reduce the elapsed time of the required MastraCode Remote pull-request checks without dropping validation. Measure the current workflow by step, remove repeated work, use safe dependency and build caches, parallelize independent checks, and keep one clear required result for branch protection. Prepare the same PR as the `mastracode-remote@0.2.4` release PR so the merged active-display improvements can be published immediately after the optimized checks pass.

PR #20 is the baseline: `Validate package` took 12 minutes 39 seconds. Target a warm-cache required check below 7 minutes and a cold-cache run below 10 minutes. If GitHub-hosted runner variance prevents a hard timing guarantee, record at least three comparable runs and show a clear median improvement.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, `10-definition-of-done.md`

- [ ] Keep the canonical package validation commands aligned between local development and CI.
- [ ] Preserve deterministic tests, coverage, lint, formatting, typecheck, build, integration, performance, release-configuration, and publication-package gates.
- [ ] Pin external actions and keep cache keys derived from the lockfile, runtime, platform, and relevant build inputs.
- [ ] Record before-and-after workflow timing with links or run IDs and per-step evidence.

## AFK tasks

- [ ] Capture PR #20's total and per-step timing as the baseline.
- [ ] Identify repeated installs, builds, tests, package verification, and coverage work in the current required workflow.
- [ ] Add or correct pnpm-store and Turbo-output caching without caching secrets, runtime state, or publish artifacts.
- [ ] Split independent formatting, lint, typecheck, unit/coverage, integration/performance, build, and package-verification work into parallel jobs where this reduces the critical path.
- [ ] Reuse build output within a job or through explicit artifacts when doing so is faster and reproducible.
- [ ] Apply path filters so unrelated workspace changes do not run the MastraCode Remote workflow, while changes to shared dependencies and workflow files still trigger it.
- [ ] Keep a single required aggregate check or update branch protection safely so every required validation result still blocks merging.
- [ ] Avoid duplicate coverage uploads and skip artifact-upload steps cleanly when an earlier test fails.
- [ ] Add workflow lint or structural tests that protect cache keys, required jobs, and package-scoped commands.
- [ ] Run comparable cold- and warm-cache PR checks and record the median improvement.
- [ ] Bump `mastracode-remote` to `0.2.4`, update release notes and metadata tests, consume the applicable changeset, and verify the exact packed tarball before merge.
- [ ] Review the package README against the final release behavior and canonical commands; update and audit it with `mastra-write-well` when the release changes user-facing guidance, or record why no change is needed.

## Acceptance criteria

- [ ] No validation gate present before this task is removed or made advisory without an equivalent blocking check.
- [ ] Warm-cache required CI completes below 7 minutes, or three comparable runs prove a material median reduction with the remaining bottleneck documented.
- [ ] Cold-cache CI completes below 10 minutes, subject to documented GitHub-hosted runner variance.
- [ ] Unrelated workspace-only changes do not start the MastraCode Remote workflow.
- [ ] Changes under `mastracode/`, its shared runtime dependencies, package metadata, lockfile, or the workflow itself still trigger all required checks.
- [ ] Cache restore failures fall back to a clean reproducible build and cannot make stale output pass validation.
- [ ] Branch protection still requires the aggregate MastraCode Remote validation result before merge.
- [ ] Local canonical commands and the optimized CI path both pass.
