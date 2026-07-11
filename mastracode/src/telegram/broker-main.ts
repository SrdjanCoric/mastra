import fs from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
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
    await lock.writeFile(`${process.pid}\n`, 'utf8');
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

export async function acquireTelegramBrokerLock(lockPath: string): Promise<FileHandle | undefined> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fs.open(lockPath, 'wx', 0o600);
    } catch (error) {
      if (!hasErrorCode(error, 'EEXIST')) throw error;
      let ownerPid = await readLockPid(lockPath);
      if (ownerPid === undefined) {
        await new Promise(resolve => setTimeout(resolve, 50));
        ownerPid = await readLockPid(lockPath);
      }
      if (ownerPid !== undefined && isProcessRunning(ownerPid)) return undefined;
      await fs.rm(lockPath, { force: true });
    }
  }
  return undefined;
}

async function readLockPid(lockPath: string): Promise<number | undefined> {
  try {
    const pid = Number((await fs.readFile(lockPath, 'utf8')).trim());
    return Number.isInteger(pid) && pid > 0 ? pid : undefined;
  } catch {
    return undefined;
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !hasErrorCode(error, 'ESRCH');
  }
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
