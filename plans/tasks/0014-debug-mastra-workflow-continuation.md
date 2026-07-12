# Task 0014: Debug Mastra workflow continuation

**Branch**: `fix/mastra-workflow-continuation`
**Depends on**: 0016
**Source**: repeated workflow interruption reports 2026-07-12 · **User stories**: start `mastra workflow --run` once and have it continue through review, PR, merge, sync, and every remaining task; receive status replies without stopping the active workflow; require another user message only for a real checkpoint or explicit stop

## What to build

Reproduce and fix the condition that lets an active managed workflow stop after a progress update or a user status message even though the plan still contains unfinished tasks. Trace the full continuation path across workflow skill execution, goal or run lifecycle, user-message delivery, tool completion, and Telegram responses. Fix the root cause rather than adding instructions that merely tell the agent to continue.

The workflow must keep the same safety boundaries. Explicit `stop` still stops it, checkpoint questions still wait for the user, and review, CI, security, or merge failures still block unsafe progress. Ordinary messages such as “where are we at?” must receive a reply without converting the active workflow into an idle chat.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, `10-definition-of-done.md`

- [ ] Diagnose the failure with a repeatable feedback loop and record the confirmed root cause before implementing the fix.
- [ ] Keep continuation ownership explicit and strictly typed, with no retry loop that can bypass stop, checkpoint, review, CI, or merge gates.
- [ ] Add deterministic regression coverage for workflow continuation, status-message handling, explicit stop, checkpoint waiting, and task-to-task iteration.
- [ ] Prove the fix through the package-scoped MastraCode commands and a checked-in end-to-end or highest-level executable workflow scenario.

## AFK tasks

- [ ] Reproduce a managed workflow that has unfinished plan tasks, emits a progress response, receives an ordinary Telegram or terminal status message, and then incorrectly becomes idle.
- [ ] Instrument the workflow, goal, turn, and user-message lifecycle enough to identify where continuation state is lost or treated as complete.
- [ ] Record whether the fault is in the workflow skill contract, active-goal orchestration, message-delivery handling, run completion, or more than one layer.
- [ ] Implement the smallest root-cause fix that keeps the workflow active until the plan is complete, the final guidelines assessment passes, an explicit stop arrives, or a real checkpoint is waiting.
- [ ] Ensure ordinary status questions can be answered while the workflow remains scheduled to continue.
- [ ] Preserve explicit stop behavior and every existing human, security, review, CI, and merge gate.
- [ ] Add deterministic tests that fail on the current behavior and pass after the fix.
- [ ] Add a checked-in end-to-end or executable workflow proof covering at least two task iterations with an interleaved status message.
- [ ] Update the packaged managed workflow skill only if the confirmed root cause requires a contract change, and keep its bundled and installed lifecycle tests aligned.

## Acceptance criteria

- [ ] The task log records a confirmed, evidence-backed root cause for the repeated workflow stops.
- [ ] A workflow with unfinished eligible tasks continues after sending a progress response.
- [ ] An ordinary user message during active work receives a response without cancelling or completing the workflow.
- [ ] Explicit `stop` ends the workflow, while checkpoints wait and resume without starting a second workflow.
- [ ] Review, CI, merge, and sync failures remain blocking and cannot be skipped by continuation logic.
- [ ] A deterministic regression test and a highest-level workflow proof cover the failure and the fix.
- [ ] Focused tests, type checking, lint, build, and package-scoped MastraCode validation pass.
