# Task 0014: Debug Mastra workflow continuation

**Branch**: `fix/mastra-workflow-continuation`
**Depends on**: 0016
**Source**: repeated workflow interruption reports 2026-07-12 · **User stories**: start `mastra workflow --run` once and have it continue through review, PR, merge, sync, and every remaining task; receive status replies without stopping the active workflow; require another user message only for a real checkpoint or explicit stop

## What to build

Reproduce and fix the condition that lets an active managed workflow stop after a progress update or a user status message even though the plan still contains unfinished tasks. Trace the full continuation path across workflow skill execution, goal or run lifecycle, user-message delivery, tool completion, and Telegram responses. Fix the root cause rather than adding instructions that merely tell the agent to continue.

The workflow must keep the same safety boundaries. Explicit `stop` still stops it, checkpoint questions still wait for the user, and review, CI, security, or merge failures still block unsafe progress. Ordinary messages such as “where are we at?” must receive a reply without converting the active workflow into an idle chat.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, `10-definition-of-done.md`

- [x] Diagnose the failure with a repeatable feedback loop and record the confirmed root cause before implementing the fix.
- [x] Keep continuation ownership explicit and strictly typed, with no retry loop that can bypass stop, checkpoint, review, CI, or merge gates.
- [x] Add deterministic regression coverage for workflow continuation, status-message handling, explicit stop, checkpoint waiting, and task-to-task iteration.
- [x] Prove the fix through the package-scoped MastraCode commands and a checked-in end-to-end or highest-level executable workflow scenario.

## AFK tasks

- [x] Reproduce a managed workflow that has unfinished plan tasks, emits a progress response, receives an ordinary Telegram or terminal status message, and then incorrectly becomes idle.
- [x] Instrument the workflow, goal, turn, and user-message lifecycle enough to identify where continuation state is lost or treated as complete.
- [x] Record whether the fault is in the workflow skill contract, active-goal orchestration, message-delivery handling, run completion, or more than one layer.
- [x] Implement the smallest root-cause fix that keeps the workflow active until the plan is complete, the final guidelines assessment passes, an explicit stop arrives, or a real checkpoint is waiting.
- [x] Ensure ordinary status questions can be answered while the workflow remains scheduled to continue.
- [x] Preserve explicit stop behavior and every existing human, security, review, CI, and merge gate.
- [x] Add deterministic tests that fail on the current behavior and pass after the fix.
- [x] Add a checked-in end-to-end or executable workflow proof covering at least two task iterations with an interleaved status message.
- [x] Update the packaged managed workflow skill only if the confirmed root cause requires a contract change, and keep its bundled and installed lifecycle tests aligned. No skill contract change was needed.

## Acceptance criteria

- [ ] The task log records a confirmed, evidence-backed root cause for the repeated workflow stops.
- [ ] A workflow with unfinished eligible tasks continues after sending a progress response.
- [ ] An ordinary user message during active work receives a response without cancelling or completing the workflow.
- [ ] Explicit `stop` ends the workflow, while checkpoints wait and resume without starting a second workflow.
- [ ] Review, CI, merge, and sync failures remain blocking and cannot be skipped by continuation logic.
- [ ] A deterministic regression test and a highest-level workflow proof cover the failure and the fix.
- [ ] Focused tests, type checking, lint, build, and package-scoped MastraCode validation pass.

## Implementation log

- Implement-mode repository guidelines loaded: `00`, `01`, `02`, `05`, `06`, `08`, and `10`. This task must keep strict types, add deterministic unit and higher-level coverage, use the package-scoped root commands, and pass the protected CI gate.
- Reproduction: the focused goal-scorer test failed because the default judge prompt had no rule for `delivery="while-active"`. The existing prompt explicitly told the judge to return `waiting` after answering any user question. A `waiting` result stops the native goal loop while leaving the objective active.
- Root cause: terminal and Telegram messages sent during a run are correctly stored as `<user delivery="while-active">…</user>`. The goal scorer preserved that wrapper in the latest-user text but did not identify its delivery type. The judge therefore treated an ordinary status interjection as a reason to yield control. The workflow skill contract and signal delivery path already required continuation, so the fault was in the default goal-judge policy and prompt context.
- Fix: the goal scorer now extracts text from persisted v2 message parts, carries explicit or embedded delivery metadata into the judge prompt, and tells the default judge that answered while-active interjections continue unfinished autonomous work. Explicit stop/pause/cancel requests and goal-required checkpoints still wait.
- Deterministic proof: `packages/core/src/agent/goal/scorer.test.ts` passes 11/11 cases, including persisted v2 content and embedded delivery metadata. The checked-in `persistent-goal-judge-decision` TUI scenario passes and proves first task → while-active status question → answer → second task → goal done without `/goal resume`.
- Package proof: `pnpm build:mastracode` completed 50/50 tasks. `pnpm check:mastracode` passed 207/207 unit files and 2098/2098 tests, the package integration slice, active-display performance gate, release configuration verification, and exact publication archive verification.
- Automatic review: Standards, Spec, and Bug lenses found no blocking or major issues. Security was skipped because the change does not alter authentication, authorization, secrets, network access, subprocesses, or package trust boundaries. Review-mode repository guidelines loaded `00`, `01`, `02`, `05`, `06`, `08`, and `10`; no applicable proof gap remains before CI.
