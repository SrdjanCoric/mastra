# Task 0010: Publish MastraCode Remote to npm

**Branch**: `feature/publish-mastracode-remote-to-npm`
**Depends on**: 0007
**Source**: publication decision 2026-07-12 · **User stories**: install MastraCode Remote from npm; run the visible MastraCode TUI with Telegram; verify the published package before relying on it

## What to build

Publish the completed terminal-visible implementation as the next public release of the existing unscoped npm package `mastracode-remote`. The release replaces the old headless daemon workflow with MastraCode's visible TUI and its Telegram interface. Prepare and verify the exact tarball first, stop for explicit authorization before the public registry write, then verify the released package from a clean isolated install.

## AFK tasks

- [ ] Confirm the authenticated account can publish the existing `mastracode-remote` package; verify current dist-tags and the intended next version without reading npm credential files.
- [ ] Build, test, pack, and inspect the exact release archive. Verify its name, version, executable, README, license, bundled workflow skills, dependency resolution, and exclusion of unrelated monorepo files.
- [ ] Install the archive into an isolated prefix and temporary home, then smoke-test help, guided init with mocked external seams, visible TUI startup, runtime isolation, and coexistence with the official `mastracode` executable.
- [ ] Prepare the release notes so existing 0.1.x users are told that this release replaces the headless daemon with a terminal-visible TUI that Telegram controls remotely.
- [ ] After publication is authorized and completed, verify registry metadata, public visibility, dist-tags, provenance when available, clean installation, executable startup, and the published README.
- [ ] Record the published version and verification results in the task implementation log and pull request without recording credentials, tokens, one-time codes, or private Telegram content.

## Human-in-the-loop tasks

- [ ] [confirm-security] Sign in to the npm account that owns `mastracode-remote`, review the final package name, version, public visibility, archive contents, and breaking replacement of the 0.1.x headless daemon, then authorize the public publish and complete any required two-factor authentication. This writes an irreversible public release under the existing package name.

## Acceptance criteria

- [ ] The npm registry serves the approved new version as `mastracode-remote` with public visibility and the intended dist-tag.
- [ ] A clean install exposes `mastracode-remote`, which starts the visible MastraCode TUI with Telegram support; it does not start or install the old headless daemon or launchd service.
- [ ] The published description explains that this is MastraCode with a Telegram interface for the same live TUI session.
- [ ] The official `mastracode` executable and legacy 0.1.x state remain untouched during install and first run.
- [ ] Registry metadata, packed contents, README rendering, release notes, clean install, help, init, and startup smoke checks pass.
