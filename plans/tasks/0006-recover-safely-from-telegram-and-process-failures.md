# Task 0006: Recover safely from Telegram and process failures

**Branch**: `feature/telegram-failure-recovery`
**Depends on**: 0005
**Source**: `ARCHITECTURE.md` · **User stories**: continue locally during Telegram outages; reconnect without duplicate actions; recover safely after crashes or deleted topics

## What to build

Complete the operational safety path for Telegram-enabled TUI sessions. Add project ownership locks, persistent update offsets and processed IDs, bounded exponential reconnect behavior, a prioritized bounded outbound queue, safe deleted-topic handling, crash-era instruction reporting, health notices, and redacted diagnostics. Telegram failures must never take down or block the local TUI.

Reuse the proven Telegram error classification, update-offset handling, processed-message deduplication, deleted-topic detection, and redaction rules from `mastracode-remote` where they fit. Centralize bot-wide offsets, deduplication, retries, and outbound delivery in the ephemeral broker while keeping follow-up and prompt state inside each TUI. Do not reuse launchd or the remote workflow-service ownership model, and never replay instructions from a previous broker or TUI process.

## AFK tasks

- [ ] Add deterministic failing tests using fake time and storage for broker/client disconnects, broker restart, last-client shutdown, startup races, rate limits, malformed responses, duplicate/out-of-order updates, stale offsets, queue overflow, topic deletion, concurrent project owners, stale sockets/PIDs/locks, crashes, and redacted logging.
- [ ] Persist only the minimum broker routing/deduplication state required for safe recovery and make offset, processed-ID, socket ownership, and registration writes atomic where corruption would cause duplicate or cross-project control.
- [ ] Implement bounded exponential backoff and a fair bounded broker outbound queue that discards low-priority notices before completed conversation messages.
- [ ] Add one broker lock per bot token plus project-scoped TUI ownership locks, with safe normal cleanup and stale-owner recovery.
- [ ] Report instructions not executed before a crash as unprocessed; never inject old instructions into a new process or thread.
- [ ] Surface adapter health and recovery notices in both the TUI and safe Telegram status without exposing content or secrets.

## Acceptance criteria

- [ ] Telegram or broker outages degrade connected projects to local-only operation and recover without restarting their TUIs.
- [ ] Broker or client reconnection sends one project-scoped recovery notice and current status, without replaying resolved prompts or duplicate messages.
- [ ] Duplicate, delayed, or out-of-order updates cannot repeat user instructions, cross project topics, or repeat control actions.
- [ ] Exactly one broker owns a bot token, exactly one Telegram-enabled TUI owns each canonical project, and stale broker/socket/project locks can be recovered safely.
- [ ] Deleted topics are recreated safely or produce an exact repair action.
- [ ] Logs and diagnostics exclude tokens, message bodies, assistant content, command output, approval arguments, prompts, and file contents.
- [ ] Focused recovery tests, TUI integration tests, lint, typecheck, and build pass.
