---
name: mastra-create-pr
description: Commit the completed task and its plan closeout together, push it, write clear PR prose, open the pull request, wait for required checks, and merge it on the happy path. Mastra-sync-main then verifies the closeout on local main.
---

# Mastra Create PR

Create and merge the pull request for a completed task branch. The branch must already contain the implementation, an `[x]` master-plan pointer, and the task file under `plans/tasks/done/`. `mastra-sync-main` handles post-merge local sync and verifies that closeout landed.

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

### 2. Confirm task closeout, then stage and commit

Before committing a managed task PR, verify that the same branch contains its completed `[x]` plan pointer, updated link to `plans/tasks/done/`, and moved task file with acceptance, verification, review, and end-to-end proof recorded. Return to `mastra-implement-next-task` if closeout is missing. Do not defer closeout to a second PR.

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

Do not create post-merge plan edits. `mastra-implement-next-task` owns task closeout on the implementation branch before this skill opens the PR. `mastra-sync-main` verifies that the merged PR carried the closeout onto local `main`.

## Rule

The implementation and its task closeout ship in one PR. This skill creates and merges that PR; `mastra-sync-main` only synchronizes and verifies it afterward.
