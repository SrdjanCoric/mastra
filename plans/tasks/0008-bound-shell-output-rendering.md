# Task 0008: Bound shell-output rendering

**Branch**: `feature/bound-shell-output-rendering`
**Depends on**: 0005
**Source**: CPU and memory diagnosis 2026-07-12 · **User stories**: keep typing responsive during noisy commands; run long sessions without retaining unbounded display output; preserve command and model behavior

## What to build

Fix the shell-output display path without changing command execution or the result returned to the model. Keep a bounded live preview, coalesce rapid output into scheduled display updates, flush the final chunk when execution ends, and release duplicate display buffers after completion. Fast commands may appear in small batches, but output order, final status, errors, and model-visible results must remain unchanged.

## AFK tasks

- [x] Add failing regression tests for rapid stdout and stderr chunks, bounded retained preview state, final flushes, successful and failed commands, cancellation, and component cleanup.
- [x] Replace the unbounded live-display string with bounded preview storage. Positive tool tail limits may lower the preview size, while a TUI-only maximum must still protect unlimited or unspecified model output.
- [x] Coalesce component rebuilds so rapid chunks produce at most one pending display update per render frame or short interval, with deterministic flushing and timer cleanup.
- [x] Render completed tools from the existing final result and release raw streamed output that is no longer needed for display.
- [x] Bound or clear duplicate controller display-state shell output after tool completion without removing information needed by active status or recovery paths.
- [x] Add a checked-in TUI scenario that streams enough shell output to exercise batching and proves the final visible result and ordinary input behavior remain correct.
- [x] Add a deterministic performance regression harness based on retained state and rebuild counts rather than wall-clock thresholds.

## Acceptance criteria

- [x] Long shell streams retain only the configured TUI preview bound, including when the tool uses unlimited model output.
- [x] Rapid output does not synchronously rebuild the tool component once per chunk, and the last chunk is visible after success, failure, abort, or shutdown.
- [x] Stdout and stderr retain their arrival order in the displayed preview.
- [x] Completed tool components and controller display state do not keep duplicate unbounded shell-output buffers.
- [x] Command execution, exit handling, final tool results, model-visible truncation, explicit tail behavior, and token limits are unchanged.
- [x] Focused TUI and controller tests, the shell-stream TUI scenario, lint, typecheck, and the MastraCode package build pass.

## Implementation log

- Added bounded live shell previews with separate character and line limits. Explicit positive tail settings can lower the line limit, while unlimited output still uses the TUI safety cap.
- Batched rapid shell chunks behind one 16 ms display update, with deterministic completion and shutdown flushes. Completed components render the final tool result and release the raw live buffer.
- Bounded the controller's active-tool shell display state and clear it on success, failure, and abort so the TUI and controller do not retain duplicate growing strings.
- Added deterministic retained-character and scheduled-rebuild assertions, plus the checked-in `shell-output-batching` TUI scenario. The scenario renders 500 stdout and 500 stderr lines, reaches the final assistant result, and accepts the next terminal message.
- Proof: 77 focused MastraCode component and handler tests passed; 100 focused core display-state tests passed; the `shell-output-batching` TUI scenario passed; MastraCode and core typechecks, MastraCode lint, and `pnpm build:mastracode` passed.
