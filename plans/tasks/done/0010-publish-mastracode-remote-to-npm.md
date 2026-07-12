# Task 0010: Publish MastraCode Remote to npm

**Branch**: `feature/publish-mastracode-remote-to-npm`
**Depends on**: 0007
**Source**: publication decision 2026-07-12 · **User stories**: install MastraCode Remote from npm; run the visible MastraCode TUI with Telegram; verify the published package before relying on it

## What to build

Publish the completed terminal-visible implementation as the next public release of the existing unscoped npm package `mastracode-remote`. The release replaces the old headless daemon workflow with MastraCode's visible TUI and its Telegram interface. Prepare and verify the exact tarball first, stop for explicit authorization before the public registry write, then verify the released package from a clean isolated install.

## AFK tasks

- [x] Confirm the authenticated account can publish the existing `mastracode-remote` package; verify current dist-tags and the intended next version without reading npm credential files.
- [x] Build, test, pack, and inspect the exact release archive. Verify its name, version, executable, README, license, bundled workflow skills, dependency resolution, and exclusion of unrelated monorepo files.
- [x] Install the archive into an isolated prefix and temporary home, then smoke-test help, guided init with mocked external seams, visible TUI startup, runtime isolation, and coexistence with the official `mastracode` executable.
- [x] Prepare the release notes so existing 0.1.x users are told that this release replaces the headless daemon with a terminal-visible TUI that Telegram controls remotely.
- [x] After publication is authorized and completed, verify registry metadata, public visibility, dist-tags, provenance when available, clean installation, executable startup, and the published README.
- [x] Record the published version and verification results in the task implementation log and pull request without recording credentials, tokens, one-time codes, or private Telegram content.

## Human-in-the-loop tasks

- [x] [confirm-security] Sign in to the npm account that owns `mastracode-remote`, review the final package name, version, public visibility, archive contents, and breaking replacement of the 0.1.x headless daemon, then authorize the public publish and complete any required two-factor authentication. This writes an irreversible public release under the existing package name.

## Acceptance criteria

- [x] The npm registry serves the approved new version as `mastracode-remote` with public visibility and the intended dist-tag.
- [x] A clean install exposes `mastracode-remote`, which starts the visible MastraCode TUI with Telegram support; it does not start or install the old headless daemon or launchd service.
- [x] The published description explains that this is MastraCode with a Telegram interface for the same live TUI session.
- [x] The official `mastracode` executable and legacy 0.1.x state remain untouched during install and first run.
- [x] Registry metadata, packed contents, README rendering, release notes, clean install, help, init, and startup smoke checks pass.

## Implementation log

Completed on 2026-07-12.

- Confirmed npm account `srdjano1` owns the public `mastracode-remote` package. Before publication, npm served `0.1.3` under the `latest` tag.
- Prepared version `0.2.0` and consolidated the package changesets into `mastracode/CHANGELOG.md`. The release notes explicitly describe the replacement of the 0.1.x headless daemon with the terminal-visible TUI.
- Added package-level `--help` handling so the installed executable can explain setup before Telegram initialization.
- Built the exact archive at `/tmp/mastracode-remote-release-0.2.0/mastracode-remote-0.2.0.tgz`. Its pre-publish SHA-256 was `e34d61bb3d83056b459db7e1958f5462fb2a171c74d2f6806dee25ed82bd1b14`; npm reported SHA-1 `5da4519bc5c1b330a6748441ff4573a01b513668`, 636 files, and the expected package identity, executable, README, license, and 12 managed skills.
- The user reviewed the public package name, `0.2.0` version, `latest` tag, archive contents, and breaking runtime replacement, then explicitly authorized publication and completed security-key authentication.
- Published public `mastracode-remote@0.2.0` with the `latest` tag. Manual CLI publication did not provide provenance metadata.
- Registry verification confirmed public version `0.2.0`, `latest: 0.2.0`, the intended description, Apache-2.0 license, published README, integrity `sha512-7Yuinrspb6wsY97ziAev6BkBQLvErTV8+0BE7IU0vP+Sub/TmDV0oQiX72VYYiimnlVpQ6RXT5Hn8WwM5HNpIA==`, and SHA-1 `5da4519bc5c1b330a6748441ff4573a01b513668`.
- A clean registry install of `mastracode-remote@0.2.0` passed. The `mastracode-remote` executable printed help and initialization guidance, the official `mastracode` executable remained intact, and legacy state and launchd sentinels were unchanged.
- Verification: `pnpm build:mastracode`, `pnpm test:mastracode` (2,088 tests in 205 files), `pnpm --filter ./mastracode check`, and `pnpm --filter ./mastracode lint` passed.
- Focused verification passed 21 tests in 5 files for package metadata, CLI help, guided init, and setup. The checked-in `startup` TUI scenario also passed.
- Brownfield review found no blocking, major, minor, or security findings. Changes stayed within the MastraCode package and required release/task metadata; no Mastra framework package was modified.
- Merged in PR #12 with merge commit `7f1ac495c190a1349b85704b46d634ff40eb6e35`.
- Follow-up PR #13 fixed nested project initialization so the working directory keeps its own Telegram topic while Git and GitHub checks use the enclosing repository root. PR #14 prepared patch release `0.2.1`.
- Published `mastracode-remote@0.2.1` under `latest`. Registry verification reported integrity `sha512-XfU2UdPNd6wklw2CBuLL0PBqpC1J4PGIklDIZDl70jqmi5mcbKut+CY0PAFKvq3POf0lCoCEe5KozZ/pTiqzzQ==` and SHA-1 `8c25e00a3736b979259807596216a182cd20ab43`.
- A clean registry install of `0.2.1` passed. The installed package reported the correct version, and the executable displayed help before initialization without creating legacy state.
