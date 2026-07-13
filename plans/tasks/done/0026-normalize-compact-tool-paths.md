# Task 0026: Normalize compact tool paths

**Branch**: `fix/compact-tool-paths`
**Depends on**: 0025
**Source**: user screenshot 2026-07-13 · **User story**: keep compact file activity readable without exposing or truncating long absolute workstation paths

## What to build

Render absolute file-tool arguments relative to the active terminal working directory in compact activity summaries while preserving the original path for file links and tool execution. Apply the normalization consistently to view, edit, write, search, discovery, stat, delete, mkdir, and AST-edit summaries.

Keep the task focused on the current-source defect confirmed after the partial-preview fix. The screenshot's source fragments, long rails, excess spacing, and bounded managed-workflow status came from a process started before the relevant fixes and are covered by the installed-session verification rather than duplicate renderer changes.

## Acceptance criteria

- [x] Compact file activity does not display a long absolute path when it can show a working-directory-relative path.
- [x] The compact summary retains the filename and line range at ordinary terminal widths.
- [x] File hyperlinks continue to target the original absolute path.
- [x] Relative and glob paths preserve their existing meaning.
- [x] Focused renderer tests, the quiet TUI scenario, package checks, and installed-artifact verification pass.

## Triage evidence

- The screenshot came from PID 33593, started at 00:52 before the unlimited-status and compact-renderer fixes; it was still using its startup-loaded renderer while consuming roughly 1.0 GiB RSS and 99% CPU.
- The globally installed executable is `mastracode-remote@0.2.4`; npm still reports `0.2.4` as latest.
- Replaying the same two grouped absolute-path views against current source removed source fragments and long rails, but the first summary still rendered a long absolute path truncated before the filename. The continuation summary was compact and aligned.

## Verification evidence

- Replaying the screenshot's two absolute-path `view` calls against the fixed component renders `e2e/tui/persistent-goal-judge-decision.ts:1-260` followed by the compact aligned continuation `…/fixtures/persistent-goal-judge-decision.json:1-260`; no source fragments, absolute workstation prefix, or long rail remains.
- Focused renderer coverage passed with 3 files / 94 tests. New cases cover absolute paths for view, write, search, discovery, stat, delete, mkdir, and AST-edit summaries.
- `pnpm check:mastracode` passed with 209 files / 2,132 tests, all 3 integration scenarios, type and quality checks, and the active-display benchmark. The 3.1 MB quiet-view case completed in 11.2 ms; the 20,000-chunk display case completed in 155.3 ms with 61,000 retained characters and 1,000 retained lines.
- The checked-in `quiet-tool-history-parity` TUI scenario passed and showed compact path/range summaries without partial code.
- Exact package verification passed for `mastracode-remote-0.2.5.tgz` (`sha256=04e79a1c7b49378dfbc0c7e723935f34a1df83fd7a562d6989f9d408e61b17e7`) including isolated install, executable coexistence, archive contents, and legacy-state checks.
- The user's active PID 33593 cannot adopt renderer or unlimited-goal fixes without restart because it loaded its code at 00:52, before those fixes were built and merged. Publication remains blocked pending review and explicit authorization; after installation, the user-facing session must be restarted.

## Review evidence

- Automatic standards, specification, and bug review found no blocker, major, minor, or nit findings. Security review was skipped because the change only alters TUI path presentation and tests; it does not change file access, tool execution, permissions, parsing, dependencies, or release trust boundaries.
- Software Repository Guidelines review loaded `00-overview`, `01-style-and-code-quality`, `02-testing`, `06-code-health-and-maintainability`, and `10-definition-of-done`. The change is formatted, strictly typed by the package check, covered at the component and TUI boundaries, measured by the existing performance gate, and verified in the exact release archive; no current-task proof gaps remain.
