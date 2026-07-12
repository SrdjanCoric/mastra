# Task 0020: Return while-active replies to Telegram

**Branch**: `fix/return-while-active-replies-to-telegram`
**Depends on**: 0013
**Source**: user report 2026-07-12 · **User story**: when I send a Telegram message during active work, receive the assistant's reply in Telegram instead of only seeing it in the terminal

## What to build

Fix the Telegram response lifecycle for messages delivered with `delivery="while-active"`. The immediate receipt may still be sent, but the assistant response that answers the interjection must also return to the originating Telegram project topic. Do not send terminal-originated interjection replies to Telegram, duplicate the response, or stop the managed workflow.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep response ownership explicit and tied to Telegram-originated messages.
- [ ] Preserve authorization, project-topic routing, redaction, and managed-workflow continuation.
- [ ] Add deterministic unit and checked-in TUI coverage for receipt, final Telegram reply, no duplicate, and continued work.

## AFK tasks

- [ ] Reproduce why the assistant answer for a Telegram `while-active` message is rendered only in the TUI.
- [ ] Track Telegram origin through the interjection response lifecycle without exposing hidden message metadata.
- [ ] Send the completed interjection answer to Telegram exactly once while allowing the active workflow to continue.
- [ ] Keep terminal-originated interjections terminal-only.
- [ ] Add focused regression tests and a checked-in Telegram/TUI end-to-end scenario.

## Acceptance criteria

- [ ] A Telegram message sent during active work receives both its receipt and the assistant answer in Telegram.
- [ ] The same answer remains visible in the shared TUI conversation.
- [ ] The managed workflow continues after answering and the interjection does not consume a goal run.
- [ ] Terminal-originated interjections do not produce Telegram output.
- [ ] No duplicate Telegram answer is sent.
- [ ] Focused tests, type checking, lint, package validation, and checked-in end-to-end proof pass.
