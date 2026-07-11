# MastraCode Telegram

MastraCode Telegram adds a Telegram interface to the MastraCode terminal application. It keeps the terminal UI as the primary interface while letting you continue the same coding session from a private Telegram topic.

The published package name is `@srdjancoric/mastracode-telegram`. Its executable is `mastracode-telegram`.

## What it does

- Runs the standard MastraCode TUI in your terminal.
- Connects one private Telegram forum topic to the current project.
- Sends completed assistant responses and interactive prompts to Telegram.
- Routes Telegram messages into the same MastraCode session and native follow-up queue.
- Lets questions and approvals be answered from either Telegram or the terminal.
- Keeps model selection, thread management, and settings in the terminal.
- Stores Telegram configuration and runtime state separately under `~/.mastracode-telegram`.

Each project is identified by its canonical absolute path and receives one persistent Telegram topic. The TUI owns the MastraCode session. A local broker owns Telegram polling so multiple project sessions can share one bot safely.

## Status

This package is under active development. The current build supports project initialization, shared Telegram and TUI conversations, project-topic routing, session commands, questions, and approvals.

The TUI must remain open for Telegram control to work. Recovery and publication-gate work is still in progress, so treat the package as an experiment rather than a production service.

## Requirements

- Node.js 22 or newer
- Git
- [GitHub CLI](https://cli.github.com/) authenticated with `gh auth login`
- A configured MastraCode model provider
- A private Telegram supergroup with Topics enabled
- A Telegram bot that can access the group and manage topics

## Install

After the package is published:

```bash
npm install --global @srdjancoric/mastracode-telegram
```

The command installed by the package is:

```bash
mastracode-telegram
```

## Build and run locally

From the repository root:

```bash
pnpm install
pnpm build:mastracode
```

Initialize a project using the built CLI:

```bash
cd /path/to/project
node /path/to/mastra/mastracode/dist/telegram-cli.js --init
```

Start the TUI with Telegram connected:

```bash
node /path/to/mastra/mastracode/dist/telegram-cli.js
```

Run the built CLI from the project directory you want MastraCode to control.

## Initialize a project

Run:

```bash
mastracode-telegram --init
```

The guided setup:

1. Confirms the selected project directory.
2. Offers to initialize Git if the directory is not a repository.
3. Configures missing Git author details for the repository.
4. Offers to create a GitHub repository and lets you select private or public visibility with the arrow keys.
5. Checks GitHub CLI installation and authentication.
6. Collects or reuses Telegram bot, user, and group configuration.
7. Creates or reuses the project’s Telegram forum topic.
8. Installs the managed MastraCode workflow skills.
9. Verifies the Telegram connection before writing the project readiness state.

The setup does not install launchd or create a persistent system daemon.

## Run the app

From an initialized project:

```bash
mastracode-telegram
```

Use the TUI normally. Messages sent in the project’s Telegram topic enter the same conversation. During an active run, the native follow-up queue holds the Telegram message for the current session.

Closing the TUI ends Telegram control for that project.

## Telegram commands

| Command   | Behavior                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/status` | Shows the project, active thread, model, mode, run state, queued follow-ups, and Telegram health without exposing transcripts or tool arguments. |
| `/stop`   | Stops the active turn or tool and clears queued Telegram follow-ups without closing the TUI.                                                     |
| `/help`   | Lists the supported Telegram commands and explains which controls remain terminal-only.                                                          |

Other slash commands, model selection, thread switching, and settings remain in the terminal.

## Questions and approvals

Questions sent to Telegram use Telegram’s reply binding. Tool approvals use Approve and Deny buttons. Prompt identities are tracked internally, so you do not need to type prompt IDs.

The first valid response from Telegram or the terminal resolves the prompt. Delayed or duplicate responses cannot resolve a different prompt.

## Runtime data

Telegram-specific data is isolated from normal MastraCode and `mastracode-remote` state:

```text
~/.mastracode-telegram/
├── config/
├── state/
├── runtime/
└── logs/
```

Bot secrets are stored separately with owner-only file permissions. Do not commit this directory or copy its secret files into a project.

## Managed skills

The package installs its workflow skills from the published `assets/skills` bundle into MastraCode skill directories. Skill discovery is restricted to:

```text
<project>/.mastracode/skills
~/.mastracode/skills
```

Claude and generic agent skill directories are not loaded by this distribution.

## Development checks

Run focused tests while changing Telegram behavior:

```bash
pnpm --filter ./mastracode exec vitest run src/telegram --reporter=dot --bail 1
```

Run the package checks before opening a pull request:

```bash
pnpm --filter ./mastracode check
pnpm --filter ./mastracode lint
pnpm build:mastracode
```

Run the checked-in shared-conversation scenario with:

```bash
MC_E2E_VITEST_SCENARIOS=telegram-shared-conversation \
  pnpm --filter ./mastracode exec vitest run \
  --config e2e/vitest.config.ts --reporter=dot
```

## Upstream

This package is based on [Mastra Code](https://code.mastra.ai/) from the [Mastra repository](https://github.com/mastra-ai/mastra). It uses a separate package name, executable, and runtime directory. The Telegram distribution does not show the upstream MastraCode update prompt.
