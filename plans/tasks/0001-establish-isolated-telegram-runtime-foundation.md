# Task 0001: Establish the isolated Telegram runtime foundation

**Branch**: `feature/isolated-telegram-runtime-foundation`
**Depends on**: none
**Source**: `ARCHITECTURE.md` · **User stories**: opt into Telegram without changing ordinary MastraCode; keep the experiment isolated from production state; load only MastraCode workflow skills

## What to build

Create the smallest complete CLI/runtime foundation for optional Telegram mode. The two Telegram flags must be recognized without changing normal TUI, headless, ACP, plugin, or piped-input behavior. Telegram paths must resolve to an experiment-specific runtime identity and fail with actionable setup guidance until initialized. Port scoped skill discovery into source so this build reads only project-local and global `.mastracode/skills` locations.

## AFK tasks

- [ ] Add failing tests for Telegram flag routing, unchanged ordinary invocation, isolated runtime paths, and MastraCode-only skill discovery.
- [ ] Add the Telegram command-mode boundary and isolated configuration/state/runtime identity primitives without starting polling yet.
- [ ] Port scoped skill path selection from the packaged runtime patch into TypeScript source and remove reliance on compiled patch behavior.
- [ ] Verify existing non-Telegram skill behavior and all existing CLI modes remain covered and unchanged.

## Acceptance criteria

- [ ] `--telegram-init` and `--telegram` route to explicit source-level entry points; an uninitialized Telegram run gives a safe actionable error.
- [ ] Ordinary MastraCode invocation and existing specialized modes behave exactly as before.
- [ ] Telegram experiment paths cannot resolve to production `~/.mastracode-remote/` state or service controls.
- [ ] Skill discovery for this build includes only `<project>/.mastracode/skills` and `~/.mastracode/skills`, including supported symlink handling.
- [ ] Focused CLI and skill-path tests plus the MastraCode typecheck pass.
