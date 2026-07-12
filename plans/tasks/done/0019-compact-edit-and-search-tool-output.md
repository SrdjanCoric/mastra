# Task 0019: Compact edit and search tool output

**Branch**: `perf/compact-tool-output`
**Depends on**: 0012
**Source**: user feedback 2026-07-12 · **User story**: follow active work without large partial-code blocks crowding the terminal

## What to build

Replace verbose live tool previews for file edits and searches with compact activity lines. An edit should show the operation, project-relative file path, and affected line range. Search and file-discovery tools should show the operation plus the relevant pattern/path. Do not render partial before/after source snippets in the live activity card.

Keep full tool results available through the existing expanded/history behavior where applicable. Preserve errors, final outcomes, and enough context to understand what the agent is doing without restoring the render churn fixed by task 0012.

## Acceptance criteria

- [x] Edit activity uses a compact form such as `edit · mastracode/src/tui/mastra-tui.ts:527-538` without partial source blocks.
- [x] Search and file-discovery activity shows a compact operation, pattern, and project-relative path.
- [x] Errors and final results remain visible and expansion/history retains the existing useful detail.
- [x] Focused renderer tests, type checking, build, performance validation, and checked-in TUI end-to-end coverage pass.

## Implementation notes

- Quiet-mode edit, AST edit, content-search, and file-discovery tools now suppress live detail previews while preserving detailed error output.
- Edit summaries retain the tool-reported line range. Search and discovery summaries include the pattern, path, and final result count.
- The existing `quiet-tool-history-parity` TUI scenario now exercises real edit, search, and discovery calls and proves edit source text is not rendered in the live terminal.
- README was not changed because this refines transient TUI presentation without changing setup, commands, configuration, or the documented bounded-output contract.

## Software Repository Guidelines

**Mode**: implement

**References loaded**: `00-overview.md`, `01-style-and-code-quality.md`, `02-testing.md`, `06-code-health-and-maintainability.md`, `10-definition-of-done.md`

- Applicable: keep the renderer strictly typed and localized; preserve existing tool error/result behavior; add deterministic unit and TUI coverage; run package-scoped build, checks, and performance validation.
- Complete evidence: the change is confined to the existing enhanced tool renderer and its tests/fixture; no casts or suppressions were added; focused and package validation are green.
- Deferred: terminal image-prompt repair remains owned by task 0021.
- Decisions required: none.

## Verification

- `pnpm --filter ./mastracode exec vitest run src/tui/components/__tests__/tool-execution-enhanced.test.ts --reporter=dot` → 1 file, 73 tests passed.
- `pnpm build:mastracode` → 50 tasks passed.
- `MC_E2E_VITEST_SCENARIOS=quiet-tool-history-parity pnpm --filter ./mastracode exec vitest run --config e2e/vitest.config.ts --reporter=dot` → 1 scenario passed.
- `pnpm --filter ./mastracode check` → passed.
- `pnpm --filter ./mastracode lint` → passed.
- `pnpm test:mastracode` → 209 files, 2,127 tests passed.
- `pnpm performance:mastracode` → 20,000 chunks, 2 visible rebuilds, 61,000 retained chars, 1,000 retained lines, cleanup returned retained output to zero.
- Prettier and `git diff --check` → passed.

## Review

- Initial standards/spec/bug review found one multiline-pattern edge case: raw search patterns could introduce line breaks into the compact activity line.
- Fixed by JSON-escaping string and array pattern values, with deterministic quoted/multiline coverage.
- Retry review found no blocker or major findings. Security review was skipped because the diff changes presentation only and does not touch authorization, secrets, file/network boundaries, dependencies, or command execution.
