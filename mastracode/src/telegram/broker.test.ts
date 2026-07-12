import { describe, expect, it, vi } from 'vitest';
import type { TelegramBrokerStateStore } from './broker-state.js';
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

    await vi.waitFor(() => expect(telegram.sendMessage).toHaveBeenCalledWith(101, 'done'));
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

  it('restores offsets and skips updates processed before a broker restart', async () => {
    let state = { nextOffset: 9, processedUpdateIds: [8], unprocessedByThread: {} };
    const stateStore: TelegramBrokerStateStore = {
      load: vi.fn(async () => structuredClone(state)),
      save: vi.fn(async next => {
        state = structuredClone(next);
      }),
    };
    const telegram = {
      getTextUpdates: vi
        .fn()
        .mockResolvedValueOnce([
          { updateId: 8, userId: 42, threadId: 101, text: 'duplicate' },
          { updateId: 9, userId: 42, threadId: 101, text: 'new' },
        ])
        .mockImplementationOnce(
          (_offset, signal: AbortSignal | undefined) =>
            new Promise((_, reject) =>
              signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
            ),
        ),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram, stateStore });
    const deliver = vi.fn();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    const polling = broker.startPolling({ intervalMs: 0 });
    await vi.waitFor(() => expect(deliver).toHaveBeenCalledWith({ type: 'message', text: 'new' }));
    polling.stop();
    await polling.done;

    expect(deliver).not.toHaveBeenCalledWith({ type: 'message', text: 'duplicate' });
    expect(telegram.getTextUpdates).toHaveBeenNthCalledWith(1, 9, expect.any(AbortSignal));
    expect(state).toEqual({ nextOffset: 10, processedUpdateIds: [8, 9], unprocessedByThread: {} });
  });

  it('sorts out-of-order updates and ignores stale updates below the stored offset', async () => {
    const stateStore: TelegramBrokerStateStore = {
      load: vi.fn(async () => ({ nextOffset: 9, processedUpdateIds: [], unprocessedByThread: {} })),
      save: vi.fn(async () => {}),
    };
    const telegram = {
      getTextUpdates: vi
        .fn()
        .mockResolvedValueOnce([
          { updateId: 10, userId: 42, threadId: 101, text: 'ten' },
          { updateId: 8, userId: 42, threadId: 101, text: 'stale' },
          { updateId: 9, userId: 42, threadId: 101, text: 'nine' },
        ])
        .mockImplementationOnce(
          (_offset, signal: AbortSignal | undefined) =>
            new Promise((_, reject) =>
              signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
            ),
        ),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram, stateStore });
    const delivered: string[] = [];
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, message => delivered.push(message.text));

    const polling = broker.startPolling({ intervalMs: 0 });
    await vi.waitFor(() => expect(delivered).toEqual(['nine', 'ten']));
    polling.stop();
    await polling.done;

    expect(delivered).not.toContain('stale');
  });

  it('reports instructions that were not delivered before the previous broker stopped', async () => {
    const stateStore: TelegramBrokerStateStore = {
      load: vi.fn(async () => ({ processedUpdateIds: [10, 11], unprocessedByThread: { '101': 2 } })),
      save: vi.fn(async () => {}),
    };
    const { telegram } = createBroker();
    const broker = new TelegramBroker({ allowedUserId: 42, telegram, stateStore });
    await broker.initialize();
    const deliver = vi.fn();

    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    expect(deliver).toHaveBeenCalledWith({
      type: 'message',
      text: '2 Telegram instructions were not processed before the previous broker stopped. Please resend.',
    });
    await vi.waitFor(() =>
      expect(stateStore.save).toHaveBeenCalledWith({ processedUpdateIds: [10, 11], unprocessedByThread: {} }),
    );
  });

  it('disables a deleted project topic and gives explicit repair guidance locally', async () => {
    const telegram = {
      getTextUpdates: vi.fn(async () => []),
      sendMessage: vi.fn().mockRejectedValue(new Error('Bad Request: message thread not found')),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const broker = new TelegramBroker({ allowedUserId: 42, telegram, deliveryRetryBaseMs: 0 });
    const deliver = vi.fn();
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    await broker.sendProjectMessage('one', 'answer');
    await vi.waitFor(() =>
      expect(deliver).toHaveBeenCalledWith({
        type: 'message',
        text: 'The saved Telegram topic is unavailable or deleted. Run `mastracode-remote --init` to repair it. This terminal session remains active locally.',
      }),
    );

    await expect(broker.sendProjectMessage('one', 'another answer')).rejects.toThrow(
      'Run `mastracode-remote --init` to repair it',
    );
    expect(telegram.sendMessage).toHaveBeenCalledOnce();
  });

  it('uses bounded polling backoff and sends one recovery notice', async () => {
    const delays: number[] = [];
    const telegram = {
      getTextUpdates: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'ECONNRESET' }))
        .mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'ECONNRESET' }))
        .mockResolvedValueOnce([])
        .mockImplementationOnce(
          (_offset, signal: AbortSignal | undefined) =>
            new Promise((_, reject) =>
              signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
            ),
        ),
      sendMessage: vi.fn(async () => {}),
      sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    };
    const diagnostics = vi.fn();
    const deliver = vi.fn();
    const broker = new TelegramBroker({ allowedUserId: 42, telegram, onDiagnostic: diagnostics });
    broker.register('one', { projectPath: '/projects/one', threadId: 101 }, deliver);

    const polling = broker.startPolling({
      intervalMs: 0,
      backoffBaseMs: 100,
      backoffMaxMs: 150,
      sleep: async delay => {
        delays.push(delay);
      },
    });
    await vi.waitFor(() => expect(telegram.sendMessage).toHaveBeenCalledOnce());
    polling.stop();
    await polling.done;

    expect(delays.slice(0, 2)).toEqual([100, 150]);
    expect(telegram.sendMessage).toHaveBeenCalledWith(
      101,
      'Telegram connection recovered. The terminal session stayed active. Current status follows.',
    );
    expect(deliver).toHaveBeenCalledWith({ type: 'message', text: '/status' });
    expect(diagnostics).toHaveBeenCalledWith({ type: 'poll_error', attempt: 1, errorCode: 'ECONNRESET' });
    expect(diagnostics).toHaveBeenCalledWith({ type: 'recovered', threadId: 101 });
  });
});
