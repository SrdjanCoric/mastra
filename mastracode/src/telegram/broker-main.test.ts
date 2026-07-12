import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { acquireTelegramBrokerLock } from './broker-lock.js';
import { runBrokerUntilStopped } from './broker-main.js';

const cleanupPaths: string[] = [];
afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map(target => fs.rm(target, { recursive: true, force: true })));
});

async function createLockPath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-lock-'));
  cleanupPaths.push(directory);
  return path.join(directory, 'broker.lock');
}

describe('Telegram broker lifecycle', () => {
  it('closes client sockets when polling fails so TUIs can reconnect to a replacement broker', async () => {
    const close = vi.fn(async () => {});
    const failure = new Error('state write failed');

    await expect(
      runBrokerUntilStopped({ done: new Promise(() => {}), close }, { done: Promise.reject(failure), stop: vi.fn() }),
    ).rejects.toThrow('state write failed');
    expect(close).toHaveBeenCalledOnce();
  });

  it('stops polling after the last client closes the broker server', async () => {
    const stop = vi.fn();

    await runBrokerUntilStopped(
      { done: Promise.resolve(), close: vi.fn(async () => {}) },
      { done: Promise.resolve(), stop },
    );

    expect(stop).toHaveBeenCalledOnce();
  });
});

describe('Telegram broker ownership lock', () => {
  it('does not replace a lock owned by a running broker process', async () => {
    const lockPath = await createLockPath();
    await fs.writeFile(lockPath, `${process.pid}\n`, { mode: 0o600 });

    await expect(acquireTelegramBrokerLock(lockPath)).resolves.toBeUndefined();
    await expect(fs.readFile(lockPath, 'utf8')).resolves.toBe(`${process.pid}\n`);
  });

  it('reclaims a stale broker lock', async () => {
    const lockPath = await createLockPath();
    await fs.writeFile(lockPath, '999999999\n', { mode: 0o600 });

    const lock = await acquireTelegramBrokerLock(lockPath);

    expect(lock).toBeDefined();
    await lock?.close();
  });
});
