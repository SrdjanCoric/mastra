import { describe, expect, it, vi } from 'vitest';
import { TelegramBotClient } from './telegram-client.js';

const config = { botToken: 'top-secret-token', allowedUserId: 123, groupId: -100456 };

function response(result: unknown, ok = true): Response {
  return { ok, json: async () => (ok ? { ok: true, result } : { ok: false, description: result }) } as Response;
}

describe('TelegramBotClient authorization', () => {
  it('validates the bot, forum group, and allowed user boundary', async () => {
    const telegramFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: 1 }))
      .mockResolvedValueOnce(response({ is_forum: true, type: 'supergroup' }))
      .mockResolvedValueOnce(response({ status: 'member' }));

    await new TelegramBotClient(config, telegramFetch).validateAuthorization();

    expect(telegramFetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(telegramFetch.mock.calls[2][1].body)).toEqual({ chat_id: -100456, user_id: 123 });
  });

  it('proves outgoing and incoming topic delivery with the allowed user', async () => {
    let expectedText = '';
    const telegramFetch = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      const method = url.split('/').at(-1);
      const body = JSON.parse(init.body as string) as { offset?: number; text?: string };
      if (method === 'getUpdates' && body.offset === -1) {
        return response([{ update_id: 10 }]);
      }
      if (method === 'getUpdates') {
        return response([
          {
            update_id: 11,
            message: {
              message_thread_id: 42,
              text: expectedText,
              chat: { id: -100456 },
              from: { id: 123 },
            },
          },
        ]);
      }
      if (method === 'sendMessage' && body.text?.includes('Reply in this topic with exactly:')) {
        expectedText = body.text.split('exactly: ')[1] ?? '';
      }
      return response({});
    });

    await new TelegramBotClient(config, telegramFetch).verifyRoundTrip(42);

    expect(expectedText).toMatch(/^verify [A-F0-9]{6}$/);
    expect(telegramFetch).toHaveBeenCalledTimes(5);
  });

  it('rejects invalid credentials without exposing the token', async () => {
    const telegramFetch = vi.fn().mockResolvedValue(response('Unauthorized', false));

    const promise = new TelegramBotClient(config, telegramFetch).validateAuthorization();

    await expect(promise).rejects.toThrow('Telegram bot credentials are invalid');
    await expect(promise).rejects.not.toThrow('top-secret-token');
  });

  it('rejects a group without private forum topic routing', async () => {
    const telegramFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: 1 }))
      .mockResolvedValueOnce(response({ is_forum: false }));

    await expect(new TelegramBotClient(config, telegramFetch).validateAuthorization()).rejects.toThrow(
      'not a forum supergroup with Topics enabled',
    );
  });

  it('rejects a public forum group', async () => {
    const telegramFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: 1 }))
      .mockResolvedValueOnce(response({ is_forum: true, type: 'supergroup', username: 'public-group' }));

    await expect(new TelegramBotClient(config, telegramFetch).validateAuthorization()).rejects.toThrow('is public');
  });

  it('rejects a user outside the configured group', async () => {
    const telegramFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: 1 }))
      .mockResolvedValueOnce(response({ is_forum: true, type: 'supergroup' }))
      .mockResolvedValueOnce(response({ status: 'left' }));

    await expect(new TelegramBotClient(config, telegramFetch).validateAuthorization()).rejects.toThrow(
      'allowed user 123 is not a member of group -100456',
    );
  });
});
