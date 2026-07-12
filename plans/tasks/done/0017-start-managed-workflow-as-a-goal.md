# 0017 · Start managed workflow as a persistent goal

**Branch:** `fix/start-managed-workflow-as-goal`
**Depends on:** 0014
**Guidelines:** 00, 01, 02, 05, 06, 08, 10

## Goal

Make the documented `mastra workflow` and `mastra workflow --run` prompts start through MastraCode's persistent goal loop so Telegram interjections are answered without ending unfinished workflow work.

## Scope

- Reproduce the real failure: a normal managed-skill turn answers a `while-active` Telegram question and then ends.
- Route the two documented managed-workflow prompts into the existing persistent-goal machinery when submitted from the terminal or Telegram while idle.
- Keep ordinary prompts, active-run interjections, explicit stop requests, checkpoints, and other skills unchanged.
- Add focused regression coverage and a checked-in highest-level workflow proof.

## Acceptance criteria

- [x] `mastra workflow` starts a persistent goal.
- [x] `mastra workflow --run` starts a persistent goal.
- [x] A Telegram question received during the workflow is answered and unfinished work continues automatically.
- [x] Explicit stop requests and real checkpoints still stop or wait as designed.
- [x] Focused tests, the highest-level workflow proof, type checking, lint, and package-scoped validation pass.

## Implementation log

- User reproduction: the managed workflow reached Stage 2, answered “Where are you at in the process” from Telegram, then returned instead of continuing into implementation.
- Root cause: task 0014 fixed delivery-aware scoring for native persistent goals, but the documented natural-language workflow prompts still started as ordinary one-turn skill runs and therefore had no runtime continuation loop after the interjection response.
- Implementation: intercept the documented `mastra workflow` and `mastra workflow --run` phrases at the TUI input boundary, normalize case and spacing, and start them through the existing goal manager. The same parser is used for idle Telegram input; active-run Telegram messages remain normal `while-active` interjections.
- Proof: focused parser and queueing tests passed at 45/45, and the checked-in `persistent-goal-judge-decision` scenario starts with `mastra workflow --run`, answers a status interjection, and continues to the next autonomous step.
- Package validation: `pnpm build:mastracode` passed with 50/50 tasks, then `pnpm check:mastracode` passed 208/208 unit files and 2,108/2,108 tests, the integration slice, active-display benchmark, release-configuration check, and publication archive verification.
- Review: Standards, spec, bug, and security lenses found no blockers or major issues. Input parsing is exact and limited to the two documented workflow phrases; active-run messages, slash commands, stop behavior, and ordinary prompts remain on their existing paths.
