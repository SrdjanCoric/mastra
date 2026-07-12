# Task 0006: Recover safely from Telegram and process failures

**Branch**: `feature/telegram-failure-recovery`
**Depends on**: 0005
**Source**: `ARCHITECTURE.md` · **User stories**: continue locally during Telegram outages; reconnect without duplicate actions; recover safely after crashes or deleted topics

## What to build

Complete the operational safety path for Telegram-enabled TUI sessions. Add project ownership locks, persistent update offsets and processed IDs, bounded exponential reconnect behavior, a prioritized bounded outbound queue, safe deleted-topic handling, crash-era instruction reporting, health notices, and redacted diagnostics. Telegram failures must never take down or block the local TUI.

Extend the Telegram error classification, update-offset handling, processed-message deduplication, deleted-topic detection, and redaction rules already implemented in this codebase. Centralize bot-wide offsets, deduplication, retries, and outbound delivery in the ephemeral broker while keeping follow-up and prompt state inside each TUI. Do not add launchd or a headless workflow-service ownership model, and never replay instructions from a previous broker or TUI process.

The shared TUI and Telegram path already works and is the regression baseline. Before changing recovery code, record the focused tests that prove guided init, broker routing, shared conversation, commands, questions, and approvals. Recovery work must extend those paths, and the baseline tests must continue to pass after each change.

## AFK tasks

- [x] Record and run the focused baseline suite for guided init, broker ownership and routing, shared conversation, Telegram commands, questions, and approvals before changing recovery behavior.
- [x] Add deterministic failing tests using fake time and storage for broker/client disconnects, broker restart, last-client shutdown, startup races, rate limits, malformed responses, duplicate/out-of-order updates, stale offsets, queue overflow, topic deletion, concurrent project owners, stale sockets/PIDs/locks, crashes, and redacted logging.
- [x] Persist only the minimum broker routing/deduplication state required for safe recovery and make offset, processed-ID, socket ownership, and registration writes atomic where corruption would cause duplicate or cross-project control.
- [x] Implement bounded exponential backoff and a fair bounded broker outbound queue that discards low-priority notices before completed conversation messages.
- [x] Add one broker lock per bot token plus project-scoped TUI ownership locks, with safe normal cleanup and stale-owner recovery.
- [x] Report instructions not executed before a crash as unprocessed; never inject old instructions into a new process or thread.
- [x] Surface adapter health and recovery notices in both the TUI and safe Telegram status without exposing content or secrets.

## Acceptance criteria

- [x] Existing guided init, broker routing, shared conversation, Telegram command, question, and approval tests pass without weakened assertions or changed working behavior.
- [x] Telegram or broker outages degrade connected projects to local-only operation and recover without restarting their TUIs.
- [x] Broker or client reconnection sends one project-scoped recovery notice and current status, without replaying resolved prompts or duplicate messages.
- [x] Duplicate, delayed, or out-of-order updates cannot repeat user instructions, cross project topics, or repeat control actions.
- [x] Exactly one broker owns a bot token, exactly one Telegram-enabled TUI owns each canonical project, and stale broker/socket/project locks can be recovered safely.
- [x] Deleted topics are recreated safely or produce an exact repair action.
- [x] Logs and diagnostics exclude tokens, message bodies, assistant content, command output, approval arguments, prompts, and file contents.
- [x] Focused recovery tests, TUI integration tests, lint, typecheck, and build pass.

## Implementation log

- Added atomic broker state persistence for update offsets, processed update IDs, and per-topic counts of instructions that were received but not acknowledged by the TUI before a crash. Broker-to-TUI delivery acknowledgements keep crash-era instructions marked unprocessed, and corrupt state fails closed rather than replaying Telegram updates.
- Added bot-token broker ownership plus canonical-project TUI locks, stale-owner recovery, automatic broker-process reconnection, re-registration, and one recovery notice followed by safe current status without restarting the TUI.
- Added a fair bounded outbound queue with low-priority eviction, bounded exponential retries, Telegram Retry-After support, deleted-topic disablement, and exact `mastracode-remote --init` repair guidance.
- Added structured `0600` diagnostics containing only timestamps, event types, IDs/counts, attempts, and safe error codes. Message bodies, prompts, arguments, output, paths, and secrets are not logged.
- Verified the existing shared-conversation regression baseline and added the checked-in `telegram-recovery` TUI scenario for local operation during an outage and resumed Telegram delivery after recovery.
- Proof: 16 focused unit/integration files passed with 109 tests; `telegram-shared-conversation` and `telegram-recovery` each passed their checked-in TUI e2e scenario; MastraCode typecheck, lint, and `pnpm build:mastracode` passed.
- Merged in PR #8 with merge commit `78d2e203f4c4f67712a9689d8fe78503b41366ec`.
