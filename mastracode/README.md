# MastraCode Remote

MastraCode Remote is MastraCode with Telegram. Run the normal terminal TUI and continue the same session from a private Telegram topic.

The npm package and executable are both named `mastracode-remote`.

## What it does

- Runs the standard MastraCode TUI in your terminal.
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

## Managed skills

The npm archive contains the managed workflow skills under `assets/skills`. `mastracode-remote --init` copies them into `~/.mastracode/skills/` and backs up local changes before replacing a managed skill. The package does not use a `postinstall` script.

This distribution discovers skills only from:

```text
<project>/.mastracode/skills
~/.mastracode/skills
```

It does not load `.claude/skills` or `.agents/skills`.

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

Run focused tests while changing Telegram behavior:

```bash
pnpm --filter ./mastracode exec vitest run src/telegram --reporter=dot --bail 1
```

Run package checks before opening a pull request:

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

## Mastra Code

MastraCode Remote is built from [Mastra Code](https://code.mastra.ai/) in the [Mastra repository](https://github.com/mastra-ai/mastra). It keeps a separate package name, executable, and Telegram runtime directory. This distribution does not show the upstream MastraCode update prompt.
