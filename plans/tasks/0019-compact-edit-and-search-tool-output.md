# Task 0019: Compact edit and search tool output

**Branch**: `perf/compact-tool-output`
**Depends on**: 0012
**Source**: user feedback 2026-07-12 · **User story**: follow active work without large partial-code blocks crowding the terminal

## What to build

Replace verbose live tool previews for file edits and searches with compact activity lines. An edit should show the operation, project-relative file path, and affected line range. Search and file-discovery tools should show the operation plus the relevant pattern/path. Do not render partial before/after source snippets in the live activity card.

Keep full tool results available through the existing expanded/history behavior where applicable. Preserve errors, final outcomes, and enough context to understand what the agent is doing without restoring the render churn fixed by task 0012.

## Acceptance criteria

- [ ] Edit activity uses a compact form such as `edit · mastracode/src/tui/mastra-tui.ts:527-538` without partial source blocks.
- [ ] Search and file-discovery activity shows a compact operation, pattern, and project-relative path.
- [ ] Errors and final results remain visible and expansion/history retains the existing useful detail.
- [ ] Focused renderer tests, type checking, build, performance validation, and checked-in TUI end-to-end coverage pass.
