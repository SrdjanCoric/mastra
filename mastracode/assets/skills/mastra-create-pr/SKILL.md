---
name: mastra-create-pr
description: Commit the completed task branch, push it, write clear PR prose, open the pull request, wait for required checks, and merge it on the happy path. In the managed workflow this skill owns PR creation and merge; mastra-sync-main owns post-merge local sync and plan marker closeout.
---

# Mastra Create PR

Create and merge the pull request for a completed task branch. This skill does not close the master-plan marker and does not sync local `main`; `mastra-sync-main` handles post-merge local sync and marker closeout after this skill merges the PR.

## Managed workflow contract

Called by `mastra-implement-next-task` after implementation, verification, review retries, docs, and task-log updates are complete.

This skill must:

1. inspect the branch state,
2. stage only relevant task changes,
3. create a clean commit if needed,
4. push the branch,
5. write human PR prose with `mastra-write-well` when available,
6. run `gh pr create`,
7. wait for required checks,
8. merge the PR on the happy path,
9. return the PR URL/number, branch name, and merge SHA when available.

Ask the user only when credentials, branch protection, unrelated local changes, destructive git cleanup, or ambiguous scope makes a safe AFK action impossible.

## Process

### 1. Inspect state

Run:

```sh
git branch --show-current
git status --short
git diff --stat
git diff --cached --stat
git log main..HEAD --oneline || git log origin/main..HEAD --oneline
git diff main...HEAD --stat || git diff origin/main...HEAD --stat
```

Confirm you are not on `main`. If there are unrelated changes, leave them unstaged and report them.

### 2. Stage and commit

Stage relevant task changes only. Do not commit secrets or local env files.

If there are staged changes, commit them with the project’s commit style. Never mention an AI assistant in the commit message.

### 3. Push

Push the current branch and create upstream tracking if needed.

### 4. Confirm review evidence

Confirm the task-review result records that `mastra-software-repository-guidelines` ran, which
references it loaded, and whether any applicable proof gap remains. If that metadata is absent or a
blocking applicable gap remains, return to `mastra-implement-next-task`; do not open or merge the PR.

### 5. Write PR prose

Use `mastra-write-well` when available. Keep the PR description about the unit of work being shipped, not every detour/fix along the way.

Include:

- concise summary,
- relevant implementation notes,
- tests/checks run,
- review status,
- any human checkpoints resolved.

### 6. Open PR

Use `gh pr create` with the generated title/body. Capture the PR URL, PR number, and branch name.

### 7. Wait for checks

Wait for required checks with `gh pr checks --watch` or the repo's documented equivalent. If checks fail, inspect logs, fix safe failures, push, and wait again. If credentials, branch protection, infrastructure, or policy needs a human, ask through the available Telegram/user-input channel and resume from the reply.

### 8. Merge PR

When checks and review requirements are satisfied, merge with the repo's normal strategy using `gh pr merge`. Prefer the repository default; do not force-merge and do not bypass branch protection.

Return the PR URL, PR number, branch name, and merge SHA when available.

Do not flip `[~]→[>]` or `[>]→[x]` yourself unless the caller explicitly asks you to. `mastra-implement-next-task` owns `[~]→[>]` after PR identity exists; `mastra-sync-main` owns `[>]→[x]` after the merge lands on local `main`.

## Rule

This skill creates and merges the PR. `mastra-sync-main` performs local post-merge sync and plan closeout so the master workflow has one place that turns `[>]` into `[x]`.
