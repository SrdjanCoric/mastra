# Plan: MastraCode Telegram TUI

> Source: `ARCHITECTURE.md` · agreed design 2026-07-11

This is the project's master plan: a durable architectural header plus an ordered list of task pointers. Each task is one feature on its own branch, ending in a PR. Task bodies live in `plans/tasks/`; finished tasks move to `plans/tasks/done/`.

## Workflow

- New work is added by `mastra-to-plan` as self-contained task files plus pointers below.
- `mastra-implement-next-task` selects an eligible pointer, implements it through tests, runs the automatic review gate, creates and merges its PR, then uses `mastra-sync-main` to close the task.
- Pointer states are `[ ]` todo, `[~]` in progress, `[>]` merged and awaiting local closeout, and `[x]` merged into local `main`.
- A task is eligible only when every ordinal in its `(after …)` suffix is `[x]`.

## Architectural decisions

- **Process model**: the stock TUI process owns one controller, session, active thread, and optional Telegram adapter; no PTY injection, second headless run, daemon, or attachable TUI.
- **Commands**: `mastracode --telegram-init` prepares isolated state; `mastracode --telegram` starts the stock TUI with Telegram; ordinary invocation remains unchanged.
- **Isolation**: experiment config, state, runtime identity, locks, logs, readiness markers, and Telegram resources are separate from production `mastracode-remote` state and services.
- **Repository safety**: Mastra work pushes only to `SrdjanCoric/mastra`; bridge work pushes only to `SrdjanCoric/mastracode-remote-telegram`; both original repositories are fetch-only upstream remotes with disabled push URLs.
- **Skills**: this build discovers skills only from project-local and global `.mastracode/skills` directories.
- **Routing**: each canonical project maps to one persistent forum topic and permits one Telegram-enabled TUI owner; the topic follows the TUI's active thread.
- **Input**: authorized Telegram text enters the native follow-up queue and retains source metadata only in the TUI presentation.
- **Output**: Telegram receives completed assistant messages and meaningful lifecycle/prompt events, never streaming, tool noise, command output, secrets, or transcripts.
- **Remote commands**: v1 supports deterministic `/status`, non-terminating `/stop`, and `/help`; model, thread, settings, shell, and privileged controls stay terminal-only.
- **Prompts**: questions and approvals are prompt-specific, uniquely identified, redacted, answerable from either surface, and never auto-approved.
- **Recovery**: Telegram failure degrades to local-only operation with bounded retries, persistent offsets/deduplication, bounded prioritized delivery, safe topic recovery, and no replay of unprocessed crash-era instructions.
- **Implementation source**: reuse behavior from adjacent `mastracode-remote` and its runtime patch, but implement and test TypeScript source rather than compiled artifacts.
- **Publication**: release requires focused unit/integration tests, TUI end-to-end coverage, isolated package verification, and one manual live Telegram test.

---

## Tasks

- [ ] 0001 · Establish the isolated Telegram runtime foundation → tasks/0001-establish-isolated-telegram-runtime-foundation.md
- [ ] 0002 · Initialize Telegram for a MastraCode project (after 0001) → tasks/0002-initialize-telegram-for-a-mastracode-project.md
- [ ] 0003 · Share one conversation across the TUI and Telegram (after 0002) → tasks/0003-share-one-conversation-across-tui-and-telegram.md
- [ ] 0004 · Add thread routing and Telegram session commands (after 0003) → tasks/0004-add-thread-routing-and-telegram-session-commands.md
- [ ] 0005 · Resolve questions and approvals from either surface (after 0004) → tasks/0005-resolve-questions-and-approvals-from-either-surface.md
- [ ] 0006 · Recover safely from Telegram and process failures (after 0005) → tasks/0006-recover-safely-from-telegram-and-process-failures.md
- [ ] 0007 · Prove and document the publishable experiment (after 0006) → tasks/0007-prove-and-document-the-publishable-experiment.md
