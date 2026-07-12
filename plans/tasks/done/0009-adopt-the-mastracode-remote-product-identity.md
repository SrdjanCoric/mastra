# Task 0009: Adopt the MastraCode Remote product identity

**Branch**: `feature/mastracode-remote-product-identity`
**Depends on**: 0008
**Source**: naming decision 2026-07-12 · **User stories**: install the improved product under its established name; understand that it is MastraCode with Telegram; avoid temporary or fork-specific terminology

## What to build

Rename the publishable package and command to the established `mastracode-remote` identity. Describe it plainly as MastraCode with a Telegram interface connected to the same live TUI session. This product requires the terminal-visible TUI and must not retain the legacy headless daemon as an alternate mode. Remove temporary naming from package metadata, setup output, documentation, architecture text, release notes, and user-facing messages. Preserve the isolated runtime boundary from the legacy `mastracode-remote` 0.1.x daemon so upgrading cannot read, overwrite, or start old production state accidentally.

## AFK tasks

- [x] Add failing package and CLI tests for the `mastracode-remote` package name, executable, setup command, help text, description, and packed archive.
- [x] Replace the temporary package and executable identity with `mastracode-remote` throughout build entries, package metadata, generated documentation, setup guidance, and release metadata.
- [x] Change the README install command to `npm install --global mastracode-remote` and document `mastracode-remote --init` plus `mastracode-remote` as the only package commands.
- [x] Use the description "MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram."
- [x] Remove temporary naming from active user-facing documentation and messages without rewriting historical Git records.
- [x] Make repository, homepage, issue, and release metadata point only to locations controlled by `SrdjanCoric`. Publish the `mastracode/` workspace as the self-contained `mastracode-remote` package, with no separately published runtime or external bridge-repository dependency.
- [x] Keep the new TUI-backed runtime isolated from legacy 0.1.x configuration, state, launchd services, and process ownership. Document the compatibility boundary and cleanup path.
- [x] Prove that the packed workspace contains only the intended MastraCode Remote package, exposes the intended executable, and does not overwrite the official `mastracode` executable.

## Acceptance criteria

- [x] Package metadata names `mastracode-remote`, and the installed executable is `mastracode-remote`.
- [x] `mastracode-remote --init` prepares the project and `mastracode-remote` starts MastraCode with Telegram attached to the same TUI session.
- [x] The package description is "MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram."
- [x] Active README, help, setup, architecture, and release text use the MastraCode Remote product identity consistently.
- [x] Package and repository metadata identify `SrdjanCoric` as the owner, publish a self-contained `mastracode-remote` package, and do not require a separate runtime package or legacy bridge repository to build, run, or release the product.
- [x] Legacy 0.1.x state and launchd services remain untouched, and the official `mastracode` package and executable still coexist safely.
- [x] Focused package, CLI, isolation, lint, typecheck, build, pack, and install-smoke checks pass.

## Implementation log

- Renamed the package and executable to `mastracode-remote` and kept the package self-contained. It has no dependency on the legacy bridge package or a separately published runtime.
- Updated setup guidance, runtime messages, package metadata, changesets, architecture text, and the package README. The README documents the visible TUI, Telegram commands, isolated runtime directory, and the legacy 0.1.x boundary.
- Removed the headless build entry and excluded headless output from the npm archive. Package tests verify the published name, executable, repository metadata, bundled skills, README, and archive contents.
- Verified 32 focused tests, package typecheck, package lint, the 50-task MastraCode build, and an isolated pack/install smoke test. The smoke test preserved a pre-existing `mastracode` executable and a sentinel under `~/.mastracode-remote/`.
- PR #10 merged into `main` at `54b688fba5604b10e5a377fec9fde6534d206715`.
