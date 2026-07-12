import fs from 'node:fs/promises';
import net from 'node:net';
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
  it('rejects malformed IPC without crashing the broker', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker, shutdownGraceMs: 5 });
    const response = await new Promise<string>((resolve, reject) => {
      const socket = net.createConnection(socketPath, () => socket.write('{not json}\n'));
      socket.once('data', chunk => resolve(chunk.toString('utf8')));
      socket.once('error', reject);
    });

    expect(response).toContain('Invalid Telegram broker message.');
    await server.done;
  });

  it('uses the active broker poller for setup verification', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn<(threadId: number, text: string) => Promise<void>>(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker, shutdownGraceMs: 5 });

    const verification = verifyTelegramRoundTripThroughBroker({ socketPath, threadId: 101 });
    await waitFor(() => telegram.sendMessage.mock.calls.length === 2);
    const marker = String(telegram.sendMessage.mock.calls[1]?.[1]);
    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 101, text: marker });

    await expect(verification).resolves.toBeUndefined();
    await server.done;
  });

  it('does not mark an instruction delivered until the TUI handler acknowledges it', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker });
    let finishDelivery: (() => void) | undefined;
    const onMessage = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finishDelivery = resolve;
        }),
    );
    const client = await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/one', threadId: 101 },
      onMessage,
    });
    let delivered = false;

    const processing = broker
      .processUpdate({ updateId: 1, userId: 42, threadId: 101, text: 'wait for TUI' })
      .then(() => {
        delivered = true;
      });
    await waitFor(() => onMessage.mock.calls.length === 1);
    expect(delivered).toBe(false);
    finishDelivery?.();
    await processing;

    expect(delivered).toBe(true);
    client.close();
    await server.done;
  });

  it('disconnects active clients when the broker shuts down unexpectedly', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker });
    const onDisconnect = vi.fn();
    await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/one', threadId: 101 },
      onMessage: vi.fn(),
      onDisconnect,
    });

    await server.close();
    await waitFor(() => onDisconnect.mock.calls.length === 1);

    expect(server.isClosed()).toBe(true);
    expect(broker.clientCount).toBe(0);
  });

  it('shares one broker across project clients and exits after the last disconnect', async () => {
    const socketPath = await createSocketPath();
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram });
    const server = await startTelegramBrokerServer({ socketPath, broker, shutdownGraceMs: 15 });
    const oneMessages: string[] = [];
    const twoMessages: string[] = [];
    const one = await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/one', threadId: 101 },
      onMessage: message => oneMessages.push(message.text),
    });
    const two = await connectTelegramBrokerClient({
      socketPath,
      registration: { projectPath: '/projects/two', threadId: 202 },
      onMessage: message => twoMessages.push(message.text),
    });

    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 202, text: 'hello two' });
    await waitFor(() => twoMessages.length === 1);
    expect(oneMessages).toEqual([]);
    expect(twoMessages).toEqual(['hello two']);

    await one.sendMessage('one reply');
    expect(telegram.sendMessage).toHaveBeenCalledWith(101, 'one reply');

    await expect(
      two.sendPrompt({ promptId: 'ABC123', kind: 'question', title: 'Question', summary: 'Which branch?' }),
    ).resolves.toEqual({ messageId: 1 });
    expect(telegram.sendPrompt).toHaveBeenCalledWith(202, {
      promptId: 'ABC123',
      kind: 'question',
      title: 'Question',
      summary: 'Which branch?',
    });

    one.close();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(server.isClosed()).toBe(false);

    two.close();
    await server.done;
    expect(server.isClosed()).toBe(true);
  });
});
