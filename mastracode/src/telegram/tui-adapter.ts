import type { TUIMessageBridge } from '../tui/state.js';
import type { TelegramBrokerClient } from './broker-client.js';
import { acquireTelegramProjectLock } from './broker-lock.js';
import type { TelegramProjectLock } from './broker-lock.js';
import { connectToTelegramBroker } from './broker-process.js';
import { resolveTelegramProjectLockPath } from './runtime-paths.js';

export function createTelegramTuiBridge(env: NodeJS.ProcessEnv = process.env): TUIMessageBridge {
  const homeDir = requireEnv(env, 'MASTRACODE_TELEGRAM_HOME');
  const projectPath = requireEnv(env, 'MASTRACODE_TELEGRAM_PROJECT_PATH');
  const threadId = parsePositiveInteger(
    requireEnv(env, 'MASTRACODE_TELEGRAM_THREAD_ID'),
    'MASTRACODE_TELEGRAM_THREAD_ID',
  );
  let client: TelegramBrokerClient | undefined;
  let projectLock: TelegramProjectLock | undefined;
  let deliveryChain = Promise.resolve();

  return {
    async start(onMessage) {
      projectLock = await acquireTelegramProjectLock(resolveTelegramProjectLockPath(homeDir, projectPath));
      if (!projectLock) {
        throw new Error(`Another MastraCode Telegram session is already using this project: ${projectPath}`);
      }
      try {
        client = await connectToTelegramBroker({
          homeDir,
          registration: { projectPath, threadId },
          executablePath: env.MASTRACODE_TELEGRAM_EXECUTABLE,
          onMessage: message => {
            const delivery = deliveryChain.then(() => onMessage(message));
            deliveryChain = delivery.catch(() => {});
            return delivery;
          },
          onReconnect: () => {
            const delivery = deliveryChain.then(() => onMessage({ text: '/status' }));
            deliveryChain = delivery.catch(() => {});
            return delivery;
          },
        });
      } catch (error) {
        projectLock.release();
        projectLock = undefined;
        throw error;
      }
    },
    async sendMessage(text) {
      if (!client) throw new Error('Telegram broker is not connected.');
      await client.sendMessage(text);
    },
    async sendPrompt(prompt) {
      if (!client) throw new Error('Telegram broker is not connected.');
      return client.sendPrompt(prompt);
    },
    health() {
      return client ? 'connected' : 'disconnected';
    },
    stop() {
      client?.close();
      client = undefined;
      projectLock?.release();
      projectLock = undefined;
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
