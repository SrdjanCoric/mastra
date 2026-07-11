# Task 0003: Share one conversation across the TUI and Telegram

**Branch**: `feature/shared-tui-telegram-conversation`
**Depends on**: 0002
**Source**: `ARCHITECTURE.md` · **User stories**: start the stock TUI with Telegram attached; send text from either surface into one session; receive completed replies on Telegram

## What to build

Implement the first complete `mastracode-telegram` happy path. The normal TUI must render and remain fully interactive while an in-process Telegram adapter polls the initialized project topic. Authorized Telegram text enters the active session's native follow-up queue, appears in the TUI with source metadata, and reaches the model unchanged. Every completed assistant message is delivered to Telegram regardless of which surface supplied the input.

## AFK tasks

- [ ] Add failing adapter and TUI integration tests for startup, authorized text, active-turn queueing, idle delivery, source presentation, assistant completion delivery, long-message splitting, unsupported attachments, and clean shutdown.
- [ ] Create an adapter lifecycle owned by the TUI process and bind it to the existing controller/session instead of a headless run or PTY.
- [ ] Expose the narrow TUI/session integration points needed to enqueue remote follow-ups and observe completed assistant messages without duplicating TUI state.
- [ ] Preserve code blocks where practical when splitting long Telegram output and suppress streaming/tool/command noise.

## Acceptance criteria

- [ ] `mastracode-telegram` renders the stock TUI and starts exactly one adapter for the initialized canonical project.
- [ ] Terminal and Telegram messages share the same session and active thread.
- [ ] Telegram messages received during a turn use the native follow-up queue and do not interrupt it.
- [ ] Telegram-originated messages are identifiable in the TUI while model input remains the original text.
- [ ] Completed assistant messages from either input surface reach Telegram once; transient output does not.
- [ ] Closing the TUI stops polling and releases adapter resources.
- [ ] Focused unit/integration tests, TUI tests, lint, typecheck, and build pass.
