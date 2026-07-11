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
    const client = { sendMessage: vi.fn().mockResolvedValue(undefined), close: vi.fn() };
    mocks.connectToTelegramBroker.mockResolvedValue(client);
    const bridge = createTelegramTuiBridge({
      MASTRACODE_TELEGRAM_HOME: '/tmp/home',
      MASTRACODE_TELEGRAM_PROJECT_PATH: '/projects/example',
      MASTRACODE_TELEGRAM_THREAD_ID: '123',
      MASTRACODE_TELEGRAM_EXECUTABLE: '/pkg/dist/telegram-cli.js',
    });
    const onMessage = vi.fn().mockResolvedValue(undefined);

    await bridge.start(onMessage);
    const registration = mocks.connectToTelegramBroker.mock.calls[0]?.[0];
    registration.onMessage('from Telegram');
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith('from Telegram'));
    await bridge.sendMessage('from MastraCode');
    bridge.stop();

    expect(registration).toMatchObject({
      homeDir: '/tmp/home',
      registration: { projectPath: '/projects/example', threadId: 123 },
      executablePath: '/pkg/dist/telegram-cli.js',
    });
    expect(client.sendMessage).toHaveBeenCalledWith('from MastraCode');
    expect(client.close).toHaveBeenCalledOnce();
  });
});
