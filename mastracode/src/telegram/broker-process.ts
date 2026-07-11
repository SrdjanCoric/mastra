import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { connectTelegramBrokerClient } from './broker-client.js';
import type { TelegramBrokerClient, TelegramBrokerIncomingMessage } from './broker-client.js';
import type { TelegramProjectRegistration } from './broker.js';
import { resolveTelegramBrokerPaths, resolveTelegramRuntimePaths } from './runtime-paths.js';
import { loadTelegramRuntimeConfig } from './setup.js';

export async function connectToTelegramBroker(options: {
  homeDir: string;
  registration: TelegramProjectRegistration;
  onMessage(message: TelegramBrokerIncomingMessage): void;
  onError?(error: Error): void;
  executablePath?: string;
}): Promise<TelegramBrokerClient> {
  const runtimePaths = resolveTelegramRuntimePaths(options.homeDir);
  const config = await loadTelegramRuntimeConfig({}, runtimePaths.configDir);
  const { socketPath } = resolveTelegramBrokerPaths(options.homeDir, config.botToken);

  try {
    return await connectTelegramBrokerClient({
      socketPath,
      registration: options.registration,
      onMessage: options.onMessage,
      onError: options.onError,
    });
  } catch (error) {
    if (!isMissingBrokerError(error)) throw error;
  }

  await fs.mkdir(runtimePaths.runtimeDir, { recursive: true, mode: 0o700 });
  const executablePath = options.executablePath ?? process.env.MASTRACODE_TELEGRAM_EXECUTABLE ?? process.argv[1];
  if (!executablePath) throw new Error('Cannot locate the mastracode-telegram executable for broker startup.');
  const child = spawn(process.execPath, [executablePath, '--broker', '--home-dir', options.homeDir], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 25));
    try {
      return await connectTelegramBrokerClient({
        socketPath,
        registration: options.registration,
        onMessage: options.onMessage,
        onError: options.onError,
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!isMissingBrokerError(error)) throw error;
    }
  }
  throw new Error(`Telegram broker did not start: ${lastError?.message ?? 'socket unavailable'}`);
}

function isMissingBrokerError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && ['ENOENT', 'ECONNREFUSED'].includes(String(error.code));
}
