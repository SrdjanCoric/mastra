# Task 0012: Reduce active-task CPU and memory use

**Branch**: `feature/reduce-active-task-cpu-and-memory`
**Depends on**: 0011
**Source**: talk-it-through and profiling 2026-07-12 · **User stories**: keep the TUI responsive during long tasks; continue showing useful progress; prevent streamed tool and subagent output from driving sustained CPU use or growing retained memory

## What to build

Reduce display work and retained display state while tools and subagents are active. Keep execution, tool results, event ordering, cancellation, Telegram delivery, and final transcript behavior unchanged. The terminal must show current progress during a task and flush the final state immediately when work completes or fails.

Preserve the current live-preview capacity of 1,000 lines and 64 KiB per active item. Do not add disk spooling, unlimited output history, or paging in this task. Render the first visible output immediately, allow updates at most every 100 milliseconds during the first second, then at most every 250 milliseconds while the item remains active. Errors, questions, approvals, cancellation, user input, tool and subagent lifecycle events, and final results bypass batching.

Apply batching to intermediate shell output, ordinary tool progress, tool-input previews, and subagent text. Tool starts, tool completions, subagent failures, questions, approvals, and final subagent results remain immediate.

## Software Repository Guidelines

**Applicable references**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, `10-definition-of-done.md`

- [x] The performance path stays strictly typed, uses one clear scheduling and bounded-buffer ownership model, and introduces no broad suppressions.
- [x] Deterministic tests prove retained display bounds, adaptive update coalescing, immediate first output, final flushing, cancellation cleanup, and failure cleanup.
- [x] Checked-in TUI end-to-end coverage proves that a multi-second noisy task shows intermediate progress, handles immediate lifecycle events, completes with its final result, and accepts subsequent input.
- [x] CI runs the focused performance regression tests and required TUI scenario through the package-scoped commands established by task 0011.
- [x] A reproducible performance harness reports chunk count, visible rebuild count, elapsed time, retained preview bytes, heap delta after collection where supported, and cleanup state.

## AFK tasks

- [x] Capture the current focused test and performance-harness baseline before changing behavior.
- [x] Replace append-time whole-buffer joining, splitting, and shifting with a bounded rolling representation whose work is proportional to new output and discarded output.
- [x] Preserve the current 1,000-line and 64-KiB live-preview limits, including any smaller explicit tool `tail` request.
- [x] Render the first output immediately, coalesce intermediate updates to 100-millisecond intervals during the first second, then use 250-millisecond intervals until completion.
- [x] Flush errors, questions, approvals, cancellation, user input, tool and subagent lifecycle events, and final results immediately.
- [x] Apply the adaptive schedule to shell output, ordinary tool progress, tool-input previews, and intermediate subagent text.
- [x] Remove duplicate display processing when one progress payload is represented by both tool-progress and shell-output events, without dropping information from the final tool result.
- [x] Bound core display-only shell and subagent state so repeated chunks do not allocate or retain an ever-growing string or activity list.
- [x] Skip scheduled redraws when the visible representation has not changed.
- [x] Clear stale command-box borders when a batched tool component shrinks or completes, covering the minor rendering artifact observed after task 0008.
- [x] Clear timers, pending chunks, duplicate shell buffers, subagent snapshots, and completed active-item state at the end of each lifecycle.
- [x] Extend component and session tests with long streams, multiple active items, stdout/stderr ordering, subagent text, failure, abort, disposal, user input, and prompt cases.
- [x] Extend the checked-in noisy-task TUI scenario so output arrives over several seconds and intermediate progress is observable before completion.
- [x] Add a deterministic performance command that fails when retained preview bounds or rebuild-count budgets regress.
- [x] Record a live comparison against the current observed steady state of roughly 560 MB RSS, separating the main TUI from the small Telegram broker process.

## Acceptance criteria

- [x] Each active item retains no more than 1,000 live-preview lines and 64 KiB, and completed items retain no duplicate raw streaming buffer.
- [x] The first visible output is rendered immediately. Intermediate updates occur no more than ten times per second during the first second and four times per second afterward, plus immediate bypass events.
- [x] Errors, prompts, approvals, cancellation, user input, tool starts, tool completions, subagent failures, and final results are never delayed by the batching timer.
- [x] A 20,000-chunk deterministic stream stays within the retained-memory and rebuild-count budgets.
- [x] Final output, stdout/stderr order, tool errors, abort behavior, and Telegram behavior remain correct.
- [x] The real TUI remains usable after the noisy stream and accepts the next user message without waiting for stale rendering work.
- [x] Focused MastraCode and core tests, type checking, lint, build, performance proof, and the checked-in TUI scenario pass through the task-0011 CI path.
- [x] Live profiling shows no unbounded RSS growth during the agreed noisy-task run, and idle CPU returns near baseline after completion.
- [x] Full-output disk spooling and paging remain deferred to a separate feature.

