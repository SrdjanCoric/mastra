import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

import { cancel, confirm, isCancel, select } from '@clack/prompts';

import { resolveTelegramRuntimePaths } from './runtime-paths.js';

export interface TelegramInitChoice {
  value: string;
  label: string;
  hint?: string;
}

export interface TelegramInitPrompter {
  ask(question: string): Promise<string>;
  askHidden?(question: string): Promise<string>;
  confirm?(question: string, initialValue?: boolean): Promise<boolean>;
  choose?(question: string, choices: readonly TelegramInitChoice[], initialValue?: string): Promise<string>;
}

export interface GuidedTelegramInitResult {
  confirmed: boolean;
  env: NodeJS.ProcessEnv;
}

export async function confirmInitChoice(
  prompter: TelegramInitPrompter,
  question: string,
  initialValue = true,
): Promise<boolean> {
  if (prompter.confirm) return prompter.confirm(question, initialValue);
  const answer = (await prompter.ask(`${question} ${initialValue ? '[Y/n]' : '[y/N]'}: `)).trim();
  if (!answer) return initialValue;
  return /^[Yy]/.test(answer);
}

export async function chooseInitChoice(
  prompter: TelegramInitPrompter,
  question: string,
  choices: readonly TelegramInitChoice[],
  initialValue?: string,
): Promise<string> {
  if (prompter.choose) return prompter.choose(question, choices, initialValue);
  const answer = (await prompter.ask(`${question}${initialValue ? ` [${initialValue}]` : ''}: `)).trim().toLowerCase();
  const selected = answer || initialValue;
  if (selected && choices.some(choice => choice.value === selected)) return selected;
  throw new Error(`${question} must be one of: ${choices.map(choice => choice.value).join(', ')}.`);
}

export async function prepareGuidedTelegramInit(options: {
  homeDir: string;
  projectPath: string;
  env: NodeJS.ProcessEnv;
  prompter?: TelegramInitPrompter;
  write: (message: string) => void;
}): Promise<GuidedTelegramInitResult> {
  options.write(`Project: ${options.projectPath}`);
  if (options.prompter && !(await confirmInitChoice(options.prompter, 'Use this project directory?'))) {
    return { confirmed: false, env: options.env };
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
    async confirm(question: string, initialValue = true): Promise<boolean> {
      return requirePromptResult(
        await confirm({
          message: question,
          initialValue,
        }),
      );
    },
    async choose(question: string, choices: readonly TelegramInitChoice[], initialValue?: string): Promise<string> {
      return requirePromptResult(
        await select({
          message: question,
          options: choices.map(choice => ({
            value: choice.value,
            label: choice.label,
            ...(choice.hint ? { hint: choice.hint } : {}),
          })),
          ...(initialValue ? { initialValue } : {}),
        }),
      );
    },
  };
}

function requirePromptResult<T>(result: T | symbol): T {
  if (!isCancel(result)) return result as T;
  cancel('Setup cancelled.');
  throw new Error('Telegram setup was cancelled.');
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
