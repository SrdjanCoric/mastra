# Task 0015: Acknowledge every Telegram message

**Branch**: `fix/acknowledge-every-telegram-message`
**Depends on**: 0014
**Source**: user request 2026-07-12 · **User stories**: know that each Telegram message reached the active MastraCode session; receive the answer on Telegram even while a workflow is running; avoid wondering whether a status question or instruction was ignored

## What to build

Guarantee that every authorized Telegram message routed to an active project session produces a Telegram response. Cover ordinary instructions, messages delivered while an agent or managed workflow is active, local Telegram commands, prompt replies, queued follow-ups, and messages that fail before normal assistant completion.

Use the existing project topic and identity boundaries. A response may be the final answer when it is available promptly or a short receipt followed by the final answer for queued or long-running work. Do not echo secrets, approval payloads, or prompt internals. Keep replies deterministic and prevent duplicate acknowledgements or duplicate final answers.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep acknowledgement ownership explicit across broker, TUI bridge, queue, command, and prompt paths so one inbound message cannot produce zero or duplicate responses.
- [ ] Preserve authorization, project-topic routing, redaction, approval, and prompt-binding boundaries.
- [ ] Add deterministic tests for idle, active, queued, command, prompt, error, reconnect, and duplicate-delivery paths.
- [ ] Prove the behavior through checked-in TUI and Telegram integration coverage.

## AFK tasks

- [ ] Trace every authorized Telegram inbound path and identify which paths can currently finish without an outbound Telegram response.
- [ ] Define one response lifecycle per inbound message, including receipt, queued state, final answer, command result, prompt consumption, and terminal failure.
- [ ] Send a short Telegram receipt when work cannot answer immediately, while allowing immediate command or final responses to satisfy the response requirement without an extra message.
- [ ] Ensure messages delivered during active managed workflows receive a Telegram response without stopping the workflow.
- [ ] Preserve first-response-wins prompt handling and prevent consumed prompt replies from also entering the ordinary follow-up queue.
- [ ] Prevent duplicate acknowledgements and final answers across reconnect, deduplication, local echo, and controller completion paths.
- [ ] Redact sensitive tool, approval, prompt, and transcript data from all acknowledgement and failure messages.
- [ ] Add focused broker, bridge, queue, prompt, command, and TUI tests.
- [ ] Add a checked-in shared-conversation scenario that sends Telegram messages while idle and while active, then proves each receives one appropriate Telegram response.

## Acceptance criteria

- [ ] Every authorized Telegram message in a registered project topic receives a Telegram response.
- [ ] A message sent while work is active receives a prompt receipt or queued acknowledgement, then the normal final response when applicable.
- [ ] Commands and prompt replies receive their intended response without an unnecessary duplicate acknowledgement.
- [ ] Unauthorized users, wrong topics, stale callbacks, and duplicate updates receive no project response and do not enter the TUI queue.
- [ ] Telegram reconnects do not replay acknowledgements or final answers that were already sent.
- [ ] Responses reveal no tool arguments, approval payloads, hidden prompt identifiers, secrets, or terminal transcripts.
- [ ] Focused tests, type checking, lint, build, package integration tests, and checked-in Telegram/TUI end-to-end coverage pass.
