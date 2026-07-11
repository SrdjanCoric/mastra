# Task 0002: Initialize Telegram for a MastraCode project

**Branch**: `feature/telegram-project-initialization`
**Depends on**: 0001
**Source**: `ARCHITECTURE.md` · **User stories**: prepare Telegram safely from the target repository; reuse or recover the project's private forum topic; prove setup before starting the TUI

## What to build

Implement `mastracode --telegram-init` as an isolated, idempotent setup flow adapted from the adjacent remote bridge. It must validate MastraCode readiness, Git and GitHub prerequisites, Telegram credentials and authorization scope, install or verify workflow skills, map the canonical project to one forum topic, persist non-production readiness state, and complete an end-to-end Telegram connectivity test. It must not install or control launchd.

## AFK tasks

- [ ] Add failing tests for first setup, rerun/reuse, missing prerequisites, invalid credentials, wrong group/user scope, deleted-topic recovery, secret permissions, and the absence of launchd behavior.
- [ ] Port the minimum setup, config, project registry, Telegram client, readiness, and managed-skill behavior needed from `mastracode-remote` into the MastraCode source architecture.
- [ ] Make partial setup failures resumable and report exact corrective actions without leaking credentials.
- [ ] Add an automated Telegram API seam and isolated end-to-end setup test that cannot touch production runtime paths or resources.

## Human-in-the-loop tasks

- [ ] [confirm-security] Confirm the implemented credential storage, allowed-user/group/topic authorization boundary, and redaction behavior before the task may merge.

## Acceptance criteria

- [ ] Successful init leaves an isolated readiness marker, restrictive secret storage, verified workflow skills, and a persistent canonical-project/topic mapping.
- [ ] Rerunning setup is idempotent and safely recovers a deleted topic.
- [ ] Setup validates Git author/repository state and GitHub CLI/remote readiness using actionable errors.
- [ ] No launchd service is installed, loaded, stopped, or modified.
- [ ] Automated tests prove production paths and the external production checkout remain untouched.
- [ ] Focused tests, lint, typecheck, and build pass.