## Implementation log

### Software Repository Guidelines

Loaded the implementation guidance for style and strict typing, deterministic tests, package-scoped CI, maintainability, canonical commands, and definition of done. The implementation uses one `AdaptiveDisplayScheduler`, one bounded rolling shell preview, and bounded core display state. It adds no type or lint suppressions.

### Implementation

- Replaced repeated shell-preview joining and shifting with a chunked rolling buffer capped at 65,536 characters and 1,000 lines.
- Added adaptive display scheduling. The first update renders immediately, updates are limited to 100 ms during the first second, and later updates use a 250 ms interval.
- Applied the scheduler to shell output, ordinary partial tool results, tool-input previews, plugin subagent snapshots, and native subagent text deltas.
- Kept tool and subagent lifecycle transitions immediate and flushes or cancels pending display work on completion, abort, disposal, and agent shutdown.
- Bounded core tool-input, shell-output, subagent-text, and subagent-tool display state. Shell output is retained only for tools that display a live shell preview.
- Added a deterministic performance command and included the noisy shell scenario in the package integration gate.
- Added `.changeset/calm-renders-rest.md` for patch releases of `mastracode-remote` and `@mastra/core`.

### Verification

- `pnpm --filter ./mastracode exec vitest run src/tui/components/__tests__/adaptive-display-scheduler.test.ts src/tui/components/__tests__/shell-output-preview.test.ts src/tui/components/__tests__/tool-execution-enhanced.test.ts src/tui/components/__tests__/subagent-execution.test.ts src/tui/handlers/__tests__/tool.test.ts src/tui/handlers/__tests__/subagent.test.ts --reporter=dot --bail 1` passed: 6 files, 105 tests.
- `pnpm --filter ./packages/core exec vitest run src/agent-controller/display-state.test.ts --reporter=dot --bail 1` passed: 1 file, 101 tests.
- `pnpm test:mastracode -- --run --reporter=dot` passed: 207 files, 2,098 tests.
- `pnpm --filter ./mastracode test:integration` passed: 3 scenarios.
- `pnpm --filter ./mastracode check` and `pnpm --filter ./packages/core check` passed.
- `pnpm --filter ./mastracode lint` and `pnpm --filter ./mastracode format:check` passed.
- `pnpm build:mastracode` passed: 50 tasks.
- `pnpm performance:mastracode` passed with 20,000 chunks, 2 visible rebuilds, 2 scheduled rebuilds, 150.6 ms elapsed, 61,000 retained characters, 1,000 retained lines, 530,056 active heap bytes, and no retained preview after cleanup.
- The checked-in `shell-output-batching` TUI scenario passed and showed intermediate output before completion, the final response, and acceptance of the next input.
- A current-branch PTY launch sampled about 368 MB RSS during startup and settled near 286 MB RSS with 0% CPU. The small Telegram broker stayed separate. An older runaway process from before the display fixes remained above 2.6 GB RSS with about 98% CPU, matching the original failure mode. The deterministic stream and TUI scenario provide the repeatable active-output proof.

### End-to-end proof

The `shell-output-batching` scenario runs a multi-second command through the real TUI, observes live output before completion, waits for the final assistant response, then submits another message. It passed in 10.03 seconds.

### README

No README change was needed. The package README already states that live command output is bounded and display updates are batched to reduce CPU and memory use.

### Review

Automatic task review completed against `main` with the Standards, Spec, and Bug lenses. The Security lens was skipped because the diff changes display scheduling, bounded display state, tests, and package commands without changing a trust boundary. No blocker, major, minor, or nit findings remained. The review independently loaded `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `05-ci-cd.md`, `06-code-health-and-maintainability.md`, `08-recommended-canonical-commands.md`, and `10-definition-of-done.md`; the recorded unit, integration, performance, build, lint, formatting, and typecheck proof covered the applicable items.
