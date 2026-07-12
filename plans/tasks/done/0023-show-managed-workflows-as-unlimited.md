# Task 0023: Show managed workflows as unlimited

**Branch**: `fix/managed-workflow-unlimited-status`
**Depends on**: 0022
**Source**: talk-it-through 2026-07-13 · **User stories**: As a MastraCode Remote user, I want `mastra workflow` goal displays to show that the workflow is unlimited instead of suggesting it will stop at the ordinary 50-run goal budget.

## What to build

Make every managed-workflow goal projection and TUI judge display represent the persisted unbounded state. Ordinary bounded `/goal` runs must keep their existing `used/max` presentation. Preserve the existing execution semantics: this task corrects presentation and persistence, not the goal judge decision policy.

## Software Repository Guidelines

**Applicable references**: `references/00-overview.md`, `references/01-style-and-code-quality.md`, `references/02-testing.md`, `references/06-code-health-and-maintainability.md`, `references/10-definition-of-done.md`

- [x] Keep the change strictly typed, formatted, lint-clean, and consistent with the existing goal lifecycle vocabulary.
- [x] Add deterministic unit coverage for unbounded state projection, persistence, and TUI rendering while preserving bounded-goal coverage.
- [x] Keep the implementation surgical and avoid duplicate formatting rules across goal surfaces.
- [x] Run focused tests first, then the package-scoped build, typecheck, lint, tests, and checked-in managed-workflow TUI proof.

## AFK tasks

- [x] Reproduce the `3/50` managed-workflow display in the goal state projection and judge card tests.
- [x] Project `unbounded` through the current-objective state signal without advertising a finite max-run cap.
- [x] Render managed-workflow judge evaluations as `<n> runs, unlimited` while retaining `<n>/<max>` for bounded goals.
- [x] Preserve `unbounded` when the TUI recreates or updates an objective record.
- [x] Add or update focused unit and TUI E2E regression coverage.
- [x] Run automatic task review, close this task on the branch, merge one implementation/closeout PR, and sync `main`.

## Acceptance criteria

- [x] `mastra workflow` and `mastra workflow --run` never display `3/50` or another finite run limit when their goal record is unbounded.
- [x] The inline judge card shows `3 runs, unlimited` for an unbounded evaluation.
- [x] The current-objective state signal exposes `unbounded="true"` and does not expose a finite `maxRuns` attribute for an unbounded goal.
- [x] Saving, pausing, resuming, or recreating a managed-workflow goal does not lose its unbounded state.
- [x] Ordinary bounded goals continue to display and enforce their configured maximum.
- [x] Focused and package-scoped validation passes, including the managed-workflow TUI E2E scenario.

## Implementation and verification evidence

- The regression tests failed before the production fix with the exact bad outputs: the state signal omitted `unbounded` and the judge card rendered `(3/50)`.
- Focused core tests passed: goal state projection and goal-step payload coverage, 2 files / 32 tests.
- Focused TUI tests passed: goal manager persistence/lifecycle, judge rendering, and goal timer coverage, 3 files / 26 tests; the final persistence rerun passed 14/14.
- The checked-in `persistent-goal-judge-decision` scenario passed and now proves both live cards (`1 runs, unlimited`, `2 runs, unlimited`) plus model context containing `unbounded="true"` without a `maxRuns` attribute.
- `pnpm check:mastracode` passed: build, formatting, lint, type checks, 209 unit files / 2,132 tests, integration tests, active-display performance gate, trusted-release verification, and packed-package isolation checks.
- Automatic task review found no standards, specification, correctness, or security findings. Review independently checked the implementation against the task acceptance criteria and Software Repository Guidelines references 00, 01, 02, 06, and 10; security was skipped because the diff does not change a trust boundary.
