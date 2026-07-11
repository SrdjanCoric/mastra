# Task 0001: Establish the isolated Telegram runtime foundation

**Branch**: `feature/isolated-telegram-runtime-foundation`
**Depends on**: none
**Source**: `ARCHITECTURE.md` · **User stories**: opt into Telegram without changing ordinary MastraCode; keep the experiment isolated from production state; load only MastraCode workflow skills

## What to build

Create the smallest complete CLI/runtime foundation for the separately published `@srdjancoric/mastracode-telegram` package and `mastracode-telegram` executable. `--init` must route to setup, while invocation without it must route to the stock TUI boundary and fail with actionable setup guidance until initialized. The official `mastracode` package and all normal TUI, headless, ACP, plugin, and piped-input behavior must remain unchanged. Telegram paths must resolve to an experiment-specific runtime identity. Port scoped skill discovery into source so this build reads only project-local and global `.mastracode/skills` locations.

## AFK tasks

- [x] Add failing tests for the separate package/bin identity, `--init` routing, unchanged official invocation, isolated runtime paths, and MastraCode-only skill discovery.
- [x] Add the `mastracode-telegram` command-mode boundary and isolated configuration/state/runtime identity primitives without starting polling yet.
- [x] Port scoped skill path selection from the packaged runtime patch into TypeScript source and remove reliance on compiled patch behavior.
- [x] Verify existing non-Telegram skill behavior and all existing CLI modes remain covered and unchanged.

## Acceptance criteria

- [x] Only the `mastracode/` workspace is prepared for publication as `@srdjancoric/mastracode-telegram`, exposing `mastracode-telegram --init` and `mastracode-telegram`; an uninitialized run gives a safe actionable error.
- [x] The official `mastracode` package, executable, ordinary invocation, and existing specialized modes behave exactly as before.
- [x] Telegram experiment paths cannot resolve to production `~/.mastracode-remote/` state or service controls.
- [x] Skill discovery for this build includes only `<project>/.mastracode/skills` and `~/.mastracode/skills`, including supported symlink handling.
- [x] Focused CLI and skill-path tests plus the MastraCode typecheck pass.

## Implementation log

- Implemented on `feature/isolated-telegram-runtime-foundation`.
- Added the isolated npm/bin identity, Telegram CLI boundary, readiness guard, runtime path resolver, and source-level MastraCode-only skill scope.
- Preserved the stock CLI entrypoint and updated package-root detection so existing plugin and headless behavior continues to work in the renamed package.
- Verified with focused tests, all 1,979 MastraCode unit tests, lint, typecheck, build, invalid-readiness executable smoke tests, and an npm pack metadata/content check.
- Merged in PR #1 with merge commit `8a124467926d9e71c9f1fcbc7b18a95fcd6f9d3e`.
