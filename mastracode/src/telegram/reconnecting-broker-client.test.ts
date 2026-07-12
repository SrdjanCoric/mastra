import { describe, expect, it, vi } from 'vitest';

import type { TelegramBrokerClient } from './broker-client.js';
import { ReconnectingTelegramBrokerClient } from './reconnecting-broker-client.js';

function fakeClient(): TelegramBrokerClient {
  return {
    sendMessage: vi.fn(async () => {}),
    sendPrompt: vi.fn(async () => ({ messageId: 1 })),
    close: vi.fn(),
  };
}

describe('ReconnectingTelegramBrokerClient', () => {
  it('reconnects with bounded backoff and uses the replacement connection', async () => {
    const first = fakeClient();
    const second = fakeClient();
    const delays: number[] = [];
    let disconnect: (() => void) | undefined;
    const connect = vi
      .fn()
      .mockImplementationOnce(async (onDisconnect: () => void) => {
        disconnect = onDisconnect;
        return first;
      })
      .mockRejectedValueOnce(new Error('broker unavailable'))
      .mockResolvedValueOnce(second);
    const client = new ReconnectingTelegramBrokerClient({
      connect,
      retryBaseMs: 100,
      retryMaxMs: 150,
      sleep: async delay => {
        delays.push(delay);
      },
    });
    await client.start();

    disconnect?.();
    await vi.waitFor(() => expect(connect).toHaveBeenCalledTimes(3));
    await client.sendMessage('after restart');

    expect(delays).toEqual([100]);
    expect(second.sendMessage).toHaveBeenCalledWith('after restart');
    client.close();
  });

  it('stops reconnecting after the TUI closes', async () => {
    const first = fakeClient();
    let disconnect: (() => void) | undefined;
    const connect = vi.fn(async (onDisconnect: () => void) => {
      disconnect = onDisconnect;
      return first;
    });
    const client = new ReconnectingTelegramBrokerClient({ connect, retryBaseMs: 0, retryMaxMs: 0 });
    await client.start();

    client.close();
    disconnect?.();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(connect).toHaveBeenCalledOnce();
    expect(first.close).toHaveBeenCalledOnce();
  });
});
