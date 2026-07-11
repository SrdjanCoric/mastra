import fs from 'node:fs/promises';
import { acquireTelegramBrokerLock } from './broker-lock.js';
import { startTelegramBrokerServer } from './broker-server.js';
import { TelegramBroker } from './broker.js';
import { resolveTelegramBrokerPaths, resolveTelegramRuntimePaths } from './runtime-paths.js';
import { loadTelegramRuntimeConfig } from './setup.js';
import { TelegramBotClient } from './telegram-client.js';

export async function runTelegramBroker(homeDir: string): Promise<void> {
  const runtimePaths = resolveTelegramRuntimePaths(homeDir);
  const config = await loadTelegramRuntimeConfig({}, runtimePaths.configDir);
  const brokerPaths = resolveTelegramBrokerPaths(homeDir, config.botToken);
  await fs.mkdir(runtimePaths.runtimeDir, { recursive: true, mode: 0o700 });

  const lock = await acquireTelegramBrokerLock(brokerPaths.lockPath);
  if (!lock) return;

  try {
    const broker = new TelegramBroker({
      allowedUserId: config.allowedUserId,
      telegram: new TelegramBotClient(config),
    });
    const server = await startTelegramBrokerServer({
      socketPath: brokerPaths.socketPath,
      broker,
    });
    const polling = broker.startPolling();
    await server.done;
    polling.stop();
    await polling.done;
  } finally {
    await lock.close();
    await fs.rm(brokerPaths.lockPath, { force: true });
  }
}
