# Task 0007: Prove and document the publishable package

**Branch**: `feature/prove-mastracode-remote-package`
**Depends on**: 0006, 0009
**Source**: `ARCHITECTURE.md` · **User stories**: install and run MastraCode Remote confidently; verify the real Telegram path; understand limits and recovery steps

## What to build

Close the publication gate for `mastracode-remote` with automated end-to-end and package proof, user-facing documentation, release metadata, and one manual live Telegram verification. Publish only the monorepo's `mastracode/` workspace. The package must start the terminal-visible MastraCode TUI with Telegram attached to that same session and must not retain the legacy headless daemon as an alternate runtime. Checks must run from isolated temporary homes and package prefixes and prove that the official `mastracode` package and executable, legacy `mastracode-remote` 0.1.x state and launchd service, external checkouts, and unrelated Telegram resources are not mutated accidentally.

## AFK tasks

- [x] Add end-to-end scenarios covering init, visible TUI startup, shared messages, follow-up queueing, thread/model reflection, commands, prompts/approvals, reconnects, duplicates, stale replies, deleted topics, crashes, and ordinary CLI regression.
- [x] Add isolated pack/install/smoke checks using temporary homes, config roots, package prefixes, repositories, and mocked Telegram seams.
- [x] Add release metadata and user documentation for setup, commands, security boundary, state locations, tmux guidance, troubleshooting, recovery, limitations, migration from 0.1.x, and uninstall/cleanup.
- [x] Record exact automated verification commands and results in the task implementation log and pull request.

## Human-in-the-loop tasks

- [x] [verify] Run the documented manual test with the real Telegram bot, private forum group, and project topic; confirm the terminal-visible TUI and Telegram share one live session and that prompts, approvals, commands, thread changes, reconnect behavior, and cleanup work. A real Telegram account and human observation cannot be replaced by the mocked automated seam.

## Acceptance criteria

- [x] All publication-gate behaviors in `ARCHITECTURE.md` have automated coverage except the explicitly manual live-service check.
- [x] The packed `mastracode-remote` workspace installs and runs from isolated state with the `mastracode-remote` executable and does not publish any other monorepo package.
- [x] Running `mastracode-remote` starts the visible MastraCode TUI with Telegram attached to the same session and does not install or start the old headless daemon or launchd service.
- [x] The official `mastracode` package, executable, ordinary behavior, and MastraCode-only skill discovery remain proven.
- [x] Legacy `~/.mastracode-remote/` state, launchd services, global package prefixes, external production checkouts, and unrelated Telegram topics are untouched.
- [x] User documentation explains that this is MastraCode with Telegram and is sufficient to initialize, run, stop, troubleshoot, migrate, and clean up safely.
- [x] The manual live Telegram checklist passes and its evidence is recorded without secrets or message content.
- [x] Focused tests, TUI end-to-end tests, lint, typecheck, build, and package smoke checks pass.

## Implementation log

Completed on 2026-07-12.

- Added an isolated publication-package verifier that packs only `mastracode/`, installs it under a temporary prefix, checks executable coexistence, runs the package readiness path, confirms the archive contents, and verifies that legacy state and launchd sentinels remain untouched.
- Updated the package README, metadata tests, release metadata, license, and private vulnerability-reporting policy. The README covers setup, commands, security, runtime state, tmux, troubleshooting, recovery, 0.1.x migration, limitations, and cleanup.
- Refreshed the bundled managed skills from `~/.mastracode/skills`, added `mastra-software-repository-guidelines`, and kept teaching and PRD skills out of the package assets.
- Removed the redundant Telegram startup notice. Questions, approvals, completed responses, explicit command replies, thread-change notices, and recovery notices remain enabled.
- Automated proof: `pnpm exec vitest run src/telegram/skills.test.ts src/telegram/setup.test.ts src/telegram/session-commands.test.ts src/tui/__tests__/mastra-tui-queueing.test.ts src/tui/__tests__/mastra-tui-hooks.test.ts src/__tests__/package-metadata.test.ts --reporter=dot --bail 1` passed 83 tests in 6 files.
- TUI proof: `MC_E2E_VITEST_SCENARIOS=startup,telegram-shared-conversation,telegram-recovery pnpm exec vitest run --config e2e/vitest.config.ts --reporter=dot` passed all 3 scenarios.
- Package proof: `pnpm --filter ./mastracode run verify:publication-package` passed for `mastracode-remote-0.1.3.tgz`.
- Full package proof: `pnpm test:mastracode` passed 2,086 tests in 205 files. `pnpm --filter ./mastracode check`, `pnpm --filter ./mastracode lint`, and `pnpm build:mastracode` also passed; the build completed 50 tasks.
- Manual proof: the user confirmed the documented live Telegram checklist passed with the real bot, private forum group, and visible TUI. No credentials, Telegram identifiers, or message content were recorded.
