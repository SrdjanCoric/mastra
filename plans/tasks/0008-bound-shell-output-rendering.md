# Task 0008: Bound shell-output rendering

**Branch**: `feature/bound-shell-output-rendering`
**Depends on**: 0005
**Source**: CPU and memory diagnosis 2026-07-12 · **User stories**: keep typing responsive during noisy commands; run long sessions without retaining unbounded display output; preserve command and model behavior

## What to build

Fix the shell-output display path without changing command execution or the result returned to the model. Keep a bounded live preview, coalesce rapid output into scheduled display updates, flush the final chunk when execution ends, and release duplicate display buffers after completion. Fast commands may appear in small batches, but output order, final status, errors, and model-visible results must remain unchanged.

## AFK tasks

- [ ] Add failing regression tests for rapid stdout and stderr chunks, bounded retained preview state, final flushes, successful and failed commands, cancellation, and component cleanup.
- [ ] Replace the unbounded live-display string with bounded preview storage. Positive tool tail limits may lower the preview size, while a TUI-only maximum must still protect unlimited or unspecified model output.
- [ ] Coalesce component rebuilds so rapid chunks produce at most one pending display update per render frame or short interval, with deterministic flushing and timer cleanup.
- [ ] Render completed tools from the existing final result and release raw streamed output that is no longer needed for display.
- [ ] Bound or clear duplicate controller display-state shell output after tool completion without removing information needed by active status or recovery paths.
- [ ] Add a checked-in TUI scenario that streams enough shell output to exercise batching and proves the final visible result and ordinary input behavior remain correct.
- [ ] Add a deterministic performance regression harness based on retained state and rebuild counts rather than wall-clock thresholds.

## Acceptance criteria

- [ ] Long shell streams retain only the configured TUI preview bound, including when the tool uses unlimited model output.
- [ ] Rapid output does not synchronously rebuild the tool component once per chunk, and the last chunk is visible after success, failure, abort, or shutdown.
- [ ] Stdout and stderr retain their arrival order in the displayed preview.
- [ ] Completed tool components and controller display state do not keep duplicate unbounded shell-output buffers.
- [ ] Command execution, exit handling, final tool results, model-visible truncation, explicit tail behavior, and token limits are unchanged.
- [ ] Focused TUI and controller tests, the shell-stream TUI scenario, lint, typecheck, and the MastraCode package build pass.
