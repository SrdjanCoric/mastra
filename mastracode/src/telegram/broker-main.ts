import fs from 'node:fs/promises';

import { createTelegramDiagnosticLogger } from './broker-diagnostics.js';
import { acquireTelegramBrokerLock } from './broker-lock.js';
import { startTelegramBrokerServer } from './broker-server.js';
import { FileTelegramBrokerStateStore } from './broker-state.js';
import { TelegramBroker } from './broker.js';
import { resolveTelegramBrokerPaths, resolveTelegramRuntimePaths } from './runtime-paths.js';
import { loadTelegramRuntimeConfig } from './setup.js';
import { TelegramBotClient } from './telegram-client.js';

interface BrokerServerHandle {
  done: Promise<void>;
  close(): Promise<void>;
}

interface BrokerPollingHandle {
  done: Promise<void>;
  stop(): void;
}

export async function runBrokerUntilStopped(server: BrokerServerHandle, polling: BrokerPollingHandle): Promise<void> {
  const outcome = await Promise.race([
    server.done.then(() => ({ source: 'server' as const })),
    polling.done.then(
      () => ({ source: 'polling' as const }),
      error => ({ source: 'polling' as const, error }),
    ),
  ]);
  if (outcome.source === 'server') {
    polling.stop();
    await polling.done;
    return;
  }

  await server.close();
  if ('error' in outcome) throw outcome.error;
  throw new Error('Telegram broker polling stopped unexpectedly.');
}

export async function runTelegramBroker(homeDir: string): Promise<void> {
  const runtimePaths = resolveTelegramRuntimePaths(homeDir);
  const config = await loadTelegramRuntimeConfig({}, runtimePaths.configDir);
  const brokerPaths = resolveTelegramBrokerPaths(homeDir, config.botToken);
  await fs.mkdir(runtimePaths.runtimeDir, { recursive: true, mode: 0o700 });

  const lock = await acquireTelegramBrokerLock(brokerPaths.lockPath);
  if (!lock) return;

  const diagnostics = createTelegramDiagnosticLogger(brokerPaths.logPath);
  let broker: TelegramBroker | undefined;
  try {
    broker = new TelegramBroker({
      allowedUserId: config.allowedUserId,
      telegram: new TelegramBotClient(config),
      stateStore: new FileTelegramBrokerStateStore(brokerPaths.statePath),
      onDiagnostic: diagnostic => diagnostics.write(diagnostic),
    });
    await broker.initialize();
    const server = await startTelegramBrokerServer({
      socketPath: brokerPaths.socketPath,
      broker,
    });
    const polling = broker.startPolling();
    await runBrokerUntilStopped(server, polling);
  } finally {
    broker?.shutdown();
    await diagnostics.flush();
    await lock.close();
    await fs.rm(brokerPaths.lockPath, { force: true });
  }
}
