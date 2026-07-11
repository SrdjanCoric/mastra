# Task 0001: Establish the isolated Telegram runtime foundation

**Branch**: `feature/isolated-telegram-runtime-foundation`
**Depends on**: none
**Source**: `ARCHITECTURE.md` · **User stories**: opt into Telegram without changing ordinary MastraCode; keep the experiment isolated from production state; load only MastraCode workflow skills

## What to build

Create the smallest complete CLI/runtime foundation for the separately published `@srdjancoric/mastracode-telegram` package and `mastracode-telegram` executable. `--init` must route to setup, while invocation without it must route to the stock TUI boundary and fail with actionable setup guidance until initialized. The official `mastracode` package and all normal TUI, headless, ACP, plugin, and piped-input behavior must remain unchanged. Telegram paths must resolve to an experiment-specific runtime identity. Port scoped skill discovery into source so this build reads only project-local and global `.mastracode/skills` locations.

## AFK tasks

- [ ] Add failing tests for the separate package/bin identity, `--init` routing, unchanged official invocation, isolated runtime paths, and MastraCode-only skill discovery.
- [ ] Add the `mastracode-telegram` command-mode boundary and isolated configuration/state/runtime identity primitives without starting polling yet.
- [ ] Port scoped skill path selection from the packaged runtime patch into TypeScript source and remove reliance on compiled patch behavior.
- [ ] Verify existing non-Telegram skill behavior and all existing CLI modes remain covered and unchanged.

## Acceptance criteria

- [ ] Only the `mastracode/` workspace is prepared for publication as `@srdjancoric/mastracode-telegram`, exposing `mastracode-telegram --init` and `mastracode-telegram`; an uninitialized run gives a safe actionable error.
- [ ] The official `mastracode` package, executable, ordinary invocation, and existing specialized modes behave exactly as before.
- [ ] Telegram experiment paths cannot resolve to production `~/.mastracode-remote/` state or service controls.
- [ ] Skill discovery for this build includes only `<project>/.mastracode/skills` and `~/.mastracode/skills`, including supported symlink handling.
- [ ] Focused CLI and skill-path tests plus the MastraCode typecheck pass.
