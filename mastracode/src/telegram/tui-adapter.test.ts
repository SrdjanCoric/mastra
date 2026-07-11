import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  connectToTelegramBroker: vi.fn(),
}));

vi.mock('./broker-process.js', () => ({
  connectToTelegramBroker: mocks.connectToTelegramBroker,
}));

import { createTelegramTuiBridge } from './tui-adapter.js';

describe('createTelegramTuiBridge', () => {
  beforeEach(() => {
    mocks.connectToTelegramBroker.mockReset();
  });

  it('registers the initialized project and forwards messages in both directions', async () => {
    const client = {
      sendMessage: vi.fn().mockResolvedValue(undefined),
      sendPrompt: vi.fn().mockResolvedValue({ messageId: 99 }),
      close: vi.fn(),
    };
    mocks.connectToTelegramBroker.mockResolvedValue(client);
    const bridge = createTelegramTuiBridge({
      MASTRACODE_TELEGRAM_HOME: '/tmp/home',
      MASTRACODE_TELEGRAM_PROJECT_PATH: '/projects/example',
      MASTRACODE_TELEGRAM_THREAD_ID: '123',
      MASTRACODE_TELEGRAM_EXECUTABLE: '/pkg/dist/telegram-cli.js',
    });
    const onMessage = vi.fn().mockResolvedValue(undefined);

    expect(bridge.health()).toBe('disconnected');
    await bridge.start(onMessage);
    expect(bridge.health()).toBe('connected');
    const registration = mocks.connectToTelegramBroker.mock.calls[0]?.[0];
    registration.onMessage({ text: 'from Telegram', replyToMessageId: 88 });
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith({ text: 'from Telegram', replyToMessageId: 88 }));
    await bridge.sendMessage('from MastraCode');
    await expect(
      bridge.sendPrompt({ promptId: 'ABC123', kind: 'question', title: 'Question', summary: 'Which branch?' }),
    ).resolves.toEqual({
      messageId: 99,
    });
    bridge.stop();
    expect(bridge.health()).toBe('disconnected');

    expect(registration).toMatchObject({
      homeDir: '/tmp/home',
      registration: { projectPath: '/projects/example', threadId: 123 },
      executablePath: '/pkg/dist/telegram-cli.js',
    });
    expect(client.sendMessage).toHaveBeenCalledWith('from MastraCode');
    expect(client.close).toHaveBeenCalledOnce();
  });
});
