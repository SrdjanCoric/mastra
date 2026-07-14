# Task 0029: Start the workflow interview before creating a goal

**Branch**: `fix/workflow-startup-interview`
**Depends on**: 0028
**Source**: user report 2026-07-14 · **User story**: make bare `mastra workflow` respond immediately instead of spinning before its first question

## What to build

Handle bare `mastra workflow` at the TUI input boundary before any model request. Present a native choice between running the existing master plan and planning a new feature. Keep `mastra workflow --run` as the direct persistent, unlimited goal path.

If the user chooses a new feature, collect the feature in the TUI first and only then start the model-backed `mastra-talk-it-through` interview. If they choose the existing plan, start the same unlimited managed goal used by `mastra workflow --run`.

Goal accounting must also distinguish autonomous work from interaction: a judge decision that the goal is waiting for required user input stops the loop without consuming a run.

## Acceptance criteria

- [x] Bare `mastra workflow` displays the native startup choice before any model request.
- [x] The startup choice offers **Run existing plan** and **Plan a new feature**.
- [x] Choosing the existing plan starts the persistent unlimited goal with the selected model.
- [x] Choosing a new feature collects the feature before starting the model-backed interview.
- [x] `mastra workflow --run` still starts the persistent unlimited goal directly.
- [x] Telegram input keeps its existing text routing and does not open a terminal modal.
- [x] A goal waiting on a required talk-it-through question or human checkpoint does not increment `runsUsed`.
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
- The new-feature choice asks for the feature locally, validates the generated skill command through the prompt hook, then activates `mastra-talk-it-through` through the skill dispatcher.
- Terminal and Telegram input keep their shared-session behavior. If Telegram starts a run while the terminal choice or prompt hook is open, the selected goal or interview joins that active run through the existing signal path.
- The packaged workflow skill documents the same startup split as a fallback for non-TUI invocation paths.
- The in-process e2e harness can now explicitly assert that a selected model produced zero AIMock requests for a local-only interaction.
- Goal accounting keeps a waiting objective active, stops automatic continuation, and leaves its run count unchanged. Managed workflow goals remain unbounded.

## Verification evidence

- Focused parser and TUI queueing tests pass at 61/61, including both startup choices, prompt-hook validation, skill dispatch, and shared-run merging during modal and hook waits.
- The checked-in in-process `managed-workflow-interview-startup` scenario shows both options within two seconds and verifies zero AIMock requests.
- The checked-in in-process `managed-workflow-interview-dispatch` scenario selects the new-feature path and verifies that the first model request contains the activated `mastra-talk-it-through` skill and the collected feature.
- The checked-in real PTY regression launches built `dist/cli.js`, submits bare `mastra workflow`, sees both options within two seconds, and verifies the mock provider received zero requests.
- Focused goal-step coverage passes at 20/20 and proves that waiting blocks continuation without consuming a run.
- Targeted ESLint and Prettier checks pass for the changed code and prose. MastraCode's TypeScript check, package-local build, and the `@mastra/core` package check also pass.
- The repository-wide MastraCode dependency-graph build is unavailable in this working tree because unrelated, pre-existing deletions removed the deployer build sources. The package-local build and task-focused checks do not depend on those deleted files.
