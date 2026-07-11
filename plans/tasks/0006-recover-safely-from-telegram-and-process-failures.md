# Task 0006: Recover safely from Telegram and process failures

**Branch**: `feature/telegram-failure-recovery`
**Depends on**: 0005
**Source**: `ARCHITECTURE.md` · **User stories**: continue locally during Telegram outages; reconnect without duplicate actions; recover safely after crashes or deleted topics

## What to build

Complete the operational safety path for Telegram-enabled TUI sessions. Add project ownership locks, persistent update offsets and processed IDs, bounded exponential reconnect behavior, a prioritized bounded outbound queue, safe deleted-topic handling, crash-era instruction reporting, health notices, and redacted diagnostics. Telegram failures must never take down or block the local TUI.

## AFK tasks

- [ ] Add deterministic failing tests using fake time and storage for disconnect/reconnect, rate limits, malformed responses, duplicate/out-of-order updates, stale offsets, queue overflow, topic deletion, concurrent owners, stale locks, crashes, and redacted logging.
- [ ] Persist only the minimum routing/deduplication state required for safe recovery and make state writes atomic where corruption would cause duplicate control.
- [ ] Implement bounded exponential backoff and a bounded outbound queue that discards low-priority notices before completed conversation messages.
- [ ] Add project-scoped ownership locking with safe normal cleanup and stale-owner recovery.
- [ ] Report instructions not executed before a crash as unprocessed; never inject old instructions into a new process or thread.
- [ ] Surface adapter health and recovery notices in both the TUI and safe Telegram status without exposing content or secrets.

## Acceptance criteria

- [ ] Telegram outages degrade to local-only operation and recover without restarting the TUI.
- [ ] Reconnection sends one recovery notice and current status, without replaying resolved prompts or duplicate messages.
- [ ] Duplicate, delayed, or out-of-order updates cannot repeat user instructions or control actions.
- [ ] Only one Telegram-enabled TUI can own a canonical project; stale locks can be recovered safely.
- [ ] Deleted topics are recreated safely or produce an exact repair action.
- [ ] Logs and diagnostics exclude tokens, message bodies, assistant content, command output, approval arguments, prompts, and file contents.
- [ ] Focused recovery tests, TUI integration tests, lint, typecheck, and build pass.
