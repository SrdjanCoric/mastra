# Task 0020: Return while-active replies to Telegram

**Branch**: `fix/return-while-active-replies-to-telegram`
**Depends on**: 0013
**Source**: user report 2026-07-12 · **User story**: when I send a Telegram message during active work, receive the assistant's reply in Telegram instead of only seeing it in the terminal

## What to build

Fix the Telegram response lifecycle for messages delivered with `delivery="while-active"`. The immediate receipt may still be sent, but the assistant response that answers the interjection must also return to the originating Telegram project topic. Do not send terminal-originated interjection replies to Telegram, duplicate the response, or stop the managed workflow.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [x] Keep response ownership explicit and tied to Telegram-originated messages.
- [x] Preserve authorization, project-topic routing, redaction, and managed-workflow continuation.
- [x] Add deterministic unit and checked-in TUI coverage for receipt, final Telegram reply, no duplicate, and continued work.

## AFK tasks

- [x] Reproduce why the assistant answer for a Telegram `while-active` message is rendered only in the TUI.
- [x] Track Telegram origin through the interjection response lifecycle without exposing hidden message metadata.
- [x] Send the completed interjection answer to Telegram exactly once while allowing the active workflow to continue.
- [x] Keep terminal-originated interjections terminal-only.
- [x] Add focused regression tests and a checked-in Telegram/TUI end-to-end scenario.

## Acceptance criteria

- [x] A Telegram message sent during active work receives both its receipt and the assistant answer in Telegram.
- [x] The same answer remains visible in the shared TUI conversation.
- [x] The managed workflow continues after answering and the interjection does not consume a goal run.
- [x] Terminal-originated interjections do not produce Telegram output.
- [x] No duplicate Telegram answer is sent.
- [x] Focused tests, type checking, lint, package validation, and checked-in end-to-end proof pass.

## Implementation evidence

- Active signal IDs are now paired with their Telegram or terminal origin and consumed only by the next completed assistant text response.
- Telegram-originated active interjections route that response to the project topic once; terminal-originated active interjections suppress only that response while preserving the existing shared-conversation behavior for ordinary turns.
- Verification passed: 209 unit files / 2,125 tests, package type checks, lint, build, and the checked-in `telegram-active-acknowledgement` scenario.
