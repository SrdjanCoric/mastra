# Plan: MastraCode Telegram TUI

> Source: `ARCHITECTURE.md` · agreed design 2026-07-11

This is the project's master plan: a durable architectural header plus an ordered list of task pointers. Each task is one feature on its own branch, ending in a PR. Task bodies live in `plans/tasks/`; finished tasks move to `plans/tasks/done/`.

## Workflow

- New work is added by `mastra-to-plan` as self-contained task files plus pointers below.
- `mastra-implement-next-task` selects an eligible pointer, implements it through tests, runs the automatic review gate, creates and merges its PR, then uses `mastra-sync-main` to close the task.
- Pointer states are `[ ]` todo, `[~]` in progress, `[>]` merged and awaiting local closeout, and `[x]` merged into local `main`.
- A task is eligible only when every ordinal in its `(after …)` suffix is `[x]`.

## Architectural decisions

- **Process model**: each visible MastraCode TUI owns its controller, session, active thread, and project adapter; one ephemeral local broker per bot token owns Telegram polling for all connected projects. There is no PTY injection, second headless run, launchd service, or attachable TUI.
- **Package and commands**: publish only the `mastracode/` workspace as `mastracode-remote`; `mastracode-remote --init` prepares isolated state and `mastracode-remote` starts the visible MastraCode TUI with Telegram attached to the same session. The official `mastracode` package and executable remain unchanged.
- **Description**: "MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram."
- **Isolation**: the new TUI-backed runtime keeps its config, state, locks, logs, readiness markers, and Telegram resources separate from legacy `mastracode-remote` 0.1.x state and launchd services.
- **Ownership**: `SrdjanCoric/mastra` is the implementation source while the package remains coupled to MastraCode internals. The existing npm organization `mastracode-remote` owns `@mastracode-remote/mastracode-runtime`; the public CLI package remains `mastracode-remote` with access controlled by `SrdjanCoric` and the organization. No external bridge repository is required to build or run the package.
- **Skills**: this build discovers skills only from project-local and global `.mastracode/skills` directories.
- **Routing**: projects share one private forum group, each canonical project maps to one persistent topic, and the broker routes that topic to its one Telegram-enabled TUI owner; the topic follows the TUI's active thread.
- **Input**: authorized Telegram text enters the native follow-up queue and retains source metadata only in the TUI presentation.
- **Output**: Telegram receives completed assistant messages and meaningful lifecycle/prompt events, never streaming, tool noise, command output, secrets, or transcripts.
- **Remote commands**: v1 supports deterministic `/status`, non-terminating `/stop`, and `/help`; model, thread, settings, shell, and privileged controls stay terminal-only.
- **Prompts**: questions and approvals are prompt-specific, uniquely identified, redacted, answerable from either surface, and never auto-approved.
- **Recovery**: Telegram or broker failure degrades affected projects to local-only operation with bounded retries, broker-owned offsets/deduplication and prioritized delivery, safe socket/topic recovery, and no replay of unprocessed crash-era instructions.
- **Implementation source**: the terminal-visible TUI implementation, Telegram bridge, recovery behavior, and tests live in this codebase. The package has no runtime or planning dependency on the legacy repository or headless daemon.
- **Publication**: the publication gate requires focused unit/integration tests, concurrent multi-project broker coverage, TUI end-to-end coverage, isolated package verification, and one manual live Telegram test; a separate final task publishes the approved package to npm.

---

## Tasks

- [x] 0001 · Establish the isolated Telegram runtime foundation → tasks/done/0001-establish-isolated-telegram-runtime-foundation.md (PR #1, `8a124467`)
- [x] 0002 · Initialize Telegram for a MastraCode project (after 0001) → tasks/done/0002-initialize-telegram-for-a-mastracode-project.md (PR #2, `e4197d5d`)
- [x] 0003 · Share one conversation across the TUI and Telegram (after 0002) → tasks/done/0003-share-one-conversation-across-tui-and-telegram.md (PR #3, `e29e7fd9`)
- [x] 0004 · Add thread routing and Telegram session commands (after 0003) → tasks/done/0004-add-thread-routing-and-telegram-session-commands.md (PR #4, `857bd9a6`)
- [x] 0005 · Resolve questions and approvals from either surface (after 0004) → tasks/done/0005-resolve-questions-and-approvals-from-either-surface.md (PR #5, `9860eb39`)
- [>] 0006 · Recover safely from Telegram and process failures (after 0005) → tasks/0006-recover-safely-from-telegram-and-process-failures.md (PR #8)
- [ ] 0008 · Bound shell-output rendering (after 0005) → tasks/0008-bound-shell-output-rendering.md
- [ ] 0009 · Adopt the MastraCode Remote product identity (after 0008) → tasks/0009-adopt-the-mastracode-remote-product-identity.md
- [ ] 0007 · Prove and document the publishable package (after 0006, 0009) → tasks/0007-prove-and-document-the-publishable-package.md
- [ ] 0010 · Publish MastraCode Remote to npm (after 0007) → tasks/0010-publish-mastracode-remote-to-npm.md
