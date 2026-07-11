# Task 0004: Add thread routing and Telegram session commands

**Branch**: `feature/telegram-thread-routing-and-commands`
**Depends on**: 0003
**Source**: `ARCHITECTURE.md` · **User stories**: understand which TUI thread Telegram follows; inspect safe session status; stop work without killing the TUI; discover supported commands

## What to build

Keep the project topic bound to the thread currently active in the TUI and add the complete v1 Telegram command surface: `/status`, `/stop`, and `/help`. Commands must be deterministic and bypass the model. Model selection, thread switching, settings, shell passthrough, and privileged commands remain terminal-only.

Adapt the command-first routing order from `mastracode-remote`'s `telegram-update-poller`, but replace remote workflow commands with this experiment's three deterministic session commands and live TUI state. Telegram must never create or select a MastraCode thread.

## AFK tasks

- [x] Add failing tests for initial thread sync, thread changes, command parsing, stale/unknown commands, status redaction, stop while idle/active/suspended, queued Telegram follow-up clearing, and continued local usability.
- [x] Publish short thread-change notices using title or safe short identifier while retaining one project topic.
- [x] Build `/status` from live session/TUI/adapter state without prompts or transcript access.
- [x] Implement `/stop` through native abort/run-control APIs and clear only queued Telegram-originated follow-ups.
- [x] Implement concise `/help` output and reject unsupported remote controls with terminal-only guidance.

## Acceptance criteria

- [x] Telegram follows the TUI's selected thread and never selects or creates threads itself.
- [x] `/status` reports project, thread, model, mode, run state, safe current task/tool summary, queued follow-up count, active-turn duration, and Telegram health without sensitive content.
- [x] `/stop` aborts active work, clears queued Telegram follow-ups, and leaves the TUI, adapter, and thread alive.
- [x] `/help` lists only the three supported commands and explains terminal-only controls.
- [x] Unknown slash commands do not reach the model.
- [x] Focused integration tests, TUI tests, lint, typecheck, and build pass.

## Implementation log

Implemented deterministic command parsing and responses inside the live TUI session, including redacted `/status`, native `/stop`, terminal-only guidance, initial/current thread notices, and adapter health reporting. Extended the checked-in shared-conversation TUI scenario to prove initial thread sync and model-bypassing `/help`/`/status` behavior. Validation passed with 72 focused unit tests, the focused TUI e2e scenario, package lint/typecheck, and `pnpm build:mastracode`.
