# Task 0033: Harden Telegram privacy within the original security model

**Branch**: `feature/telegram-security-parity`
**Depends on**: 0031
**Source**: talk-it-through 2026-07-14 · **User stories**: Telegram must not give the agent new credential access or expose canonical paths; implementation agents should be reminded never to inspect secret material; the change must stay small and avoid containers or a general sandbox redesign

## What to build

Harden only the trust boundaries introduced by MastraCode Remote. Keep the original MastraCode local-agent permission model unchanged: this task does not add containers, native sandboxing, a project-wide secret scanner, or general filesystem isolation. Ensure Telegram credentials and broker-only configuration are not added to agent context, tools, command environments, model messages, or ordinary output, and remove canonical filesystem paths from Telegram-visible messages.

Add one concise behavioral rule to the bundled `mastra-implement-next-task` skill: implementation agents must never read, search, print, or expose `.env*`, credential files, private keys, secret stores, or environment variables, and must request sanitized information when needed. Treat this as instruction-level defense in depth, not a hard security guarantee.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `03-documentation.md`, `07-security.md`, `10-definition-of-done.md`

- [ ] Keep privacy policy helpers narrow, strictly typed, redaction-safe, and consistently named; prove with focused lint, typecheck, and format checks.
- [ ] Add deterministic tests with synthetic sentinel secrets for token separation, path omission, local IPC limits, permissions, and log redaction; no test may use or print a real credential.
- [ ] Document the exact security boundary: Telegram-specific separation plus instruction-level secret avoidance, with original MastraCode local permissions and the no-container non-goal stated accurately.
- [ ] Preserve existing secret-detection and security checks and verify this change introduces no committed credential or weakened authorization path.
- [ ] Record focused tests, typecheck, lint, build, security-boundary proof, documentation decision, and changeset evidence before completion.

## AFK tasks

- [ ] Write failing tests first using synthetic bot tokens, credential-shaped values, canonical paths, oversized IPC frames, permissive parent directories, and redaction-sensitive errors.
- [ ] Keep saved Telegram credentials and broker configuration in the trusted broker/setup boundary and prevent Telegram-specific environment variables from entering the agent command environment or model/tool context.
- [ ] Replace canonical project paths in Telegram setup, status, recovery, error, and lifecycle messages with a safe project display name or opaque identifier.
- [ ] Enforce user-only permissions on Telegram runtime parent directories, configuration, sockets, state, and logs, including creation and repair of existing overly permissive paths.
- [ ] Bound local broker IPC messages and fail safely on oversized, malformed, or unauthenticated frames without retaining the connection or sensitive payload in logs.
- [ ] Preserve sender, group, topic, project registration, and live-session authorization checks for messages and commands; prove delayed and cross-project inputs cannot cross the boundary.
- [ ] Keep default and debug logs free of bot tokens, message bodies, assistant content, command output, approval arguments, file contents, and canonical project paths.
- [ ] Add the agreed one-line secret-avoidance rule to every bundled invocation of `mastra-implement-next-task` without editing project `AGENTS.md` files automatically.
- [ ] Explicitly document and test the non-goal: this task does not change the original local agent's general ability to access project files or inherited non-Telegram credentials.

## Acceptance criteria

- [ ] Telegram introduces no new bot credential or broker configuration into agent tools, model context, or command environments.
- [ ] Telegram-visible messages and logs omit canonical project paths and all configured Telegram secrets.
- [ ] Runtime directories and files are user-only, and local IPC rejects oversized or malformed input within a fixed bound.
- [ ] Authorization remains bound to the configured sender, private group, topic, project registration, and live TUI session.
- [ ] `mastra-implement-next-task` contains the agreed one-line instruction never to inspect or expose secret material and to request sanitized information instead.
- [ ] Documentation clearly states that the instruction is behavioral defense in depth and that containers or broad sandbox changes are outside scope.
- [ ] Focused security and integration tests use only synthetic secrets and prove redaction, separation, permissions, and boundary failures.
