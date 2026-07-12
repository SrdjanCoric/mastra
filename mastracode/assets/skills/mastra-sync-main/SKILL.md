---
name: mastra-sync-main
description: Checkout main, pull a merged task PR, verify its plan closeout landed, and clean safe merged branches. Used by mastra-implement-next-task after mastra-create-pr merges a task PR.
---

# Mastra Sync Main

Sync local state after a task PR has merged. The implementation PR must already contain the completed `[x]` plan pointer and the task file under `plans/tasks/done/`, so this skill never needs a second closeout commit or PR. This skill does **not** use git worktrees and does not remove worktrees.

## Managed workflow contract

`mastra-implement-next-task` calls this after `mastra-create-pr` has opened, checked, and merged the task PR. If the PR is not merged yet, report that mismatch and return. This skill must:

1. protect uncommitted local work,
2. checkout `main`,
3. pull/fetch the merge,
4. confirm which task branch landed,
5. verify the merged PR already closed the plan pointer and moved the task file,
6. clean safe merged local branches,
7. return so `mastra-workflow` can start the next eligible task.

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

### 3. Confirm the merge and closeout

Use the branch/PR information returned by `mastra-create-pr`, the merge SHA on `main`, and `git branch --merged main` to confirm the task PR landed.

Find the master plan from `AGENTS.md` first, then `CLAUDE.md` if needed. Verify that the merged task PR already contains all of the following:

1. The task pointer is `[x]`.
2. The pointer links to `plans/tasks/done/<task>.md`.
3. The task file exists under `plans/tasks/done/` and no active copy remains under `plans/tasks/`.
4. Acceptance criteria, verification, review, and highest-level proof are recorded before merge.

If any closeout item is missing on `main`, report a workflow-contract failure and return to `mastra-implement-next-task`. Do not create a post-merge closeout commit or a second PR.

### 4. Clean safe local branches

Delete local branches already merged into `main` with `git branch -d <branch>`, excluding `main` and the current branch.

For branches whose upstream is `[gone]` but whose commits are not recognized as merged, list them and ask before deleting with `git branch -D`. Never force-delete without confirmation.

## Rule

Task closeout belongs in the implementation PR. This skill only verifies the merged closeout, synchronizes local `main`, and cleans safe branches.
