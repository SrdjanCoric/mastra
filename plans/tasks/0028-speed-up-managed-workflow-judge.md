# Task 0028: Speed up managed workflow judging

**Branch**: `perf/fast-managed-workflow-judge`
**Depends on**: 0027
**Source**: user report 2026-07-13 · **User story**: keep `mastra workflow` judging fast across long autonomous runs

## What to build

Measure repeated goal-judge evaluations, identify the state or context that makes later evaluations slow, and remove unnecessary accumulated work without weakening completion, waiting, failure, or read-only verification semantics.

Use deterministic repeated-evaluation coverage and a real managed-workflow TUI proof. Keep the currently selected judge model/settings unless the measured root cause specifically requires a bounded judge setting.

## Acceptance criteria

- [ ] Repeated judge evaluations have a deterministic timing/context-size regression signal.
- [ ] Judge context does not grow from irrelevant prior judge turns.
- [ ] Completion, continuation, waiting, failure, tool verification, and unbounded-goal behavior remain covered.
- [ ] The TUI remains responsive and accurately reports judge activity.
- [ ] Focused core tests, package checks, performance validation, and the managed-workflow TUI scenario pass.

## Initial diagnosis evidence

- A live local `dist` managed-workflow process remained in judge evaluation for roughly two minutes.
- Sampling showed the Node main thread mostly waiting on I/O rather than spending the delay in TUI rendering.
- The default goal scorer currently receives the session memory plus a stable per-goal judge thread id, allowing judge-only conversation history to accumulate across evaluations even though the current prompt already contains the objective, latest user delivery, and latest assistant output.
- The default judge also permits up to 1,000 steps, which remains a secondary hypothesis to measure after context growth.
