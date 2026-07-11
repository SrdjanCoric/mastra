---
name: mastra-implement-next-task
description: Implement the next eligible task from the master plan end-to-end on a feature branch. Run AFK by default, use Telegram checkpoints only for true human decisions/verification/DB/security confirmation, run automatic task review with two fix retries, create/merge the PR, sync main, and return for the master workflow to start the next task.
---

# Mastra Implement Next Task

Implement one eligible task completely. This managed skill is called by `mastra-workflow`; it should keep going until the selected task is merged, synced to `main`, and marked done, unless the user explicitly stops the workflow or a required human checkpoint is waiting.

## Plan model

The project has one master plan, usually named from `AGENTS.md` or `CLAUDE.md` as the active plan. Its `## Tasks` checklist has stable pointers:

- `[ ]` — todo, unclaimed.
- `[~]` — claimed/in progress.
- `[>]` — implementation and PR are done, awaiting merge/sync closeout.
- `[x]` — merged to `main`; task file has moved to `plans/tasks/done/`.

A pointer may carry `(after NNNN, ...)`. A task is eligible only when it is `[ ]` and every listed dependency is `[x]`. `[>]` does not unblock dependents because the code is not confirmed on local `main` until `mastra-sync-main` closes it out.

## Human checkpoint policy

Most work is AFK. Use Telegram wait/resume checkpoints only for true human-only cases:

- `[decision]`: product, architecture, scope, UX, or behavior choice that cannot be inferred from the plan/repo.
- `[verify]`: manual/human-only verification that cannot be converted into a test, script, smoke check, log assertion, screenshot check, API call, or local state inspection.
- `[confirm-db]`: real, shared, persistent, destructive, or ambiguous DB/schema/data action. Local isolated test DB work is AFK.
- `[confirm-security]`: security-sensitive action involving auth, permissions, sessions, secrets, crypto, sandbox/CI boundary, dependency trust, or another trust boundary.

Before asking, investigate. If an item can be proven by tests, typecheck, build, logs, API responses, screenshots, or local state, do that instead of asking and record the proof in the task log. Ask one question at a time, include the evidence and recommended answer, wait indefinitely for Telegram, and resume from the reply.

## Workflow

### 1. Select and claim

Read the master plan directly. Select the first eligible `[ ]` pointer, or the requested ordinal/path if it is eligible. If no task is eligible, report why: complete, blocked by dependencies, or waiting for prior `[>]` sync.

Immediately flip the selected pointer `[ ]→[~]` before doing implementation work. This is the concurrency marker. No git worktree flow is used.

Read the selected task file in full: branch, AFK items, checkpoint items, acceptance criteria, implementation notes, and referenced decision docs.

### 2. Prepare the branch

Check the working tree. If local uncommitted work would be overwritten, stop for a Telegram checkpoint before changing branches.

Update `main`, then create or check out the task branch named in the task file. All task changes happen on that branch.

### 3. Resolve human checkpoints as reached

Resolve `[decision]`, `[verify]`, `[confirm-db]`, and `[confirm-security]` only when the relevant work is reached. Prefer proof over questions, except for real DB/security confirmation tags. Use `mastra-talk-it-through` for product/design uncertainty that needs a short interview.

### 4. Implement and self-verify

Build the AFK items. Follow the repo’s testing conventions and use test-first development when practical. Run relevant checks before review: focused tests, typecheck/build/lint/format, or the project’s equivalent gates.

Do not bend tests to pass. Fix root causes.

### 5. Run automatic task review

Invoke `mastra-task-review` with:

- `base=main`
- `spec=` the verbatim task file plus referenced decision docs
- `attempt=initial`

`mastra-task-review` returns structured findings only. It does not write review files and does not ask the user. You get two retry rounds after the initial review before escalating to diagnosis.

Handle findings this way:

1. If there are no `blocker` or `major` findings, continue.
2. Fix safe `blocker`/`major` bug, standards/test-quality, and spec findings.
3. Rerun `mastra-task-review` with `attempt=retry-1`.
4. If safe `blocker`/`major` findings remain, fix once more and rerun with `attempt=retry-2`.
5. If `blocker`/`major` findings still remain after the second retry, invoke `mastra-diagnose` with the review findings, attempted fixes, failing commands, relevant diff, and task context. If the diagnostic context is too large or the failure needs a fresh agent, first invoke `mastra-handoff` to create a focused bug handoff, then invoke `mastra-diagnose` on that handoff.
6. Ask the user only if diagnosis proves the remaining issue needs a real human decision, manual verification, DB confirmation, or security confirmation.

Security findings are special: do not auto-dismiss or down-rank them. Fix obvious safe in-scope security bugs only when the safe action is clear; otherwise use `[confirm-security]`.

### 6. Run end-to-end proof

After task review and its required fixes, when generally possible, run an unattended end-to-end proof of the highest-level operator-visible behavior changed by the issue. Prefer Playwright MCP for browser behavior and executable scripts or disposable environments for CLI, API, Git, and provider workflows. When a literal end-to-end proof is not reasonably possible, record the concrete reason and run the highest-level automated substitute; unit tests alone are not end-to-end proof.

### 7. Update docs and task log

If the task changes user-facing behavior, setup, commands, configuration, workflow, or product story, update `README.md` before PR. Use `mastra-write-well` for user-facing prose when available. If no README change is needed, record why in the task log.

Update the task file with:

- checked AFK/checkpoint/acceptance items that are actually complete,
- implementation notes,
- verification commands and results,
- review attempt summary,
- end-to-end proof result or concrete reason for substitute proof,
- README decision,
- any human checkpoint answers.

Do not mark the task `[x]` here.

### 8. Create and merge PR

Invoke `mastra-create-pr` to commit, push, open the PR, wait for required checks, recover safe CI failures, and merge on the happy path. The master workflow is AFK by default; do not ask for PR approval unless repo policy, credentials, branch protection, security, or ambiguity requires a human.

After the PR exists and corresponds to this task branch, flip `[~]→[>]`. `mastra-create-pr` then owns waiting for checks and merging the PR.

### 9. Sync main and close out

After `mastra-create-pr` reports the PR merged, invoke `mastra-sync-main`. It checks out `main`, pulls the merge, confirms the merge landed locally, cleans safe merged branches, flips `[>]→[x]`, moves the task file to `plans/tasks/done/`, and records the merge closeout. No git worktree cleanup is involved.

Return to `mastra-workflow` only after this selected task is closed out or after a live Telegram checkpoint is waiting.

## Rules

- One task per invocation.
- Never build a dependency-blocked task.
- Never skip required tests/checks.
- Never treat a review file as the product; review is an automatic gate.
- Never end because of CI, merge, review, DB, or security blockers. Recover, diagnose, or wait through Telegram.
- Only explicit user stop or successful task closeout ends this skill invocation.
