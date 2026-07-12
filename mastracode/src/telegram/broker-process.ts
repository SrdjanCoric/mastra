import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

import { connectTelegramBrokerClient } from './broker-client.js';
import type { TelegramBrokerClient, TelegramBrokerIncomingMessage } from './broker-client.js';
import type { TelegramProjectRegistration } from './broker.js';
import { ReconnectingTelegramBrokerClient } from './reconnecting-broker-client.js';
import { resolveTelegramBrokerPaths, resolveTelegramRuntimePaths } from './runtime-paths.js';
import { loadTelegramRuntimeConfig } from './setup.js';

export async function connectToTelegramBroker(options: {
  homeDir: string;
  registration: TelegramProjectRegistration;
  onMessage(message: TelegramBrokerIncomingMessage): Promise<void> | void;
  onError?(error: Error): void;
  onReconnect?(): Promise<void> | void;
  executablePath?: string;
}): Promise<TelegramBrokerClient> {
  const runtimePaths = resolveTelegramRuntimePaths(options.homeDir);
  const config = await loadTelegramRuntimeConfig({}, runtimePaths.configDir);
  const { socketPath } = resolveTelegramBrokerPaths(options.homeDir, config.botToken);
  const client = new ReconnectingTelegramBrokerClient({
    connect: onDisconnect =>
      connectOrStartBroker({
        ...options,
        socketPath,
        runtimeDir: runtimePaths.runtimeDir,
        onDisconnect,
      }),
    retryBaseMs: 100,
    retryMaxMs: 5_000,
    onReconnect: async connection => {
      await connection.sendMessage(
        'Telegram broker recovered and reconnected to the active terminal session. Current status follows.',
      );
      await options.onReconnect?.();
    },
  });
  await client.start();
  return client;
}

async function connectOrStartBroker(options: {
  homeDir: string;
  registration: TelegramProjectRegistration;
  onMessage(message: TelegramBrokerIncomingMessage): Promise<void> | void;
  onError?(error: Error): void;
  onDisconnect(): void;
  executablePath?: string;
  socketPath: string;
  runtimeDir: string;
}): Promise<TelegramBrokerClient> {
  try {
    return await connectTelegramBrokerClient({
      socketPath: options.socketPath,
      registration: options.registration,
      onMessage: options.onMessage,
      onError: options.onError,
      onDisconnect: options.onDisconnect,
    });
  } catch (error) {
    if (!isMissingBrokerError(error)) throw error;
  }

  await fs.mkdir(options.runtimeDir, { recursive: true, mode: 0o700 });
  const executablePath = options.executablePath ?? process.env.MASTRACODE_TELEGRAM_EXECUTABLE ?? process.argv[1];
  if (!executablePath) throw new Error('Cannot locate the mastracode-remote executable for broker startup.');
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
        socketPath: options.socketPath,
        registration: options.registration,
        onMessage: options.onMessage,
        onError: options.onError,
        onDisconnect: options.onDisconnect,
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
