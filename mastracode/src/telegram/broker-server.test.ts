import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectTelegramBrokerClient, verifyTelegramRoundTripThroughBroker } from './broker-client.js';
import { startTelegramBrokerServer } from './broker-server.js';
import { TelegramBroker } from './broker.js';

const cleanupPaths: string[] = [];
afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map(target => fs.rm(target, { recursive: true, force: true })));
});

async function createSocketPath(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-broker-'));
  cleanupPaths.push(directory);
  return path.join(directory, 'broker.sock');
}

async function waitFor(check: () => boolean): Promise<void> {
  for (let index = 0; index < 50; index += 1) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('Timed out waiting for broker event');
}

describe('Telegram broker socket', () => {
  it('uses the active broker poller for setup verification', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn<(threadId: number, text: string) => Promise<void>>(async () => {}),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker, shutdownGraceMs: 5 });

    const verification = verifyTelegramRoundTripThroughBroker({ socketPath, threadId: 101 });
    await waitFor(() => telegram.sendMessage.mock.calls.length === 1);
    const marker = String(telegram.sendMessage.mock.calls[0]?.[1]).split('exactly: ')[1];
    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 101, text: marker });

    await expect(verification).resolves.toBeUndefined();
    await server.done;
  });

  it('shares one broker across project clients and exits after the last disconnect', async () => {
    const socketPath = await createSocketPath();
    const telegram = { getTextUpdates: vi.fn(async () => []), sendMessage: vi.fn(async () => {}) };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker, shutdownGraceMs: 15 });
    const oneMessages: string[] = [];
    const twoMessages: string[] = [];
    const one = await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/one', threadId: 101 },
      onMessage: text => oneMessages.push(text),
    });
    const two = await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/two', threadId: 202 },
      onMessage: text => twoMessages.push(text),
    });

    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 202, text: 'hello two' });
    await waitFor(() => twoMessages.length === 1);
    expect(oneMessages).toEqual([]);
    expect(twoMessages).toEqual(['hello two']);

    await one.sendMessage('one reply');
    expect(telegram.sendMessage).toHaveBeenCalledWith(101, 'one reply');

    one.close();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(server.isClosed()).toBe(false);

    two.close();
    await server.done;
    expect(server.isClosed()).toBe(true);
  });
});
