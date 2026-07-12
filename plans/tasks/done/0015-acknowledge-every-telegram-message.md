# Task 0015: Acknowledge every Telegram message

**Branch**: `fix/acknowledge-every-telegram-message`
**Depends on**: 0014
**Source**: user request 2026-07-12 · **User stories**: know that each Telegram message reached the active MastraCode session; receive the answer on Telegram even while a workflow is running; avoid wondering whether a status question or instruction was ignored

## What to build

Guarantee that every authorized Telegram message routed to an active project session produces a Telegram response. Cover ordinary instructions, messages delivered while an agent or managed workflow is active, local Telegram commands, prompt replies, queued follow-ups, and messages that fail before normal assistant completion.

Use the existing project topic and identity boundaries. A response may be the final answer when it is available promptly or a short receipt followed by the final answer for queued or long-running work. Do not echo secrets, approval payloads, or prompt internals. Keep replies deterministic and prevent duplicate acknowledgements or duplicate final answers.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [x] Keep acknowledgement ownership explicit across broker, TUI bridge, queue, command, and prompt paths so one inbound message cannot produce zero or duplicate responses.
- [x] Preserve authorization, project-topic routing, redaction, approval, and prompt-binding boundaries.
- [x] Add deterministic tests for idle, active, queued, command, prompt, error, reconnect, and duplicate-delivery paths.
- [x] Prove the behavior through checked-in TUI and Telegram integration coverage.

## AFK tasks

- [x] Trace every authorized Telegram inbound path and identify which paths can currently finish without an outbound Telegram response.
- [x] Define one response lifecycle per inbound message, including receipt, queued state, final answer, command result, prompt consumption, and terminal failure.
- [x] Send a short Telegram receipt when work cannot answer immediately, while allowing immediate command or final responses to satisfy the response requirement without an extra message.
- [x] Ensure messages delivered during active managed workflows receive a Telegram response without stopping the workflow or consuming a goal run.
- [x] Start `mastra workflow` and `mastra workflow --run` as one unbounded goal that uses the currently selected session model as judge and never prompts for a separate model or run limit.
- [x] Preserve first-response-wins prompt handling and prevent consumed prompt replies from also entering the ordinary follow-up queue.
- [x] Prevent duplicate acknowledgements and final answers across reconnect, deduplication, local echo, and controller completion paths.
- [x] Redact sensitive tool, approval, prompt, and transcript data from all acknowledgement and failure messages.
- [x] Add focused broker, bridge, queue, prompt, command, and TUI tests.
- [x] Add a checked-in shared-conversation scenario that sends Telegram messages while idle and while active, then proves each receives one appropriate Telegram response.

## Acceptance criteria

- [x] Every authorized Telegram message in a registered project topic receives a Telegram response.
- [x] A message sent while work is active receives a prompt receipt or queued acknowledgement, then the normal final response when applicable, without consuming a goal run.
- [x] `mastra workflow` and `mastra workflow --run` use one unbounded managed-workflow goal, the currently selected model, and no judge-model or max-run setup dialog.
- [x] Commands and prompt replies receive their intended response without an unnecessary duplicate acknowledgement.
- [x] Unauthorized users, wrong topics, stale callbacks, and duplicate updates receive no project response and do not enter the TUI queue.
- [x] Telegram reconnects do not replay acknowledgements or final answers that were already sent.
- [x] Responses reveal no tool arguments, approval payloads, hidden prompt identifiers, secrets, or terminal transcripts.
- [x] Focused tests, type checking, lint, build, package integration tests, and checked-in Telegram/TUI end-to-end coverage pass.

## Implementation log

- Guidelines loaded for implementation: 00 overview, 01 style and code quality, 02 testing, 06 maintainability, 07 security, and 10 definition of done. Current proof must include strict typing, deterministic path coverage, preserved authorization and redaction boundaries, package-scoped validation, and checked-in TUI integration coverage.
- Response ownership map: the interactive prompt bridge owns prompt replies and stale replies; Telegram command handling owns supported and unsupported commands; the TUI input boundary owns ordinary authorized text; `message_end` owns final assistant output; the broker owns authorization, topic routing, persisted update deduplication, and reconnect behavior.
- Current zero-response paths were ordinary text received while active or before a final answer, empty text, no-model rejection, user-prompt hook rejection, and signal/start failures. The TUI boundary now sends deterministic receipts or failures for those paths without changing broker authorization or prompt binding.
- Managed `mastra workflow` starts use the selected session model with an unbounded persisted goal. Goal evaluations triggered by a `delivery="while-active"` interjection do not consume an autonomous run.
- Verification: focused MastraCode tests passed 78/78, focused core goal tests passed 35/35, the checked-in `telegram-active-acknowledgement` TUI scenario passed, `pnpm build:mastracode` completed 50/50 tasks, package typecheck and lint passed, and the full MastraCode unit suite passed 208/208 files and 2116/2116 tests.
- Automatic review covered standards, spec, bug, and security lenses against `main`. It found no blocker, major, minor, or security findings; the implementation preserves broker authorization/topic boundaries and adds no secret-bearing output.
