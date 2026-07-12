import { describe, expect, it, vi } from 'vitest';

import { TelegramOutboundQueue } from './outbound-queue.js';

async function flush(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('TelegramOutboundQueue', () => {
  it('drops low-priority notices before completed conversation messages', async () => {
    let releaseFirst: (() => void) | undefined;
    const send = vi.fn(
      () =>
        new Promise<void>(resolve => {
          releaseFirst ??= resolve;
        }),
    );
    const queue = new TelegramOutboundQueue({ send, maxSize: 1, retryBaseMs: 0, retryMaxMs: 0 });

    queue.enqueue({ threadId: 101, text: 'sending', priority: 'normal' });
    queue.enqueue({ threadId: 101, text: 'low notice', priority: 'low' });
    queue.enqueue({ threadId: 202, text: 'completed answer', priority: 'normal' });
    releaseFirst?.();
    await flush();

    expect(send.mock.calls.map(call => call[0].text)).toEqual(['sending', 'completed answer']);
    queue.stop();
  });

  it('gives different project topics a fair turn', async () => {
    const sent: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const queue = new TelegramOutboundQueue({
      send: async item => {
        sent.push(`${item.threadId}:${item.text}`);
        if (sent.length === 1) await new Promise<void>(resolve => (releaseFirst = resolve));
      },
      maxSize: 10,
      retryBaseMs: 0,
      retryMaxMs: 0,
    });

    queue.enqueue({ threadId: 101, text: 'one-a', priority: 'normal' });
    queue.enqueue({ threadId: 101, text: 'one-b', priority: 'normal' });
    queue.enqueue({ threadId: 202, text: 'two-a', priority: 'normal' });
    releaseFirst?.();
    await flush();

    expect(sent).toEqual(['101:one-a', '202:two-a', '101:one-b']);
    queue.stop();
  });

  it('lets another project send while a failed delivery waits to retry', async () => {
    const sent: string[] = [];
    let failedOnce = false;
    const queue = new TelegramOutboundQueue({
      send: async item => {
        if (item.threadId === 101 && !failedOnce) {
          failedOnce = true;
          throw new Error('temporary failure');
        }
        sent.push(`${item.threadId}:${item.text}`);
      },
      maxSize: 10,
      retryBaseMs: 0,
      retryMaxMs: 0,
    });

    queue.enqueue({ threadId: 101, text: 'one', priority: 'normal' });
    queue.enqueue({ threadId: 202, text: 'two', priority: 'normal' });
    await vi.waitFor(() => expect(sent).toEqual(['202:two', '101:one']));

    queue.stop();
  });

  it('retries failed delivery with bounded exponential backoff', async () => {
    const delays: number[] = [];
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    const queue = new TelegramOutboundQueue({
      send,
      maxSize: 10,
      retryBaseMs: 100,
      retryMaxMs: 150,
      sleep: async delay => {
        delays.push(delay);
      },
    });

    queue.enqueue({ threadId: 101, text: 'answer', priority: 'normal' });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(3));

    expect(delays).toEqual([100, 150]);
    queue.stop();
  });

  it('does not retry permanent delivery failures', async () => {
    const failure = new Error('message thread not found');
    const permanentFailure = vi.fn();
    const send = vi.fn().mockRejectedValue(failure);
    const queue = new TelegramOutboundQueue({
      send,
      maxSize: 10,
      retryBaseMs: 100,
      retryMaxMs: 150,
      isRetryable: error => !error.message.includes('thread not found'),
      onPermanentFailure: permanentFailure,
    });

    queue.enqueue({ threadId: 101, text: 'answer', priority: 'normal' });
    await vi.waitFor(() => expect(permanentFailure).toHaveBeenCalledOnce());

    expect(send).toHaveBeenCalledOnce();
    expect(permanentFailure).toHaveBeenCalledWith({ threadId: 101, text: 'answer', priority: 'normal' }, failure);
    queue.stop();
  });

  it('honors Telegram Retry-After delays', async () => {
    const delays: number[] = [];
    const rateLimit = Object.assign(new Error('rate limited'), { retryAfterMs: 2_000 });
    const send = vi.fn().mockRejectedValueOnce(rateLimit).mockResolvedValue(undefined);
    const queue = new TelegramOutboundQueue({
      send,
      maxSize: 10,
      retryBaseMs: 100,
      retryMaxMs: 150,
      sleep: async delay => {
        delays.push(delay);
      },
    });

    queue.enqueue({ threadId: 101, text: 'answer', priority: 'normal' });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));

    expect(delays).toEqual([2_000]);
    queue.stop();
  });
});
