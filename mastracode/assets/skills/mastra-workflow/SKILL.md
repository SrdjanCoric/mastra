---
name: mastra-workflow
description: End-to-end Mastra autopilot loop — mastra-talk-it-through → mastra-to-plan → loop { mastra-implement-next-task → mastra-task-review → mastra-create-pr → mastra-sync-main } until every task in the master plan is done or the user explicitly stops it. Pass --run to skip planning and run the existing master plan. Checkpoints wait/resume through Telegram rather than ending the workflow.
---

# Mastra Workflow

The **top-level autopilot loop**. This skill owns the orchestration; each sub-skill does one thing
and returns. The workflow drives them in order until the master plan is complete or the user sends
an explicit stop command. Problems are recovered autonomously or escalated through the active
user-input channel without ending the run.

## Skills invoked by this workflow

The workflow must invoke the MastraCode-specific skills below by their exact IDs. Do not substitute
similarly named generic skills, such as `task-review`, `implement-next-task`, or `sync-main`.

- **`mastra-talk-it-through`** is invoked to interview the user and settle decisions.
- **`mastra-to-plan`** is invoked to write dependency-aware task files and update the master plan.
- **`mastra-implement-next-task`** is invoked once for each eligible task.
- **`mastra-task-review`** is invoked by `mastra-implement-next-task` as its automatic review-only gate.
- **`mastra-diagnose`** is invoked by `mastra-implement-next-task` if two automatic review/fix retries still leave blocker/major findings.
- **`mastra-handoff`** is invoked before `mastra-diagnose` when the unresolved review failure needs a focused fresh context package.
- **`mastra-create-pr`** is invoked by `mastra-implement-next-task` to open, verify, and merge the PR.
- **`mastra-sync-main`** is invoked by `mastra-implement-next-task` after merge to update local `main` and
  close the completed task in the master plan.

If a required `mastra-*` skill is unavailable, do not fall back to a generic equivalent. Try to
repair or reload the skill. If that cannot be done safely, send the exact missing-skill problem
through the available user-input tool, wait for the user's Telegram reply, and resume this run.

## Stages

### 1. Interview — `mastra-talk-it-through`

Invoke **`mastra-talk-it-through`**. Interview the user relentlessly about the plan or feature
until shared understanding is reached: happy path, failure/recovery/escalation paths, edge cases,
state/data lifecycle, security surface, external-dependency failures, acceptance criteria, non-goals.

Resolve every `[decision]` here — nothing may be deferred into an autopilot task. The interview
also writes/amends `ARCHITECTURE.md` at the repo root when durable decisions crystallize, and
ensures `CLAUDE.md`/`AGENTS.md` carries a one-line pointer to it.

Return only when the user and the skill have both concluded, with the coverage recap in chat.

### 2. Plan — `mastra-to-plan`

Invoke **`mastra-to-plan`**. Turn the interview's shared understanding into task files under
`plans/tasks/` and append pointers to the project's single master plan. `mastra-to-plan` records the
master plan location in `AGENTS.md` in the current folder and in `CLAUDE.md` when that file exists.
Downstream skills read the plan path from those files; the workflow does not pass the path around.

If a master plan already exists and this workflow was invoked **without `--run`**, that means the
user is adding a feature. `mastra-to-plan` must preserve the existing plan, append new task files
and pointers, and build the new dependency graph with the current unfinished and completed tasks in
mind. New tasks may depend on old task ordinals when the new feature requires them; existing tasks
must not be reordered or rewritten unless the user explicitly asks.

`mastra-to-plan` is autopilot-first: it biases hard toward AFK and uses checkpoint tags only for
must-be-human work. Supported tags are `[decision]`, `[verify]`, `[confirm-db]`, and
`[confirm-security]`. Automated checks are acceptance criteria, not `[verify]`; local isolated test DB
work is AFK, while real/shared/destructive/ambiguous DB work and security-sensitive actions get the
explicit confirm tags.

If task dependencies materially change the user's confirmed intent, present the proposed edges and wait for confirmation. Otherwise let `mastra-to-plan` write the plan from the confirmed interview recap without forcing a second prompt.

### 3. Loop — one iteration per task

Loop until the master plan is complete or the user explicitly stops the run. **Each iteration is a
fixed four-step sequence.** Skip no step. Checkpoints do not end the workflow: `[decision]`,
`[verify]`, `[confirm-db]`, and `[confirm-security]` are Telegram wait/resume moments owned by
`mastra-implement-next-task`. If a sub-skill encounters a problem, recover it or wait for Telegram
input and then resume the same iteration (see **Recovery and escalation** below).

```
while there is an eligible pointer in the master plan:
    mastra-implement-next-task       # build, review, open+merge PR, sync main, close task
    #   ├─ internally invokes mastra-task-review (review-only gate)
    #   ├─ internally invokes mastra-create-pr (opens, waits checks, merges PR)
    #   └─ internally invokes mastra-sync-main (pulls main, flips [>]→[x], moves file)
```

`mastra-implement-next-task` already chains through `mastra-task-review`, `mastra-create-pr`, and
`mastra-sync-main` in that order. This loop's job is simply to **call `mastra-implement-next-task`
again** after each iteration returns, until no eligible pointer remains.

**Between iterations:**

1. Read the master plan's `## Tasks` list directly (it's small).
2. If every pointer is `[x]` → the plan is complete. Break the loop and report **"plan complete"**.
3. If at least one pointer is `[ ]` and its `(after …)` deps are all `[x]` → run
   `mastra-implement-next-task` again for the next iteration.
