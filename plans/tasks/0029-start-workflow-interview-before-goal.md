# Task 0029: Start the workflow interview before creating a goal

**Branch**: `fix/workflow-startup-interview`
**Depends on**: 0028
**Source**: user report 2026-07-14 · **User story**: make bare `mastra workflow` respond immediately instead of spinning before its first question

## What to build

Handle bare `mastra workflow` at the TUI input boundary before any model request. Present a native choice between running the existing master plan and planning a new feature. Keep `mastra workflow --run` as the direct persistent, unlimited goal path.

If the user chooses a new feature, collect the feature in the TUI first and only then start the unlimited, model-backed workflow at the `mastra-talk-it-through` interview. If they choose the existing plan, start the same unlimited managed goal used by `mastra workflow --run`.

## Acceptance criteria

- [x] Bare `mastra workflow` displays the native startup choice before any model request.
- [x] The startup choice offers **Run existing plan** and **Plan a new feature**.
- [x] Choosing the existing plan starts the persistent unlimited goal with the selected model.
- [x] Choosing a new feature collects the feature before starting the model-backed interview.
- [x] The new-feature workflow remains unlimited through interview and planning into implementation.
- [x] `mastra workflow --run` still starts the persistent unlimited goal directly.
- [x] Telegram input keeps its existing text routing and does not open a terminal modal.
- [x] Unit, in-process TUI, and real PTY boundary coverage prove the startup choice appears without an AIMock request.

## Diagnosis evidence

- The earlier fix moved bare `mastra workflow` out of the goal parser, but it still sent the command through the ordinary model path.
- The first visible question therefore depended on a full model request, skill activation, and a second tool call. The real persisted session made that boundary take more than 25 minutes while fresh AIMock fixtures answered quickly.
- The failing PTY regression showed the old behavior loading `mastra-workflow` and calling `ask_user("What feature do you want to plan?")` instead of rendering a local startup choice.
- Large persisted scorer/message state amplified the wait, but storage cleanup cannot guarantee an immediate first question because the interaction was still model-dependent by design.

## Implementation evidence

- `isManagedWorkflowPrompt()` recognizes only the bare command, while `parseManagedWorkflowGoal()` continues to recognize only `mastra workflow --run`.
- `MastraTUI.startManagedWorkflowGoalIfRequested()` now renders the native startup choice before sending anything to the model.
- The existing-plan choice maps to the unlimited `mastra workflow --run` objective.
- The new-feature choice asks for the feature locally, validates the generated skill command through the prompt hook, then persists an unbounded managed goal without triggering a second message.
- The TUI activates the top-level `mastra-workflow` skill with the feature. That skill completes the interview and planning stages before it enters the implementation loop.
- Goal startup creates a missing thread before persistence, so the first workflow request receives the unbounded objective instead of racing thread creation.
- The prompt hook validates both the canonical objective and skill command. Failed activation removes the goal strictly; if storage cannot confirm removal, MastraCode aborts active work and restores a durable input quarantine until `/goal clear` succeeds.
- Terminal and Telegram input keep their shared-session behavior. If Telegram starts a run while the terminal choice or prompt hook is open, the selected goal or interview joins that active run through the existing signal path.
- The packaged workflow skill documents the same startup split as a fallback for non-TUI invocation paths.
- The in-process e2e harness can now explicitly assert that a selected model produced zero AIMock requests for a local-only interaction.

## Verification evidence

- Focused parser, queueing, GoalManager, goal-command, and skill-command tests pass at 108/108. They cover both startup choices, the unbounded feature workflow, first-thread persistence, canonical hook validation, fail-closed activation rollback and recovery, and shared-run merging.
- The checked-in in-process `managed-workflow-interview-startup` scenario shows both options within two seconds and verifies zero AIMock requests.
- The checked-in in-process `managed-workflow-interview-dispatch` scenario selects the new-feature path and verifies that the model receives the top-level workflow skill, the collected feature, and an unbounded current objective.
- The checked-in real PTY regression launches built `dist/cli.js`, submits bare `mastra workflow`, sees both options within two seconds, and verifies the mock provider received zero requests.
- Targeted ESLint and Prettier checks pass for the changed code and prose. MastraCode's TypeScript check and package-local build also pass.
- The repository-wide MastraCode dependency-graph build is unavailable in this working tree because unrelated, pre-existing deletions removed the deployer build sources. The package-local build and task-focused checks do not depend on those deleted files.
