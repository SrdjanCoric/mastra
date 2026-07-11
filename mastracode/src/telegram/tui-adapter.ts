import type { TUIMessageBridge } from '../tui/state.js';
import type { TelegramBrokerClient } from './broker-client.js';
import { connectToTelegramBroker } from './broker-process.js';

export function createTelegramTuiBridge(env: NodeJS.ProcessEnv = process.env): TUIMessageBridge {
  const homeDir = requireEnv(env, 'MASTRACODE_TELEGRAM_HOME');
  const projectPath = requireEnv(env, 'MASTRACODE_TELEGRAM_PROJECT_PATH');
  const threadId = parsePositiveInteger(
    requireEnv(env, 'MASTRACODE_TELEGRAM_THREAD_ID'),
    'MASTRACODE_TELEGRAM_THREAD_ID',
  );
  let client: TelegramBrokerClient | undefined;
  let deliveryChain = Promise.resolve();

  return {
    async start(onMessage) {
      client = await connectToTelegramBroker({
        homeDir,
        registration: { projectPath, threadId },
        executablePath: env.MASTRACODE_TELEGRAM_EXECUTABLE,
        onMessage: text => {
          deliveryChain = deliveryChain.then(() => onMessage(text)).catch(() => {});
        },
      });
    },
    async sendMessage(text) {
      if (!client) throw new Error('Telegram broker is not connected.');
      await client.sendMessage(text);
    },
    stop() {
      client?.close();
      client = undefined;
    },
  };
}

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
