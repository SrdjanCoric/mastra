---
name: mastra-sync-main
description: Checkout main, pull the merged PR, clean safe merged branches, and close out merged tasks in the master plan by flipping [>] to [x] and moving task files to plans/tasks/done/. Used by mastra-implement-next-task after mastra-create-pr merges a task PR.
---

# Mastra Sync Main

Close out a task after its PR has merged. This skill does **not** use git worktrees and does not remove worktrees. It operates in the normal project checkout.

## Managed workflow contract

`mastra-implement-next-task` calls this after `mastra-create-pr` has opened, checked, and merged the task PR. If the PR is not merged yet, report that mismatch and return without flipping plan markers. This skill must:

1. protect uncommitted local work,
2. checkout `main`,
3. pull/fetch the merge,
4. confirm which task branch landed,
5. clean safe merged local branches,
6. flip the task pointer `[>]→[x]`,
7. move the task file to `plans/tasks/done/`,
8. return so `mastra-workflow` can start the next eligible task.

Ask the user only before destructive cleanup, force deletion, or when local uncommitted work would be overwritten.

## Process

### 1. Protect local state

Run `git status --porcelain`. If there are uncommitted changes, determine whether they are expected task-closeout edits. If switching to `main` would overwrite work, stop and ask through the available Telegram/user-input channel whether to stash, commit, or abort. Do not guess.

### 2. Checkout and update main

Run:

```sh
git checkout main
git fetch --prune
git pull --ff-only
```

If `git pull --ff-only` fails because local `main` diverged, diagnose the state. Do not force reset. Ask the user only if safe recovery is ambiguous.

### 3. Identify merged task branches

Use the most reliable available signals:

- branch/PR information returned by `mastra-create-pr`, if provided in context,
- local branches merged into `main` from `git branch --merged main`,
- task files whose `**Branch**` field matches a branch now merged into `main`,
- plan pointers currently marked `[>]`.

A task may be closed only when its branch is confirmed merged into `main` or the PR merge SHA is present on `main`. Do not flip a marker from hope.

### 4. Clean safe local branches

Delete local branches already merged into `main` with `git branch -d <branch>`, excluding `main` and the current branch.

For branches whose upstream is `[gone]` but whose commits are not recognized as merged, list them and ask before deleting with `git branch -D`. Never force-delete without confirmation.

### 5. Close out plan pointers

Find the master plan from `AGENTS.md` first, then `CLAUDE.md` if needed. For each confirmed merged task branch:

1. Find the task file whose `**Branch**` field matches the branch.
2. Its pointer in the master plan should be `[>]`.
3. Flip `[>]→[x]`.
4. Move the task file from `plans/tasks/` to `plans/tasks/done/`.
5. Update the plan link to point at `tasks/done/...`.
6. Add or preserve the PR number and merge SHA in the task log when available.

If the pointer is already `[x]`, skip it. If the pointer is `[ ]` or `[~]`, do not flip it silently; report the mismatch because the task did not pass through the normal implementation/PR path.

## Rule

This is the only place `[>]→[x]` happens. A task is merged exactly when its branch/PR is on `main`; that closeout is what unblocks dependent `(after ...)` tasks for the next `mastra-workflow` loop iteration.
