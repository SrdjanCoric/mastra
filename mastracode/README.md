# MastraCode Remote

MastraCode Remote is MastraCode with Telegram. Run the normal terminal TUI and continue the same session from a private Telegram topic.

The npm package and executable are both named `mastracode-remote`.

## What it does

- Runs the standard MastraCode TUI in your terminal.
- Keeps live command output bounded and batches display updates so noisy commands use less CPU and memory.
- Connects one private Telegram forum topic to the current project.
- Sends completed assistant responses and interactive prompts to Telegram.
- Routes Telegram messages into the same MastraCode session and follow-up queue.
- Lets you answer questions and approvals from Telegram or the terminal.
- Keeps model selection, thread management, and settings in the terminal.

Each project is identified by its canonical absolute path and gets one persistent Telegram topic. The TUI owns the MastraCode session. A local broker owns Telegram polling, which lets several open project sessions share one bot safely.

The TUI must remain open for Telegram control to work. Closing it ends Telegram access to that project session.

## Requirements

- Node.js 22.19 or newer
- Git
- [GitHub CLI](https://cli.github.com/) authenticated with `gh auth login`
- A configured MastraCode model provider
- A private Telegram supergroup with Topics enabled
- A Telegram bot that can access the group and manage topics

## Install

```bash
npm install --global mastracode-remote
```

This installs `mastracode-remote`. It does not replace the official `mastracode` executable, so both packages can be installed at the same time.

## Initialize a project

Run the setup from the project directory:

```bash
cd /path/to/project
mastracode-remote --init
```

The guided setup:

1. Confirms the project directory.
2. Offers to initialize Git when needed.
3. Configures missing Git author details for the repository.
4. Offers to create a private or public GitHub repository.
5. Checks GitHub CLI installation and authentication.
6. Collects or reuses the Telegram bot token, allowed user ID, and group ID.
7. Creates or reuses the project topic.
8. Installs the managed MastraCode workflow skills.
9. Verifies the Telegram connection before marking the project ready.

Setup does not install launchd or start a persistent system daemon.

## Run

From an initialized project:

```bash
mastracode-remote
```

Use the terminal TUI normally. Messages sent in the project topic enter the same conversation. Telegram messages that arrive during an active run use MastraCode's follow-up queue.

## Recommended workflow

`mastracode-remote --init` installs the custom workflow skills shipped with the package. For most project work, launch MastraCode Remote and tell it:

```text
mastra workflow
```

MastraCode asks what you want to do before it sends a model request:

- **Run existing plan** starts a persistent goal for the unfinished tasks in `plans/PLAN.md`.
- **Plan a new feature** collects the feature in the terminal, then starts the guided design interview. The workflow adds the agreed work to the plan before implementation begins.

Telegram messages received during a run enter the same session, so MastraCode can answer them and continue the workflow.

To skip the choice and start the existing plan directly, tell it:

```text
mastra workflow --run
```

The `--run` option starts the same persistent goal used by **Run existing plan**.

Rerun `mastracode-remote --init` to restore or update the packaged workflow skills. Local changes to a packaged skill are backed up before replacement.

## Telegram commands

| Command   | Behavior                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/status` | Shows the project, active thread, model, mode, run state, queued follow-ups, and Telegram health without exposing transcripts or tool arguments. |
| `/stop`   | Stops the active turn or tool and clears queued Telegram follow-ups without closing the TUI.                                                     |
| `/help`   | Lists the supported Telegram commands and the controls that remain terminal-only.                                                                |

Other slash commands, model selection, thread switching, and settings stay in the terminal.

## Questions and approvals

Questions use Telegram reply binding. Tool approvals use Approve and Deny buttons. Prompt identities are tracked internally, so you do not need to type an ID.

The first valid response from Telegram or the terminal resolves the prompt. Delayed or duplicate responses cannot resolve another prompt.

## Security boundary

MastraCode Remote accepts Telegram control only from the configured user, private group, and project topic. The bot token is stored in `~/.mastracode-telegram/config/secrets.json` with owner-only permissions.

Telegram receives completed assistant messages, lifecycle notices, and redacted prompts. It does not receive token streaming, shell output, tool arguments, secrets, or full transcripts. Approvals are never automatic. Model selection, thread switching, settings, shell passthrough, and privileged TUI commands remain terminal-only.

Anyone who can read the Telegram group can read messages posted there. Use a private group, restrict its membership, protect the Telegram account with two-step verification, and rotate the bot token if it is exposed.

## Runtime data and 0.1.x compatibility

This TUI-backed version stores Telegram data under a separate runtime root:

```text
~/.mastracode-telegram/
├── config/
├── state/
├── runtime/
└── logs/
```

It does not read, modify, or delete the legacy 0.1.x `~/.mastracode-remote/` directory or its launchd service. It also does not migrate old settings automatically.

Before replacing a 0.1.x installation, uninstall its service with the old CLI:

```bash
mastracode-remote service uninstall
```

Then install the current package and run `mastracode-remote --init` in each project. Keep `~/.mastracode-remote/` until you have confirmed that you no longer need the old configuration or logs. The current package only uses `~/.mastracode-telegram/`.

Bot secrets are stored separately with owner-only file permissions. Do not commit either runtime directory or copy secret files into a project.

## Troubleshooting

### Telegram is not initialized

Run `mastracode-remote --init` from the same canonical project directory. Initialization is recorded per project path, so moving or copying the project requires another setup run.

### The connectivity test times out

Confirm that the bot is an administrator in the configured private forum group, can manage topics, and can read messages from the allowed user. Reply in the project topic with the code from the second verification message, then rerun initialization.

### Telegram disconnects while the TUI is open

The terminal session continues locally. The broker retries with bounded backoff and posts a recovery notice after reconnecting. Use `/status` to check Telegram health. Do not start another bot poller against the same token.

### The saved project topic was deleted

Run `mastracode-remote --init` again. Setup creates a replacement topic and updates the saved mapping without changing other project topics.

### Another TUI owns the project

Only one Telegram-enabled TUI may own a canonical project path. Close the older TUI or wait for its crashed-process lock to be reclaimed, then start `mastracode-remote` again.

Diagnostic logs are stored under `~/.mastracode-telegram/logs/`. They contain structured runtime metadata rather than message transcripts or secrets.

## Limitations

- Telegram input is text-only in this release.
- The terminal TUI must remain running.
- One configured Telegram user controls the bot.
- Each project can have one Telegram-enabled TUI owner at a time.
- Telegram cannot switch models, change threads, edit settings, run shell commands, or close the TUI.
- Existing 0.1.x settings are not migrated automatically.

## Uninstall and cleanup

Close every running `mastracode-remote` TUI, then uninstall the package:

```bash
npm uninstall --global mastracode-remote
```

The uninstall leaves runtime data and managed skills in place. After confirming that you no longer need the Telegram configuration, project mappings, logs, or skill backups, remove the isolated runtime directory:

```bash
rm -rf ~/.mastracode-telegram
```

Managed workflow skills remain under `~/.mastracode/skills/`. Review `~/.mastracode-telegram/state/managed-skills.json` and its backup directory before deleting individual managed skills. Do not remove the entire MastraCode skills directory.

The legacy `~/.mastracode-remote/` directory and launchd service belong to 0.1.x and are not removed by the current package. Keep or remove them separately after following the migration steps above.

## Build and run locally

From the repository root:

```bash
pnpm install
pnpm build:mastracode
```

Initialize a project with the built CLI:

```bash
cd /path/to/project
node /path/to/mastra/mastracode/dist/telegram-cli.js --init
```

Start the TUI with Telegram connected:

```bash
node /path/to/mastra/mastracode/dist/telegram-cli.js
```

## Development checks

Run commands from the repository root. Use a focused test while changing one area:

```bash
pnpm --filter ./mastracode exec vitest run src/telegram --reporter=dot --bail 1
```

Run the same validation required by the fork's pull request workflow:

```bash
pnpm check:mastracode
```

The complete check runs formatting, linting, strict type checking, unit tests with coverage, the MastraCode build, the shared Telegram TUI scenarios, and the isolated publication-package smoke test. The individual commands are:

```bash
pnpm format:check:mastracode
pnpm lint:mastracode
pnpm typecheck:mastracode
pnpm --filter ./mastracode verify:release-configuration
pnpm test:coverage:mastracode
pnpm build:mastracode
pnpm test:integration:mastracode
pnpm --filter ./mastracode verify:publication-package
```

Coverage reports are written to `mastracode/coverage/`. Pull request CI stores the report as an artifact and enforces the checked-in baseline floors in `vitest.config.ts`.

## Releases

The `Release MastraCode Remote` GitHub workflow publishes from `main` after package validation. It builds one archive, records its SHA-256 digest and size, then publishes that archive through npm trusted publishing with provenance. The workflow does not use a stored npm token.

The npm trusted publisher must be restricted to the `SrdjanCoric/mastra` repository, the `mastracode-remote-release.yml` workflow, and the `npm-release` environment. The environment should require approval before publication.

## Mastra Code

MastraCode Remote is built from [Mastra Code](https://code.mastra.ai/) in the [Mastra repository](https://github.com/mastra-ai/mastra). It keeps a separate package name, executable, and Telegram runtime directory. This distribution does not show the upstream MastraCode update prompt.
