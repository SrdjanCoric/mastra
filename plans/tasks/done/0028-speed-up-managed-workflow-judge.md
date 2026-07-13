# Task 0028: Speed up managed workflow judging

**Branch**: `perf/fast-managed-workflow-judge`
**Depends on**: 0027
**Source**: user report 2026-07-13 · **User story**: keep `mastra workflow` judging fast across long autonomous runs

## What to build

Measure repeated goal-judge evaluations, identify the state or context that makes later evaluations slow, and remove unnecessary accumulated work without weakening completion, waiting, failure, or read-only verification semantics.

Use deterministic repeated-evaluation coverage and a real managed-workflow TUI proof. Keep the currently selected judge model/settings unless the measured root cause specifically requires a bounded judge setting.

## Acceptance criteria

- [x] Repeated judge evaluations have a deterministic timing/context-size regression signal.
- [x] Judge context does not grow from irrelevant prior judge turns.
- [x] Completion, continuation, waiting, failure, tool verification, and unbounded-goal behavior remain covered.
- [x] The TUI remains responsive and accurately reports judge activity.
- [x] Focused core tests, package checks, performance validation, and the managed-workflow TUI scenario pass.

## Diagnosis evidence

- A live local `dist` managed-workflow process remained in judge evaluation for roughly two minutes.
- Sampling showed the Node main thread mostly waiting on I/O rather than spending the delay in TUI rendering.
- The default goal scorer received the session memory plus a stable per-goal judge thread id, allowing judge-only conversation history to accumulate across evaluations even though the current prompt already contained the objective, latest user delivery, and latest assistant output.
- The default judge still permits up to 1,000 steps. The focused reproduction showed context growth independently of that limit, so this task leaves the verification tool budget unchanged.

## Implementation and verification evidence

- The default goal scorer is now stateless. It receives the current generated judge prompt and read-only tools, but it no longer attaches session memory or a persistent judge thread that can replay prior decisions and tool results.
- The repeated-evaluation regression calls the same goal twice while session memory is available, verifies both prompts use current parent-thread context, and asserts neither judge call receives memory options.
- Focused goal coverage passed with 3 files / 46 tests, including judge prompt construction, completion, continuation, waiting, failure, tool activity, and unbounded goal behavior. Core type checking and `pnpm build:core` also passed.
- `pnpm test:core` passed on the verification rerun with 738 files / 11,856 tests and no type errors. The first full run hit an unrelated Unix socket broker-promotion race; its focused 16-test suite passed immediately, and the complete rerun was green.
- The checked-in `persistent-goal-judge-decision` TUI scenario passed, preserving repeated judge decisions, visible activity, unlimited status, and final completion behavior.
- `pnpm check:mastracode` passed with 209 files / 2,135 tests, all package integration scenarios, type and quality checks, the active-display benchmark (`20,000` chunks in `158.2 ms`), release configuration, and exact `mastracode-remote-0.2.5.tgz` archive verification (`sha256=1f1d0389d07eab68e0f157515515fcaa802c3a63d8c487f6520c036d266e9996`).
