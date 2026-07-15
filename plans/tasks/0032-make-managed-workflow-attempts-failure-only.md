# Task 0032: Make managed workflow attempts failure-only and invisible

**Branch**: `feature/failure-only-managed-workflow-attempts`
**Depends on**: 0031
**Source**: talk-it-through 2026-07-14 · **User stories**: questions and Telegram interaction never consume autonomous attempts; managed workflows never stop at a nominal maximum; the UI shows the goal decision and explanation without run-budget metadata

## What to build

Define managed workflow accounting around completed autonomous work rather than interactions. Increment the internal counter only when a completed autonomous cycle is successfully judged incomplete. Talk-it-through before goal creation, questions, waiting, user decisions, Telegram interjections and replies, approvals, resumptions, command acknowledgements, and technical failures do not increment it.

Managed workflow goals remain unbounded even when the internal counter exceeds the ordinary default maximum. Keep the counter only for internal diagnostics and execution state. Remove runs, attempts, maxima, and `unlimited` labels from all managed-workflow user interfaces while retaining the goal judge's decision and explanation.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `03-documentation.md`, `06-code-health-and-maintainability.md`, `10-definition-of-done.md`

- [ ] Keep the accounting transition explicit, strictly typed, and separate from presentation; prove with focused lint, typecheck, and format checks.
- [ ] Add deterministic core, MastraCode unit, integration, and checked-in TUI end-to-end coverage for every incrementing and non-incrementing result, including the ordinary maximum boundary.
- [ ] Update goal/workflow documentation and fixtures so they describe unbounded execution without exposing run-budget labels.
- [ ] Centralize the managed-goal presentation rule so status, judge cards, pause notices, compact status, and Telegram cannot drift.
- [ ] Record focused tests, typecheck, lint, affected builds, higher-level managed-workflow proof, documentation decision, and changeset evidence before completion.

## AFK tasks

- [ ] Write failing transition-table tests first for complete, incomplete, waiting, question, user decision, Telegram interjection, approval, resume, abort, provider failure, malformed response, missing credentials, and judge-tool failure outcomes.
- [ ] Increment `runsUsed` only after a completed autonomous cycle receives a valid incomplete judgment. Do not increment for completion or any interaction, waiting, cancellation, or technical-failure state.
- [ ] Pause managed and bounded goals safely on technical failures without consuming an attempt, while preserving enough state for deliberate resume.
- [ ] Preserve unbounded managed-workflow execution when the internal counter reaches and exceeds the ordinary maximum; never route an unbounded goal through maximum-run termination.
- [ ] Remove run count, attempt count, maximum, and `unlimited` text from managed-workflow judge cards, goal status, pause notices, compact status, Telegram status, fixtures, and help where applicable.
- [ ] Continue showing the goal judge decision and explanation without exposing budget metadata.
- [ ] Prove through the real managed-workflow boundary that talk-it-through and Telegram checkpoints can wait and resume repeatedly without consuming attempts or terminating the workflow.

## Acceptance criteria

- [ ] Only a valid incomplete judgment after autonomous work increments the internal managed-workflow counter.
- [ ] Talk-it-through, questions, waiting, user input, Telegram activity, approvals, resumptions, acknowledgements, cancellation, and technical failures consume no attempts.
- [ ] Managed workflows continue beyond the ordinary maximum and cannot be stopped by that maximum.
- [ ] No managed-workflow UI or Telegram output shows runs, attempts, maxima, or `unlimited`.
- [ ] Goal decision and explanation remain visible where the judge result is presented.
- [ ] Core transition tests and checked-in MastraCode TUI end-to-end coverage prove both accounting and presentation behavior.
