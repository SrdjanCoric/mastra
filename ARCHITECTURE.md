# MastraCode Telegram TUI architecture

Status: agreed for the `experiment/telegram-tui` branch on 2026-07-11.

## Goal

Add an optional Telegram interface to the stock MastraCode TUI as the separately published npm package `@srdjancoric/mastracode-telegram`. `mastracode-telegram --init` prepares its isolated runtime, and `mastracode-telegram` starts the normal TUI with Telegram attached to the same controller, session, and active thread. The package is built and published only from the monorepo's `mastracode/` workspace. The official `mastracode` package and executable remain unchanged and can coexist without being overwritten.

The adjacent `../mastracode-remote` repository at baseline `3a68c86` is implementation input for Telegram setup, project registration, security, routing, and tests. The Mastra repository is the implementation and publication repository; do not modify the production checkout outside this workspace.

Repository isolation is explicit: the Mastra checkout pushes only to the `SrdjanCoric/mastra` fork and fetches upstream from `mastra-ai/mastra`; the bridge checkout pushes only to the private `SrdjanCoric/mastracode-remote-telegram` experiment repository and fetches upstream from `SrdjanCoric/mastracode-remote`. Push URLs for both upstream remotes are disabled.

## Runtime ownership and isolation

- Each TUI process owns its MastraCode controller, session, active thread, native follow-up queue, prompt/approval state, and project-scoped Telegram adapter client.
- One ephemeral local broker per configured bot token owns the single Telegram polling connection, global update offset, deduplication state, outbound API calls, and routing between the private forum topics and connected TUI processes.
- The first Telegram-enabled TUI starts the broker on demand. Additional project TUIs connect through a user-only Unix socket. After the last TUI disconnects, the broker exits after a short grace period; it is not installed with launchd and does not survive as a login service.
- Closing one TUI ends Telegram control for that project. Closing the last connected TUI ends the broker and all Telegram control. Long-lived detached TUI operation may still use an external terminal multiplexer.
- Telegram-enabled runs use an experiment-specific configuration directory, state, session files, package/runtime identity, broker socket/PID/offset state, project locks, logs, readiness markers, and Telegram bot or test group.
- The experiment must not read or write production `~/.mastracode-remote/` state, control its launchd service, or publish over its runtime package version.
- Only one Telegram-enabled TUI may own a canonical project path at a time. The broker permits different canonical projects to run concurrently and routes each one only through its registered topic. Locks and registrations must be released safely after normal exit or crash recovery.

## Setup and skills

- `mastracode-telegram --init` adapts the proven remote setup flow without installing launchd. It validates MastraCode authentication/model readiness, Git and author identity, GitHub CLI/repository readiness, Telegram credentials and private forum routing, managed workflow skills, isolated readiness state, and an end-to-end Telegram test. The test uses the broker when one is active and otherwise temporarily owns the bot update connection under the same broker lock, so it cannot consume updates from a running TUI.
- Skill discovery for this build is limited to `<project>/.mastracode/skills` and `~/.mastracode/skills`. `.claude/skills`, `.agents/skills`, and other agent-specific locations are excluded in both ordinary and Telegram-enabled runs.
- The existing packaged-runtime patch is source material only. Its asynchronous policy resolution and scoped skill discovery behavior must be implemented in TypeScript source with focused tests, not by editing compiled `dist` files.

## Routing and messages

- One configured private Telegram forum group is shared across projects. Each canonical project path maps to one persistent forum topic in that group.
- The broker routes inbound updates by configured group ID and registered topic ID to exactly one connected project TUI. Outbound envelopes from a TUI are accepted only for that TUI's registered project/topic pair.
- The project topic follows the thread currently active in its TUI. Thread creation and switching remain native terminal operations; Telegram receives a short thread-change notice.
- Ordinary Telegram text enters the session's native follow-up queue and never injects PTY keystrokes or starts a second headless run.
- Telegram receives completed assistant messages, prompt/approval requests, thread changes, and start/completion/interruption/failure events. It does not receive token streaming, transient TUI output, tool noise, shell output, secrets, or full transcripts.
- Telegram-originated text is visibly identified in the TUI, while the model receives the original content without a decorative prefix.
- V1 accepts text only. Unsupported attachments get a clear response. Long messages are split around Telegram limits while preserving code blocks when practical.

## Commands and control

- Telegram v1 exposes `/status`, `/stop`, and `/help` only.
- `/status` is deterministic and includes project, active thread, model, mode, run state, safe current task/tool summary, queued follow-up count, active-turn duration, and Telegram health. It excludes command output, secrets, prompts, and transcripts.
- `/stop` aborts the active turn/tool execution, clears queued Telegram follow-ups, and leaves the TUI, connection, and thread alive. Telegram cannot terminate the process.
- Model selection, thread switching, settings, shell passthrough, and privileged TUI commands remain terminal-only.

## Questions, approvals, and security

- One configured operator may answer the same prompt-specific questions and approval requests from either surface.
- Each pending interaction has a unique identity. Delayed or duplicate Telegram updates cannot resolve a later prompt, and an interaction answered locally is not replayed remotely.
- Control is accepted only when sender ID, private group, and project topic match saved configuration. Risk context is redacted and nothing is approved automatically.

## Failure and recovery

- Telegram or broker failure degrades every affected project to local-only operation. Each TUI remains usable and displays connection state while the broker or its client connection recovers with bounded exponential backoff.
- The broker is a single-instance process per bot token with a user-only socket, atomic PID/socket ownership, versioned IPC, connected-project registrations, last-client grace shutdown, and stale-process recovery.
- Reconnection sends one project-scoped recovery notice and current status. A broker-owned bounded delivery queue prioritizes completed conversation messages over low-priority notices without allowing one project to starve another.
- The broker persists the global update offset and processed message IDs to prevent duplicates, while each TUI owns its native follow-up queue. Instructions not delivered to a live registered project before a crash are reported as unprocessed and require resubmission.
- Missing topics use safe topic recovery or report the exact repair action.
- Default logs contain lifecycle, retry, routing, project/thread, prompt, and Telegram identifiers only. Tokens, message bodies, assistant content, command output, approval arguments, and file contents are excluded. Debug diagnostics remain redacted.

## Publication gate

Publication requires isolated init, an ephemeral single-poller broker, concurrent routing for multiple project topics in one private group, stock TUI rendering, one shared session/thread per project across both surfaces, native follow-up queue behavior, mirrored completed messages, cross-surface prompts and approvals, correct model/thread reflection, command behavior, safe broker/client reconnect and deduplication/stale-reply/topic/crash handling, unchanged ordinary CLI behavior, MastraCode-only skill discovery, untouched production state, focused tests, multi-TUI broker integration tests, TUI end-to-end tests, packaging checks, and a manual live Telegram test.