4. If no `[ ]` pointer is eligible but some remain (for example, an unmerged `[>]` while CI is
   still running), inspect and recover the incomplete prior iteration. Wait for CI, retry the
   responsible sub-skill, or ask the user through the available input tool and wait for their
   Telegram reply. Do not end the workflow because the plan is temporarily blocked or because a
   checkpoint is waiting for the user.

## Do-not-return checklist

Before `mastra-workflow` returns successfully, and after every `mastra-implement-next-task`
iteration, verify each item explicitly. If any item fails, run the responsible Mastra skill again or
fix the state. If safe recovery requires the user, ask through the available input tool, wait for the
Telegram reply, and continue instead of returning.

- Skill identity: only `mastra-*` skills were used for the loop (`mastra-implement-next-task`,
  `mastra-task-review`, `mastra-diagnose`, `mastra-handoff`, `mastra-create-pr`, `mastra-sync-main`,
  `mastra-write-well` when prose is written). Generic similarly named skills are not substitutes.
- Iteration closeout: the task selected at the start of the iteration is `[x]` after the iteration,
  points to `tasks/done/...`, and has its task file under `plans/tasks/done/`.
- Task file completeness: the done task file has checked AFK items, checked acceptance criteria, an
  implementation log, verification commands/results, review result, README decision, PR number, and
  merge SHA.
- README handling: if the task changed user-facing behavior, setup, commands, configuration, or the
  project story, `mastra-write-well` was loaded and `README.md` was updated before PR. If not, the
  task log records that no README change was needed.
- PR/CI/merge: the PR exists, required CI passed, and the PR is merged into `main`; the task branch
  was deleted or any leftover branch is reported.
- Sync-main result: `mastra-sync-main` ran after merge. If the task is still `[~]` or `[>]`, do not
  continue to the next task; rerun or repair sync-main until it is `[x]`, asking through Telegram
  only when user action is genuinely required.
- Plan sanity: no `[x]` pointer links to `plans/tasks/`, no `[ ]`/`[~]`/`[>]` pointer links to
  `plans/tasks/done/`, and every next eligible `[ ]` pointer has all `(after …)` dependencies `[x]`.
- Escalation reporting: on any human/security/CI/merge escalation, include the current pointer state,
  PR URL if any, branch name, and exact command/result, then wait for the reply and resume.

## Recovery and escalation

A blocker never terminates the loop. Preserve the current pointer and run context, then use this
policy:

- **`[decision]` mid-task** — ask the exact decision through the available user-input tool, wait for
  the user's Telegram reply, record it, and resume the same task.
- **`[verify]` mid-task** — send the batched verification steps, wait for the Telegram response, and
  continue the same task after confirmation or corrective instructions.
- **Review findings** — `mastra-task-review` is automatic and review-only. `mastra-implement-next-task`
  fixes safe blocker/major correctness, test-quality, and spec findings, then re-runs review. It gets
  two retry rounds. If blocker/major findings remain after the second retry, invoke `mastra-diagnose`
  with the findings and attempted fixes; create a `mastra-handoff` first when a fresh diagnostic
  context is needed. Ask the user only if diagnosis proves a human decision/checkpoint is required.
- **Security finding** — never auto-fix or auto-merge it. Send the finding and evidence to Telegram,
  wait for explicit instructions, then apply only the approved safe action and re-run review.
- **CI failure or timeout** — keep polling while checks are pending. For a failure, inspect logs,
  fix the branch, push, and re-run CI. If credentials, policy, or infrastructure requires the user,
  ask through Telegram and wait without ending the workflow.
- **Merge failure** — diagnose conflicts, branch protection, or unresolved conversations; repair
  what is safe, otherwise ask through Telegram and wait. Never force-merge.

Only explicit user stop or completed master plan ends the workflow. A user reply resumes the same
process; do not require them to re-invoke `mastra-workflow`.

## Arguments

`mastra-workflow` accepts one flag:

- `--run` — skip interview and planning. Read the existing master plan location from `AGENTS.md` in
  the current folder or `CLAUDE.md`, then run the implementation loop until all tasks are done or
  the user explicitly stops it.

Default behavior depends on whether a plan already exists:

- **No master plan yet** → run all three stages: `mastra-talk-it-through` → `mastra-to-plan` → loop.
- **Master plan exists and `--run` is present** → skip straight to stage 3 and implement existing
  tasks one by one until the plan is complete.
- **Master plan exists and `--run` is absent** → treat this invocation as "add a feature": run
  `mastra-talk-it-through`, then `mastra-to-plan` appends new dependency-aware tasks to the existing
  plan, then stage 3 implements from the first eligible pointer.

Read `AGENTS.md` in the current folder first, then `CLAUDE.md`, to detect the master plan. If no
plan path is recorded and the project has no plan yet, start at stage 1. If no plan path is recorded
but plan files appear to exist, ask the user which plan to register through the available input tool,
wait for the reply, register it, and continue.

## Rules

- The workflow only orchestrates; every sub-skill owns its own logic. Do not duplicate rules from
  the sub-skills here.
- One task per loop iteration, in full.
- Never bypass a `blocker`/`major` review finding, a security finding, red CI, or a failed merge.
  Recover it or ask through Telegram and wait, but keep the workflow process alive.
- The master plan plus explicit user stop are the loop's only termination conditions. Read the plan
  directly between iterations; it is small.
- Every human escalation uses the available user-input tool so `mastracode-remote` can deliver it to
  the matching Telegram topic and resume the same run from the reply.
