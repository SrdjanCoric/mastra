# Task 0013: Simplify Telegram init verification

**Branch**: `feature/simplify-telegram-init-verification`
**Depends on**: 0015
**Source**: user request 2026-07-12 · **User stories**: copy or reply to the verification code without extracting it from instructions; complete init when Telegram changes letter casing; keep unrelated Telegram messages out of the verification path

## What to build

Make the Telegram round-trip check in `mastracode-remote --init` easier to complete. Send the explanation and the exact verification code as two separate Telegram messages in the project topic. Match the authorized reply after trimming whitespace and normalizing letter case, so equivalent replies such as `verify ABC123`, `Verify ABC123`, and `VERIFY ABC123` all succeed.

Keep the existing security and routing boundaries unchanged: the reply must still come from the configured allowed user and the same project topic, expired or incorrect codes must fail, and verification traffic must not enter the normal TUI message queue.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `10-definition-of-done.md`

- [ ] Keep verification matching explicit, strictly typed, and limited to the existing init round-trip path.
- [ ] Add deterministic tests for the two-message Telegram output, accepted casing variants, whitespace trimming, wrong codes, wrong users, wrong topics, timeout cleanup, and normal-message routing.
- [ ] Run the focused Telegram test slice and the package-scoped MastraCode validation commands from the repository root.

## AFK tasks

- [ ] Change init verification to send a short instruction message followed by the exact verification code in its own Telegram message.
- [ ] Normalize stored verification keys and incoming replies with trimming and locale-independent case normalization before matching.
- [ ] Preserve allowed-user, project-topic, timeout, deduplication, and normal-delivery behavior.
- [ ] Extend broker and setup tests to prove the full verification lifecycle and prevent regressions.

## Acceptance criteria

- [ ] Telegram receives the verification instructions and the exact code as separate messages in the selected project topic.
- [ ] Replies that differ only by ASCII letter case or surrounding whitespace complete verification.
- [ ] Wrong codes, unauthorized users, replies from another topic, and expired replies do not complete verification.
- [ ] A successful verification reply is consumed internally and is not delivered as a user instruction to the TUI.
- [ ] Focused Telegram tests, type checking, lint, and the package-scoped MastraCode validation pass.
