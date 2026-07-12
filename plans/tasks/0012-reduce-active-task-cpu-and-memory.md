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

- [ ] The performance path stays strictly typed, uses one clear scheduling and bounded-buffer ownership model, and introduces no broad suppressions.
- [ ] Deterministic tests prove retained display bounds, adaptive update coalescing, immediate first output, final flushing, cancellation cleanup, and failure cleanup.
- [ ] Checked-in TUI end-to-end coverage proves that a multi-second noisy task shows intermediate progress, handles immediate lifecycle events, completes with its final result, and accepts subsequent input.
- [ ] CI runs the focused performance regression tests and required TUI scenario through the package-scoped commands established by task 0011.
- [ ] A reproducible performance harness reports chunk count, visible rebuild count, elapsed time, retained preview bytes, heap delta after collection where supported, and cleanup state.

## AFK tasks

- [ ] Capture the current focused test and performance-harness baseline before changing behavior.
- [ ] Replace append-time whole-buffer joining, splitting, and shifting with a bounded rolling representation whose work is proportional to new output and discarded output.
- [ ] Preserve the current 1,000-line and 64-KiB live-preview limits, including any smaller explicit tool `tail` request.
- [ ] Render the first output immediately, coalesce intermediate updates to 100-millisecond intervals during the first second, then use 250-millisecond intervals until completion.
- [ ] Flush errors, questions, approvals, cancellation, user input, tool and subagent lifecycle events, and final results immediately.
- [ ] Apply the adaptive schedule to shell output, ordinary tool progress, tool-input previews, and intermediate subagent text.
- [ ] Remove duplicate display processing when one progress payload is represented by both tool-progress and shell-output events, without dropping information from the final tool result.
- [ ] Bound core display-only shell and subagent state so repeated chunks do not allocate or retain an ever-growing string or activity list.
- [ ] Skip scheduled redraws when the visible representation has not changed.
- [ ] Clear stale command-box borders when a batched tool component shrinks or completes, covering the minor rendering artifact observed after task 0008.
- [ ] Clear timers, pending chunks, duplicate shell buffers, subagent snapshots, and completed active-item state at the end of each lifecycle.
- [ ] Extend component and session tests with long streams, multiple active items, stdout/stderr ordering, subagent text, failure, abort, disposal, user input, and prompt cases.
- [ ] Extend the checked-in noisy-task TUI scenario so output arrives over several seconds and intermediate progress is observable before completion.
- [ ] Add a deterministic performance command that fails when retained preview bounds or rebuild-count budgets regress.
- [ ] Record a live comparison against the current observed steady state of roughly 560 MB RSS, separating the main TUI from the small Telegram broker process.

## Acceptance criteria

- [ ] Each active item retains no more than 1,000 live-preview lines and 64 KiB, and completed items retain no duplicate raw streaming buffer.
- [ ] The first visible output is rendered immediately. Intermediate updates occur no more than ten times per second during the first second and four times per second afterward, plus immediate bypass events.
- [ ] Errors, prompts, approvals, cancellation, user input, tool starts, tool completions, subagent failures, and final results are never delayed by the batching timer.
- [ ] A 20,000-chunk deterministic stream stays within the retained-memory and rebuild-count budgets.
- [ ] Final output, stdout/stderr order, tool errors, abort behavior, and Telegram behavior remain correct.
- [ ] The real TUI remains usable after the noisy stream and accepts the next user message without waiting for stale rendering work.
- [ ] Focused MastraCode and core tests, type checking, lint, build, performance proof, and the checked-in TUI scenario pass through the task-0011 CI path.
- [ ] Live profiling shows no unbounded RSS growth during the agreed noisy-task run, and idle CPU returns near baseline after completion.
- [ ] Full-output disk spooling and paging remain deferred to a separate feature.
