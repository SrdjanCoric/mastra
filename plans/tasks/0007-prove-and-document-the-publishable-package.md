# Task 0007: Prove and document the publishable package

**Branch**: `feature/prove-mastracode-remote-package`
**Depends on**: 0006, 0009
**Source**: `ARCHITECTURE.md` · **User stories**: install and run MastraCode Remote confidently; verify the real Telegram path; understand limits and recovery steps

## What to build

Close the publication gate for `mastracode-remote` with automated end-to-end and package proof, user-facing documentation, release metadata, and one manual live Telegram verification. Publish only the monorepo's `mastracode/` workspace. The package must start the terminal-visible MastraCode TUI with Telegram attached to that same session and must not retain the legacy headless daemon as an alternate runtime. Checks must run from isolated temporary homes and package prefixes and prove that the official `mastracode` package and executable, legacy `mastracode-remote` 0.1.x state and launchd service, external checkouts, and unrelated Telegram resources are not mutated accidentally.

## AFK tasks

- [ ] Add end-to-end scenarios covering init, visible TUI startup, shared messages, follow-up queueing, thread/model reflection, commands, prompts/approvals, reconnects, duplicates, stale replies, deleted topics, crashes, and ordinary CLI regression.
- [ ] Add isolated pack/install/smoke checks using temporary homes, config roots, package prefixes, repositories, and mocked Telegram seams.
- [ ] Add release metadata and user documentation for setup, commands, security boundary, state locations, tmux guidance, troubleshooting, recovery, limitations, migration from 0.1.x, and uninstall/cleanup.
- [ ] Record exact automated verification commands and results in the task implementation log and pull request.

## Human-in-the-loop tasks

- [ ] [verify] Run the documented manual test with the real Telegram bot, private forum group, and project topic; confirm the terminal-visible TUI and Telegram share one live session and that prompts, approvals, commands, thread changes, reconnect behavior, and cleanup work. A real Telegram account and human observation cannot be replaced by the mocked automated seam.

## Acceptance criteria

- [ ] All publication-gate behaviors in `ARCHITECTURE.md` have automated coverage except the explicitly manual live-service check.
- [ ] The packed `mastracode-remote` workspace installs and runs from isolated state with the `mastracode-remote` executable and does not publish any other monorepo package.
- [ ] Running `mastracode-remote` starts the visible MastraCode TUI with Telegram attached to the same session and does not install or start the old headless daemon or launchd service.
- [ ] The official `mastracode` package, executable, ordinary behavior, and MastraCode-only skill discovery remain proven.
- [ ] Legacy `~/.mastracode-remote/` state, launchd services, global package prefixes, external production checkouts, and unrelated Telegram topics are untouched.
- [ ] User documentation explains that this is MastraCode with Telegram and is sufficient to initialize, run, stop, troubleshoot, migrate, and clean up safely.
- [ ] The manual live Telegram checklist passes and its evidence is recorded without secrets or message content.
- [ ] Focused tests, TUI end-to-end tests, lint, typecheck, build, and package smoke checks pass.
