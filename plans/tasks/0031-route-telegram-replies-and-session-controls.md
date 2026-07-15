# Task 0031: Route Telegram replies and remote session controls explicitly

**Branch**: `feature/explicit-telegram-replies-and-controls`
**Depends on**: 0030
**Source**: talk-it-through 2026-07-14 · **User stories**: every Telegram message receives its answer on Telegram as well as in the terminal; unrelated terminal conversations stay local; an authorized operator can stop work or exit the matching project safely from Telegram

## What to build

Make message ownership explicit across the shared conversation. Every accepted Telegram message gets an immediate acknowledgement, waits for the next safe interaction boundary when work is active, and produces exactly one direct outcome on both the terminal and Telegram. Ordinary terminal-originated conversation remains terminal-only. Telegram additionally receives meaningful goal-state changes, but not intermediate model, tool, retry, or progress chatter.

Keep `/stop` as a non-terminating shared-session control and add a project-scoped two-step `/exit`. `/exit` opens a five-minute confirmation owned by the same authorized user, private group, project topic, and live session; `/exit confirm` must be the next command and invokes the deterministic shutdown path from task 0030. Other projects and the terminal application itself remain untouched.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `03-documentation.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep message-origin, delivery, and command state strictly typed and independently testable; prove with focused lint, typecheck, and format checks.
- [ ] Add meaningful unit, integration, and checked-in TUI end-to-end tests for direct replies, queue ordering, cancellation, confirmation expiry, authorization, duplicates, and delivery failure.
- [ ] Update Telegram command/help and architecture documentation for direct replies, meaningful goal updates, `/stop`, and confirmed `/exit`.
- [ ] Centralize reply ownership and confirmation state so delivery and cleanup rules are not duplicated across the TUI and broker.
- [ ] Bind remote controls to the configured sender, private group, project topic, and current live session; never let delayed or duplicate input act on a later session.
- [ ] Record focused tests, typecheck, lint, build, higher-level shared-conversation proof, documentation decision, and changeset evidence before completion.

## AFK tasks

- [ ] Write failing tests first for Telegram-origin direct replies, terminal-origin suppression, rapid queued inputs, safe-boundary handling, meaningful goal events, `/stop`, and `/exit` confirmation state.
- [ ] Carry explicit origin and correlation identity through immediate, queued, prompt-answer, resumed, successful, rejected, and failed message paths so every Telegram input receives one acknowledgement and one outcome without duplicates.
- [ ] Render a Telegram-originated exchange in the terminal and deliver the same final response to Telegram; save it once in shared history rather than creating duplicate conversations.
- [ ] Keep unrelated terminal-originated assistant replies local. Send Telegram only direct Telegram replies and meaningful goal started/resumed, decision-or-question, paused/blocked, completed, or failed state changes.
- [ ] Exclude token streaming, tool activity, shell output, internal retries, heartbeats, attempt counts, and routine milestones from Telegram delivery.
- [ ] Queue ordinary Telegram interjections until the next safe boundary, then answer them and resume autonomous work without changing goal accounting. Only an explicit control command interrupts active work immediately.
- [ ] Make `/stop` abort active work regardless of origin, pause the goal without consuming an attempt, clear all queued terminal and Telegram follow-ups, confirm on both surfaces, and leave the TUI, thread, broker lease, and Telegram connection alive.
- [ ] Implement `/exit` followed by `/exit confirm` as the next command within five minutes from the same authorized user/topic/session. Reject standalone, expired, duplicate, cross-topic, or stale confirmations without shutting anything down.
- [ ] Send the final exit acknowledgement before invoking deterministic project shutdown; retain the shared broker when another project TUI is live.
- [ ] Retry direct delivery only while the current TUI lease is live. Mark an undelivered reply locally on exit and do not send stale content automatically on a later launch.

## Acceptance criteria

- [ ] Every accepted Telegram message appears in the terminal and receives its direct answer, question, waiting state, or deterministic failure on Telegram exactly once.
- [ ] Unrelated terminal-originated conversation is not mirrored to Telegram.
- [ ] Telegram receives only direct replies and the agreed meaningful goal-state changes, never internal activity or run metadata.
- [ ] Active-run messages wait for a safe boundary unless the operator sends `/stop` or completes the `/exit` confirmation flow.
- [ ] `/stop` aborts and clears the shared session queue without exiting or consuming a managed-workflow attempt.
- [ ] `/exit confirm` works only for a live, matching, pending confirmation and shuts down exactly that project session through task 0030's cleanup contract.
- [ ] Undelivered replies are not automatically replayed after a later launch.
- [ ] Controlled unit, integration, and TUI end-to-end tests prove routing and control behavior without a real bot or production data.
