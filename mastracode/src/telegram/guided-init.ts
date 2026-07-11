import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';

export interface TelegramInitPrompter {
  ask(question: string): Promise<string>;
  askHidden?(question: string): Promise<string>;
}

export interface GuidedTelegramInitResult {
  confirmed: boolean;
  env: NodeJS.ProcessEnv;
}

export async function prepareGuidedTelegramInit(options: {
  homeDir: string;
  projectPath: string;
  env: NodeJS.ProcessEnv;
  prompter?: TelegramInitPrompter;
  write: (message: string) => void;
}): Promise<GuidedTelegramInitResult> {
  options.write(`Project: ${options.projectPath}`);
  if (options.prompter) {
    const answer = await options.prompter.ask('Use this project directory? [Y/n]: ');
    if (answer !== '' && !/^[Yy]/.test(answer)) return { confirmed: false, env: options.env };
  }

  const saved = await loadSavedConfigPresence(options.homeDir);
  const effective = {
    botToken: nonEmpty(options.env.TELEGRAM_BOT_TOKEN) || saved.botToken,
    allowedUserId: nonEmpty(options.env.TELEGRAM_ALLOWED_USER_ID) || saved.allowedUserId,
    groupId: nonEmpty(options.env.TELEGRAM_GROUP_ID) || saved.groupId,
  };
  if (effective.botToken && effective.allowedUserId && effective.groupId) {
    if (saved.complete && !hasCompleteEnvironment(options.env)) {
      options.write('Telegram: reusing saved configuration.');
    }
    return { confirmed: true, env: options.env };
  }

  if (!options.prompter) return { confirmed: true, env: options.env };

  options.write('Guided Telegram setup: enter the missing values below.');
  options.write('The bot token is hidden and will be stored locally with owner-only permissions.');
  options.write('Use a private Telegram supergroup with Topics enabled. Press Ctrl+C to cancel.');

  const env = { ...options.env };
  if (!effective.botToken) {
    env.TELEGRAM_BOT_TOKEN = options.prompter.askHidden
      ? await options.prompter.askHidden('Telegram bot token: ')
      : await options.prompter.ask('Telegram bot token: ');
  }
  if (!effective.allowedUserId) {
    env.TELEGRAM_ALLOWED_USER_ID = await options.prompter.ask('Allowed Telegram user ID: ');
  }
  if (!effective.groupId) {
    env.TELEGRAM_GROUP_ID = await options.prompter.ask('Private Telegram group ID: ');
  }
  return { confirmed: true, env };
}

export function createTerminalInitPrompter(): TelegramInitPrompter | undefined {
  if (!stdin.isTTY || !stdout.isTTY) return undefined;

  const ask = async (question: string): Promise<string> => {
    const readline = createInterface({ input: stdin, output: stdout });
    try {
      return (await readline.question(question)).trim();
    } finally {
      readline.close();
    }
  };

  return {
    ask,
    async askHidden(question: string): Promise<string> {
      const readline = createInterface({ input: stdin, output: stdout });
      const muted = readline as typeof readline & { _writeToOutput?: (value: string) => void };
      const originalWrite = muted._writeToOutput;
      muted._writeToOutput = (value: string) => {
        if (value === question) originalWrite?.call(muted, value);
      };
      try {
        const answer = (await readline.question(question)).trim();
        stdout.write('\n');
        return answer;
      } finally {
        if (originalWrite) muted._writeToOutput = originalWrite;
        else delete muted._writeToOutput;
        readline.close();
      }
    },
  };
}

async function loadSavedConfigPresence(homeDir: string): Promise<{
  botToken?: string;
  allowedUserId?: string;
  groupId?: string;
  complete: boolean;
}> {
  const configDir = resolveTelegramRuntimePaths(homeDir).configDir;
  try {
    const [settingsRaw, secretsRaw] = await Promise.all([
      fs.readFile(path.join(configDir, 'settings.json'), 'utf8'),
      fs.readFile(path.join(configDir, 'secrets.json'), 'utf8'),
    ]);
    const settings = JSON.parse(settingsRaw) as { allowedUserId?: number; groupId?: number };
    const secrets = JSON.parse(secretsRaw) as { botToken?: string };
    const result = {
      botToken: nonEmpty(secrets.botToken),
      allowedUserId: settings.allowedUserId?.toString(),
      groupId: settings.groupId?.toString(),
    };
    return { ...result, complete: Boolean(result.botToken && result.allowedUserId && result.groupId) };
  } catch {
    return { complete: false };
  }
}

function hasCompleteEnvironment(env: NodeJS.ProcessEnv): boolean {
  return Boolean(
    nonEmpty(env.TELEGRAM_BOT_TOKEN) && nonEmpty(env.TELEGRAM_ALLOWED_USER_ID) && nonEmpty(env.TELEGRAM_GROUP_ID),
  );
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
