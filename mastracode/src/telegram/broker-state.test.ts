import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { FileTelegramBrokerStateStore } from './broker-state.js';

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map(target => fs.rm(target, { recursive: true, force: true })));
});

async function createStatePath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-state-'));
  cleanupPaths.push(directory);
  return path.join(directory, 'broker.json');
}

describe('FileTelegramBrokerStateStore', () => {
  it('loads empty state when no broker state exists', async () => {
    const statePath = await createStatePath();

    await expect(new FileTelegramBrokerStateStore(statePath).load()).resolves.toEqual({
      processedUpdateIds: [],
      unprocessedByThread: {},
    });
  });

  it('writes state atomically with user-only permissions', async () => {
    const statePath = await createStatePath();
    const store = new FileTelegramBrokerStateStore(statePath);

    await store.save({ nextOffset: 19, processedUpdateIds: [17, 18], unprocessedByThread: { '101': 2 } });

    await expect(store.load()).resolves.toEqual({
      nextOffset: 19,
      processedUpdateIds: [17, 18],
      unprocessedByThread: { '101': 2 },
    });
    expect((await fs.stat(statePath)).mode & 0o777).toBe(0o600);
    await expect(fs.readdir(path.dirname(statePath))).resolves.toEqual(['broker.json']);
  });

  it('refuses corrupted state instead of replaying old Telegram updates', async () => {
    const statePath = await createStatePath();
    await fs.writeFile(statePath, '{broken', { mode: 0o600 });

    await expect(new FileTelegramBrokerStateStore(statePath).load()).rejects.toThrow(
      'Telegram broker state is corrupted',
    );
  });
});
