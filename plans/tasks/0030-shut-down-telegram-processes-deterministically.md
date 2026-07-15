# Task 0030: Shut down Telegram and TUI-owned processes deterministically

**Branch**: `feature/deterministic-telegram-process-shutdown`
**Depends on**: 0029 (shared: TUI lifecycle and startup path)
**Source**: talk-it-through 2026-07-14 · **User stories**: closing MastraCode closes that project's Telegram connection; closing the final TUI leaves no broker, retry, or owned helper process behind; a broken connection is terminated before recovery

## What to build

Give every normal and abnormal TUI exit one idempotent shutdown contract while preserving original MastraCode Ctrl+C behavior. The first Ctrl+C still aborts active work without disconnecting Telegram; the established second Ctrl+C exit, Ctrl+D, terminal `/exit`, process signals, terminal loss, fatal failure, and forced parent death all release the project lease and terminate TUI-owned work. A shared broker remains while another project TUI is live and exits promptly after the final lease disappears.

Recovery is owned by a live TUI lease. Fully terminate the broken socket, poller, outbound work, timers, and helper state before one clean replacement attempt. If that attempt fails, leave Telegram offline until a deliberate terminal reconnect. Exiting the final TUI cancels recovery and prevents any later restart.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `03-documentation.md`, `06-code-health-and-maintainability.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep strict TypeScript, deterministic formatting, established naming, and narrow lifecycle abstractions; prove with focused lint, typecheck, and format checks.
- [ ] Add deterministic unit, integration, multi-process, and TUI end-to-end coverage for normal exit, forced death, final-client broker exit, cancellation, and recovery failure; prove with focused MastraCode and affected core commands before broader checks.
- [ ] Update architecture, command/help, and troubleshooting documentation for the final shutdown and manual-reconnect contract; prove links and commands remain accurate.
- [ ] Avoid duplicate lifecycle paths, uncancellable waits, and unowned timers; prove all owned resources are registered with one idempotent cleanup coordinator.
- [ ] Preserve private local IPC and state boundaries during cleanup and stale-state recovery; use synthetic credentials and isolated temporary state in tests.
- [ ] Record focused tests, typecheck, lint, build, higher-level process proof, documentation decision, and changeset evidence before completion.

## AFK tasks

- [ ] Write failing lifecycle tests first for the broker startup-registration gap, final socket/lease loss, pending long poll, outbound request, reconnect/retry/verification timers, and shutdown grace deadline.
- [ ] Route double Ctrl+C exit, Ctrl+D, terminal `/exit`, SIGINT, SIGTERM, SIGHUP or terminal loss, fatal exit, and forced TUI death through the same idempotent cleanup outcome without changing first-Ctrl+C abort behavior.
- [ ] Revoke the exiting project's lease, close its adapter/socket, release locks, and remove only ephemeral socket, PID, retry, and registration state while preserving Telegram configuration, topic mapping, offsets, deduplication state, readiness, and redacted logs.
- [ ] Abort in-flight polling and outbound requests, cancel every retry/reconnect/verification/grace timer, and stop the broker within two seconds after the final TUI lease is gone.
- [ ] Add a startup registration deadline so a detached broker that never receives its first live client cannot remain polling indefinitely.
- [ ] Terminate all TUI-owned process trees, including agent-started background work and MastraCode-owned hooks, LSP, MCP, voice, browser, and power-management helpers, while leaving independently started services, external sandboxes, terminal multiplexers, and other projects untouched.
- [ ] Make power-management helpers follow the TUI parent's lifetime even when JavaScript cleanup cannot run.
- [ ] Tear down a broken connection completely before one lease-bound restart attempt; cancel the attempt on exit and require a terminal-only reconnect after it fails.
- [ ] Prove with real child processes that normal exit and forced parent death leave no project adapter, final broker, retry work, or owned helper alive, while a broker shared by another live TUI remains available.

## Acceptance criteria

- [ ] First Ctrl+C aborts active work and leaves the TUI and Telegram connected; the established exit gesture and every other exit path terminate the project session.
- [ ] No project adapter, TUI-owned process tree, poller, outbound request, retry timer, or helper survives its owning TUI.
- [ ] The broker remains available when another registered project TUI is live and exits within two seconds after the final live lease disappears, including forced TUI death and failed initial registration.
- [ ] A broken connection is fully terminated before one clean recovery attempt, never restarts without a live lease, and requires deliberate terminal reconnection after the attempt fails.
- [ ] Shutdown removes only ephemeral ownership state and preserves durable Telegram routing and deduplication state.
- [ ] No Telegram instruction that lacked a live TUI owner executes automatically on a later launch.
- [ ] Focused unit, integration, multi-process, and checked-in TUI end-to-end tests cover all supported exit and recovery paths without real Telegram credentials.
