# Task 0002: Initialize Telegram for a MastraCode project

**Branch**: `feature/telegram-project-initialization`
**Depends on**: 0001
**Source**: `ARCHITECTURE.md` · **User stories**: prepare Telegram safely from the target repository; reuse or recover the project's private forum topic; prove setup before starting the TUI

## What to build

Implement `mastracode-telegram --init` as an isolated, idempotent, user-friendly setup flow adapted from the adjacent remote bridge. It must confirm the selected project, guide interactive users through missing Telegram settings with hidden token input, reuse saved configuration on rerun, validate MastraCode readiness, Git and GitHub prerequisites, Telegram credentials and authorization scope, install or verify workflow skills, map the canonical project to one forum topic, persist non-production readiness state, and complete an end-to-end Telegram connectivity test. It must not install or control launchd.

## AFK tasks

- [x] Add failing tests for first setup, rerun/reuse, missing prerequisites, invalid credentials, wrong group/user scope, deleted-topic recovery, secret permissions, and the absence of launchd behavior.
- [x] Port the minimum setup, config, project registry, Telegram client, readiness, and managed-skill behavior needed from `mastracode-remote` into the MastraCode source architecture.
- [x] Make partial setup failures resumable and report exact corrective actions without leaking credentials.
- [x] Add an automated Telegram API seam and isolated end-to-end setup test that cannot touch production runtime paths or resources.

## Human-in-the-loop tasks

- [x] [confirm-security] Confirm the implemented credential storage, allowed-user/group/topic authorization boundary, and redaction behavior before the task may merge. Approved by the user after reviewing plaintext local token storage, private-group scope, allowed-user trust, project-path disclosure, managed-skill repair, and revocation/recovery consequences.

## Acceptance criteria

- [x] Successful init leaves an isolated readiness marker, restrictive secret storage, verified workflow skills, and a persistent canonical-project/topic mapping.
- [x] Rerunning setup is idempotent and safely recovers a deleted topic.
- [x] Setup validates Git author/repository state and GitHub CLI/remote readiness using actionable errors.
- [x] No launchd service is installed, loaded, stopped, or modified.
- [x] Automated tests prove production paths and the external production checkout remain untouched.
- [x] Focused tests, lint, typecheck, and build pass.

## Implementation log

- Implemented on `feature/telegram-project-initialization` with isolated config/state under `~/.mastracode-telegram/` and no service-management code.
- Added private forum, allowed-user, Git/GitHub, provider-auth, canonical project/topic, managed-skill integrity, and resumable setup validation.
- Added guided project confirmation, hidden token input, missing-setting prompts, saved-config reuse, progress summaries, and exact next-step guidance adapted from `mastracode-remote`.
- Verified 26 focused Telegram tests, MastraCode-only lint/typecheck/build, and package contents including the Telegram executable and bundled workflow skills.
