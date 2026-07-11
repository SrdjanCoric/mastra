# Task 0003: Share one conversation across the TUI and Telegram

**Branch**: `feature/shared-tui-telegram-conversation`
**Depends on**: 0002
**Source**: `ARCHITECTURE.md` · **User stories**: start the stock TUI with Telegram attached; send text from either surface into one session; receive completed replies on Telegram

## What to build

Implement the first complete `mastracode-telegram` happy path. The normal TUI must render and remain fully interactive while an ephemeral shared broker owns Telegram polling for all connected project TUIs. Each TUI registers its canonical project and persistent topic over a user-only local socket. Authorized Telegram text is routed to that project's active session, enters its native follow-up queue, appears in the TUI with source metadata, and reaches the model unchanged. Every completed assistant message is sent back through the broker regardless of which surface supplied the input.

Adapt `mastracode-remote`'s `daemon`, `TelegramBotClient`, `TelegramUpdateRouter`, and polling behavior into a transport-only broker. Reuse its single-poller, group/user/topic filtering, project registry, message splitting, and outbound delivery logic, but replace workflow-runtime ownership with versioned IPC to native TUI controllers. The first TUI starts the broker, concurrent project TUIs reuse it, and the broker exits after the last client disconnects and a short grace period.

## AFK tasks

- [ ] Add failing broker, adapter, and TUI integration tests for first-client startup, second-project reuse, topic isolation, startup races, authorized text, active-turn queueing, idle delivery, source presentation, assistant completion delivery, long-message splitting, unsupported attachments, disconnects, and last-client shutdown.
- [ ] Adapt the remote daemon/poller into an ephemeral single-instance broker with a user-only Unix socket, versioned IPC, project/topic registration, and no launchd integration.
- [ ] Create a project adapter lifecycle owned by each TUI process and bind it to the existing controller/session instead of a headless run or PTY.
- [ ] Expose the narrow TUI/session integration points needed to enqueue broker-delivered follow-ups and observe completed assistant messages without duplicating TUI state.
- [ ] Make init's bidirectional connectivity test use the active broker when present and otherwise acquire the broker lock temporarily before polling.
- [ ] Preserve code blocks where practical when splitting long Telegram output and suppress streaming/tool/command noise.

## Acceptance criteria

- [ ] `mastracode-telegram` renders the stock TUI, starts or connects to exactly one broker per bot token, and registers exactly one adapter for the initialized canonical project/topic.
- [ ] Two project TUIs can share one private forum group concurrently, and each topic routes only to its registered project session.
- [ ] Terminal and Telegram messages share the same session and active thread for that project.
- [ ] Telegram messages received during a turn use the native follow-up queue and do not interrupt it.
- [ ] Telegram-originated messages are identifiable in the TUI while model input remains the original text.
- [ ] Completed assistant messages from either input surface reach Telegram once; transient output does not.
- [ ] Closing one TUI unregisters only its project; closing the last client causes the broker to exit after its grace period.
- [ ] Focused broker/unit/integration tests, multi-TUI routing tests, TUI tests, lint, typecheck, and build pass.
