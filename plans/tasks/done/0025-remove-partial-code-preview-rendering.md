# Task 0025: Remove partial-code preview rendering

**Branch**: `perf/remove-partial-code-preview`
**Depends on**: 0024
**Source**: user report 2026-07-13 · **User story**: keep live file activity compact without intermittent source fragments or slow full-width connector animation

## What to build

Remove quiet-mode source-code previews from file-view activity so live tool cards consistently show only compact path and line-range summaries. Replace shared-path continuation placeholders that grow with the streamed path length with a fixed compact continuation marker.

Keep full tool results available through the existing expanded/history behavior where applicable. Preserve errors and final outcomes. Verify the fix against the real quiet-mode TUI boundary and add a performance regression that exercises large view results rather than only shell output.

## Acceptance criteria

- [x] Quiet `view`, edit, search, and discovery activity never renders partial source-code blocks.
- [x] Grouped tool continuations do not render path-length-sized horizontal connector lines while arguments stream.
- [x] Large quiet view results are reduced before syntax highlighting/rendering and do not create multi-second or high-memory display work.
- [x] Errors and expanded/history detail remain available through their existing paths.
- [x] Focused renderer tests, type checking, build, package tests, performance validation, and checked-in TUI end-to-end coverage pass.

## Diagnosis evidence

- Existing renderer coverage reproduces the intermittent source fragments by explicitly expecting quiet `view` tools to render two source lines.
- Existing continuation coverage reproduces the green line by explicitly expecting repeated `─` characters proportional to the shared path prefix.
- A 20,000-line, 3.1 MB quiet `view` result took 7.5 seconds and increased heap use by roughly 76.7 MB while producing only a two-line visible preview. The renderer highlights the full result before slicing to the configured preview limit.
- A 20,000-update streamed-path probe scheduled only two visible rebuilds, so adaptive batching is working; the expensive path is large source-preview processing rather than the scheduler itself.

## Implementation and verification evidence

- Quiet `view`, `write_file`, `string_replace_lsp`, search, and discovery tools now stay on the compact activity-summary path. Source text is not syntax-highlighted or rendered in collapsed live cards; errors still use the existing error-detail path.
- Shared path prefixes now render as a fixed `…` / `…/` marker. Continuation branches stay constant-width rather than growing into long green rails while arguments stream.
- The checked-in `quiet-tool-history-parity` TUI scenario passed for both live and restored tool history. Its real terminal output showed only compact `view`, `edit`, `grep`, and `list` summaries and asserted that source markers were absent.
- The 20,000-line, 3.1 MB quiet-view benchmark dropped from 7.5 seconds / roughly 76.7 MB transient heap growth to 13.2 ms in the full verification run, with a 270-character rendered summary and no source leakage.
- `pnpm check:mastracode` passed: build and quality gates, 209 unit files / 2,124 tests, three package integration scenarios, the active-display benchmark, release configuration, and exact `mastracode-remote-0.2.5.tgz` archive verification (`sha256=1d4362685a86e4f66dc7d5032eebfb306331c8f80503e3706fd14868625544a8`).

## Software Repository Guidelines

**Mode**: implement

- Keep the renderer change localized and strictly typed.
- Add deterministic component-level and checked-in TUI coverage at the real presentation boundary.
- Extend performance proof to the large quiet-view result that reproduced the issue.
- Do not publish `0.2.5` until this fix is merged and the exact release archive is reverified.

## Review evidence

- Automatic task review found no blocker, major, minor, or nit findings across standards, specification, and bug lenses.
- Security review was skipped because the diff changes only TUI presentation, tests, and performance measurement; it does not touch authentication, secrets, parsing boundaries, network/file access, dependencies, or release trust configuration.
- Software Repository Guidelines review loaded `00-overview`, `01-style-and-code-quality`, `02-testing`, `06-code-health-and-maintainability`, and `10-definition-of-done`. Applicable style, type, deterministic test, TUI boundary, performance, artifact-size, and canonical validation requirements are complete with the evidence above; no current-task proof gaps remain.
