# Task 0009: Adopt the MastraCode Remote product identity

**Branch**: `feature/mastracode-remote-product-identity`
**Depends on**: 0008
**Source**: naming decision 2026-07-12 · **User stories**: install the improved product under its established name; understand that it is MastraCode with Telegram; avoid temporary or fork-specific terminology

## What to build

Rename the publishable package and command to the established `mastracode-remote` identity. Describe it plainly as MastraCode with a Telegram interface connected to the same live TUI session. This product requires the terminal-visible TUI and must not retain the legacy headless daemon as an alternate mode. Remove temporary naming from package metadata, setup output, documentation, architecture text, release notes, and user-facing messages. Preserve the isolated runtime boundary from the legacy `mastracode-remote` 0.1.x daemon so upgrading cannot read, overwrite, or start old production state accidentally.

## AFK tasks

- [ ] Add failing package and CLI tests for the `mastracode-remote` package name, executable, setup command, help text, description, and packed archive.
- [ ] Replace the temporary package and executable identity with `mastracode-remote` throughout build entries, package metadata, generated documentation, setup guidance, and release metadata.
- [ ] Change the README install command to `npm install --global mastracode-remote` and document `mastracode-remote --init` plus `mastracode-remote` as the only package commands.
- [ ] Use the description "MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram."
- [ ] Remove temporary naming from active user-facing documentation and messages without rewriting historical Git records.
- [ ] Make repository, homepage, issue, and release metadata point only to locations controlled by `SrdjanCoric`. Keep the CLI package as `mastracode-remote`, keep the pinned runtime under the existing `@mastracode-remote/mastracode-runtime` organization scope, and remove external bridge-repository dependencies and references from the active product path.
- [ ] Keep the new TUI-backed runtime isolated from legacy 0.1.x configuration, state, launchd services, and process ownership. Document the compatibility boundary and cleanup path.
- [ ] Prove that the packed workspace contains only the intended MastraCode Remote package, exposes the intended executable, and does not overwrite the official `mastracode` executable.

## Acceptance criteria

- [ ] Package metadata names `mastracode-remote`, and the installed executable is `mastracode-remote`.
- [ ] `mastracode-remote --init` prepares the project and `mastracode-remote` starts MastraCode with Telegram attached to the same TUI session.
- [ ] The package description is "MastraCode with Telegram. Run the normal terminal TUI and continue the same session from Telegram."
- [ ] Active README, help, setup, architecture, and release text use the MastraCode Remote product identity consistently.
- [ ] Package and repository metadata identify `SrdjanCoric` and the existing `mastracode-remote` npm organization as the owners, preserve `@mastracode-remote/mastracode-runtime` as the runtime dependency, and do not require the legacy bridge repository to build, run, or release the product.
- [ ] Legacy 0.1.x state and launchd services remain untouched, and the official `mastracode` package and executable still coexist safely.
- [ ] Focused package, CLI, isolation, lint, typecheck, build, pack, and install-smoke checks pass.
