import { describe, expect, it, vi } from 'vitest';
import { TelegramBroker } from './broker.js';
import type { TelegramTextUpdate } from './broker.js';

function createBroker() {
  const telegram = {
    getTextUpdates: vi.fn<(offset: number | undefined, signal?: AbortSignal) => Promise<TelegramTextUpdate[]>>(
      async () => [],
    ),
    sendMessage: vi.fn<(threadId: number, text: string) => Promise<void>>(async () => {}),
    sendPrompt: vi.fn(async () => ({ messageId: 55 })),
  };
  return { broker: new TelegramBroker({ allowedUserId: 42, telegram }), telegram };
}

describe('TelegramBroker', () => {
  it('routes each topic only to its registered project client', async () => {
    const { broker } = createBroker();
    const projectOne = vi.fn();
    const projectTwo = vi.fn();

    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, projectOne);
    broker.register('two', { projectPath: '/projects/two', threadId: 202 }, projectTwo);

    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 202, text: 'from two' });

    expect(projectOne).not.toHaveBeenCalled();
    expect(projectTwo).toHaveBeenCalledWith({ type: 'message', text: 'from two' });
  });

  it('ignores text from users outside the configured authorization boundary', async () => {
    const { broker } = createBroker();
    const deliver = vi.fn();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    await broker.processUpdate({ updateId: 1, userId: 7, threadId: 101, text: 'no' });

    expect(deliver).not.toHaveBeenCalled();
  });

  it('polls Telegram updates and advances the update offset', async () => {
    const { broker, telegram } = createBroker();
    const deliver = vi.fn();
    telegram.getTextUpdates
      .mockResolvedValueOnce([{ updateId: 8, userId: 42, threadId: 101, text: 'queued' }])
      .mockImplementationOnce(
        (_offset, signal) =>
          new Promise((_, reject) => {
            signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          }),
      );
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    const polling = broker.startPolling({ intervalMs: 0 });
    await vi.waitFor(() => expect(deliver).toHaveBeenCalledWith({ type: 'message', text: 'queued' }));
    polling.stop();
    await polling.done;

    expect(telegram.getTextUpdates).toHaveBeenNthCalledWith(1, undefined, expect.any(AbortSignal));
    expect(telegram.getTextUpdates).toHaveBeenNthCalledWith(2, 9, expect.any(AbortSignal));
  });

  it('runs connectivity verification through the active poller without delivering the marker', async () => {
    const { broker, telegram } = createBroker();
    const deliver = vi.fn();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    const verification = broker.verifyRoundTrip(101, 1000);
    await vi.waitFor(() => expect(telegram.sendMessage).toHaveBeenCalledOnce());
    const marker = String(telegram.sendMessage.mock.calls[0]?.[1]).split('exactly: ')[1];
    await broker.processUpdate({ updateId: 1, userId: 42, threadId: 101, text: marker });
    await verification;

    expect(deliver).not.toHaveBeenCalled();
  });

  it('sends project output only to the registered topic', async () => {
    const { broker, telegram } = createBroker();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, vi.fn());

    await broker.sendProjectMessage('one', 'done');

    expect(telegram.sendMessage).toHaveBeenCalledWith(101, 'done');
  });

  it('rejects duplicate project and topic ownership', () => {
    const { broker } = createBroker();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, vi.fn());

    expect(() => broker.register('two', { projectPath: '/projects/one', threadId: 202 }, vi.fn())).toThrow(
      'already connected',
    );
    expect(() => broker.register('three', { projectPath: '/projects/three', threadId: 101 }, vi.fn())).toThrow(
      'already registered',
    );
  });
});
