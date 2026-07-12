# Task 0022: Fix managed workflow E2E status proof

**Branch**: `fix/managed-workflow-e2e-status`
**Depends on**: 0017
**Source**: `mastra workflow --run` continuation verification, 2026-07-13 · **User stories**: managed workflows start as persistent unbounded goals; checked-in TUI proof matches the shipped status output

## What to build

Repair the checked-in managed-workflow TUI scenario so it verifies the current unbounded goal status instead of the obsolete bounded-turn text. Keep the production command behavior unchanged unless the regression test exposes a real runtime defect.

## Software Repository Guidelines

**Applicable references**: `references/00-overview.md`, `references/02-testing.md`, `references/10-definition-of-done.md`

- [x] Keep the deterministic TUI end-to-end scenario aligned with production behavior and passing through the canonical focused command.
- [x] Preserve meaningful assertions for persistent goal startup, while-active continuation, completion, and final status.

## AFK tasks

- [x] Reproduce the stale final-status assertion.
- [x] Update the scenario to assert the unbounded managed-workflow status.
- [x] Run focused unit and TUI end-to-end verification.
- [x] Review, merge, and sync the implementation and task closeout in one PR.

## Acceptance criteria

- [x] `mastra workflow --run` is parsed and started through the persistent goal path.
- [x] The managed workflow uses the selected session model and an unbounded run budget.
- [x] A while-active status interjection is answered without stopping the workflow.
- [x] The checked-in TUI scenario reaches goal completion and recognizes the final unlimited-run status.
- [x] Focused MastraCode and core goal tests pass.

## Implementation log

- **Root cause**: the production command correctly started `mastra workflow --run` as an unbounded persistent goal, but the checked-in TUI scenario still expected the obsolete bounded status text `2/3 turns used`. The shipped TUI now reports `2 runs, unlimited`.
- **Change**: updated the final `/goal status` assertion while retaining the scenario's startup, while-active interjection, autonomous continuation, judge completion, and AIMock request checks.
- **Software Repository Guidelines**: loaded `references/00-overview.md`, `references/02-testing.md`, and `references/10-definition-of-done.md`. The deterministic fixture-backed TUI proof and root-runnable focused tests satisfy the applicable testing requirements.
- **Verification**:
  - `pnpm --filter ./mastracode exec vitest run src/tui/managed-workflow-goal.test.ts src/tui/commands/__tests__/goal.test.ts src/tui/__tests__/goal-manager.test.ts src/tui/__tests__/mastra-tui-queueing.test.ts --reporter=dot --bail 1` — 4 files, 77 tests passed.
  - `pnpm --filter @mastra/core exec vitest run src/loop/workflows/agentic-execution/goal-step.test.ts src/agent/goal/scorer.test.ts --reporter=dot --bail 1` — 2 files, 31 tests passed with no type errors.
  - `MC_E2E_VITEST_SCENARIOS=persistent-goal-judge-decision pnpm --filter ./mastracode exec vitest run --config e2e/vitest.config.ts --reporter=dot --bail 1` — 1 scenario passed.
  - `pnpm --filter ./mastracode check` — passed.
  - `pnpm exec prettier --check mastracode/e2e/tui/persistent-goal-judge-decision.ts plans/PLAN.md plans/tasks/0022-fix-managed-workflow-e2e-status.md` — passed.
- **Review**: automatic Standards, Spec, and Bug review found no blocker, major, minor, or nit findings. Security review was skipped because the diff changes only a deterministic test assertion and plan records.
- **README decision**: no README update is needed because the documented command behavior is unchanged; this repair only aligns the checked-in regression proof with the already-shipped unlimited-run status.
