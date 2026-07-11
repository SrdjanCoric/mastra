# Task 0004: Add thread routing and Telegram session commands

**Branch**: `feature/telegram-thread-routing-and-commands`
**Depends on**: 0003
**Source**: `ARCHITECTURE.md` · **User stories**: understand which TUI thread Telegram follows; inspect safe session status; stop work without killing the TUI; discover supported commands

## What to build

Keep the project topic bound to the thread currently active in the TUI and add the complete v1 Telegram command surface: `/status`, `/stop`, and `/help`. Commands must be deterministic and bypass the model. Model selection, thread switching, settings, shell passthrough, and privileged commands remain terminal-only.

## AFK tasks

- [ ] Add failing tests for initial thread sync, thread changes, command parsing, stale/unknown commands, status redaction, stop while idle/active/suspended, queued Telegram follow-up clearing, and continued local usability.
- [ ] Publish short thread-change notices using title or safe short identifier while retaining one project topic.
- [ ] Build `/status` from live session/TUI/adapter state without prompts or transcript access.
- [ ] Implement `/stop` through native abort/run-control APIs and clear only queued Telegram-originated follow-ups.
- [ ] Implement concise `/help` output and reject unsupported remote controls with terminal-only guidance.

## Acceptance criteria

- [ ] Telegram follows the TUI's selected thread and never selects or creates threads itself.
- [ ] `/status` reports project, thread, model, mode, run state, safe current task/tool summary, queued follow-up count, active-turn duration, and Telegram health without sensitive content.
- [ ] `/stop` aborts active work, clears queued Telegram follow-ups, and leaves the TUI, adapter, and thread alive.
- [ ] `/help` lists only the three supported commands and explains terminal-only controls.
- [ ] Unknown slash commands do not reach the model.
- [ ] Focused integration tests, TUI tests, lint, typecheck, and build pass.
