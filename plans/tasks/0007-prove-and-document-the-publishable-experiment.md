# Task 0007: Prove and document the publishable experiment

**Branch**: `feature/publish-telegram-tui-experiment`
**Depends on**: 0006
**Source**: `ARCHITECTURE.md` · **User stories**: install and run the isolated experiment confidently; verify the real Telegram path; understand limits and recovery steps

## What to build

Close the publication gate with automated end-to-end and package proof, user-facing documentation, release metadata, and one manual live Telegram verification. The checks must run from isolated temporary homes and package prefixes and must prove that production MastraCode, production `mastracode-remote`, external checkouts, launchd, and Telegram resources are not mutated accidentally.

## AFK tasks

- [ ] Add end-to-end scenarios covering init, stock TUI startup, shared messages, follow-up queueing, thread/model reflection, commands, prompts/approvals, reconnects, duplicates, stale replies, deleted topics, crashes, and ordinary CLI regression.
- [ ] Add isolated pack/install/smoke checks using temporary homes, config roots, package prefixes, repositories, and mocked Telegram seams.
- [ ] Add release metadata and user documentation for setup, commands, security boundary, state locations, tmux guidance, troubleshooting, recovery, limitations, and uninstall/cleanup.
- [ ] Record exact automated verification commands and results in the task implementation log and PR.

## Human-in-the-loop tasks

- [ ] [verify] Run the documented manual test with the experiment-only real Telegram bot, private forum group, and project topic; confirm terminal and Telegram share one live session and that prompts, approvals, commands, thread changes, reconnect behavior, and cleanup work — a real Telegram account and human observation cannot be replaced by the mocked automated seam.

## Acceptance criteria

- [ ] All publication-gate behaviors in `ARCHITECTURE.md` have automated coverage except the explicitly manual live-service check.
- [ ] The packed experiment installs and runs from isolated state without overwriting an existing published runtime identity.
- [ ] Ordinary `mastracode` behavior and MastraCode-only skill discovery remain proven.
- [ ] Production `~/.mastracode-remote/`, launchd services, global package prefixes, external production checkouts, and unrelated Telegram topics are untouched.
- [ ] User documentation is sufficient to initialize, run, stop, troubleshoot, and clean up the experiment safely.
- [ ] The manual live Telegram checklist passes and its evidence is recorded without secrets or message content.
- [ ] Focused tests, TUI end-to-end tests, lint, typecheck, build, and package smoke checks pass.
