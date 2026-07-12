import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  acquireTelegramProjectLock: vi.fn(),
  connectToTelegramBroker: vi.fn(),
  releaseProjectLock: vi.fn(),
}));

vi.mock('./broker-lock.js', () => ({
  acquireTelegramProjectLock: mocks.acquireTelegramProjectLock,
}));

vi.mock('./broker-process.js', () => ({
  connectToTelegramBroker: mocks.connectToTelegramBroker,
}));

import { createTelegramTuiBridge } from './tui-adapter.js';

describe('createTelegramTuiBridge', () => {
  beforeEach(() => {
    mocks.acquireTelegramProjectLock.mockReset();
    mocks.acquireTelegramProjectLock.mockResolvedValue({ release: mocks.releaseProjectLock });
    mocks.connectToTelegramBroker.mockReset();
    mocks.releaseProjectLock.mockReset();
    mocks.releaseProjectLock.mockResolvedValue(undefined);
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
    registration.onReconnect();
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith({ text: 'from Telegram', replyToMessageId: 88 }));
    await vi.waitFor(() => expect(onMessage).toHaveBeenCalledWith({ text: '/status' }));
    await bridge.sendMessage('from MastraCode');
    await expect(
      bridge.sendPrompt({ promptId: 'ABC123', kind: 'question', title: 'Question', summary: 'Which branch?' }),
    ).resolves.toEqual({
      messageId: 99,
    });
    bridge.stop();
    expect(bridge.health()).toBe('disconnected');
    await vi.waitFor(() => expect(mocks.releaseProjectLock).toHaveBeenCalledOnce());

    expect(registration).toMatchObject({
      homeDir: '/tmp/home',
      registration: { projectPath: '/projects/example', threadId: 123 },
      executablePath: '/pkg/dist/telegram-cli.js',
    });
    expect(client.sendMessage).toHaveBeenCalledWith('from MastraCode');
    expect(client.close).toHaveBeenCalledOnce();
  });

  it('rejects a second active Telegram TUI for the same canonical project', async () => {
    mocks.acquireTelegramProjectLock.mockResolvedValue(undefined);
    const bridge = createTelegramTuiBridge({
      MASTRACODE_TELEGRAM_HOME: '/tmp/home',
      MASTRACODE_TELEGRAM_PROJECT_PATH: '/projects/example',
      MASTRACODE_TELEGRAM_THREAD_ID: '123',
    });

    await expect(bridge.start(vi.fn())).rejects.toThrow(
      'Another MastraCode Telegram session is already using this project: /projects/example',
    );
    expect(mocks.connectToTelegramBroker).not.toHaveBeenCalled();
  });
});
