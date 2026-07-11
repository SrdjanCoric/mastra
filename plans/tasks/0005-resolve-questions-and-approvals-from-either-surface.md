# Task 0005: Resolve questions and approvals from either surface

**Branch**: `feature/cross-surface-prompts-and-approvals`
**Depends on**: 0004
**Source**: `ARCHITECTURE.md` · **User stories**: answer a question or approve/deny a prompt from Telegram or the terminal; prevent delayed replies from affecting later prompts

## What to build

Bridge prompt-specific questions, tool approvals, and suspended-tool interactions to Telegram while preserving the native terminal UI. The first valid response from either surface resolves the exact pending interaction. Port asynchronous policy resolution from the runtime patch into source so runs cannot complete while a remote decision is pending.

Adapt `mastracode-remote`'s `telegram-wait-bridge` reply parsing, allowed-user/thread checks, and exact approval/denial vocabulary, then strengthen it with prompt identities and first-response-wins coordination against the native TUI interaction APIs. Do not reuse the daemon or workflow-runner ownership model.

## AFK tasks

- [x] Add failing tests for question answers, approvals, denials, local-first and Telegram-first races, duplicate delivery, delayed/stale replies, cancellation, shutdown, policy rejection, and agent-end while a decision promise is pending.
- [x] Assign unique identities to pending interactions and include only redacted action/risk context in Telegram prompts.
- [x] Connect Telegram replies to the same session response APIs used by the TUI and invalidate the losing surface cleanly.
- [x] Implement source-level asynchronous approval/suspension policy handling and prevent premature run completion.
- [x] Ensure ordinary Telegram text cannot be mistaken for an approval without matching the current prompt identity and scope.

## Human-in-the-loop tasks

- [ ] [confirm-security] Confirm the authorization checks, prompt identity binding, approval/denial semantics, redaction, and stale-reply protections before merge.

## Acceptance criteria

- [x] Authorized questions and approvals can be resolved from either surface exactly once.
- [x] Sender, private group, project topic, and pending prompt identity must all match.
- [x] Delayed, repeated, unauthorized, wrong-topic, and already-resolved replies cannot affect current or later work.
- [x] Nothing is automatically approved; ambiguous answers remain answers or receive corrective guidance rather than approval.
- [x] Pending asynchronous policy responses keep the run alive and failures surface safely.
- [x] Focused policy, session, adapter, and TUI tests plus lint, typecheck, and build pass.

## Implementation log

- Added a prompt coordinator with six-character identities, exact approval/denial parsing, first-response-wins claims, stale/duplicate guidance, and cancellation on stop, shutdown, or thread change.
- Routed `ask_user`, sandbox access, plan approval, and tool approval responses from Telegram through the same native session APIs as terminal responses; Telegram prompts redact paths/secrets and omit tool arguments.
- Made headless resolution policies promise-aware and kept runs open while asynchronous approval/suspension decisions are pending.
- Extended the checked-in `telegram-shared-conversation` TUI scenario to resolve an `ask_user` prompt from Telegram.
- Verified 9 focused files / 116 tests, package typecheck, package lint, `build:mastracode`, and the focused Telegram TUI e2e scenario.
