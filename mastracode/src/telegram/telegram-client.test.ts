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
      .mockResolvedValueOnce(response({ is_forum: true }))
      .mockResolvedValueOnce(response({ status: 'member' }));

    await new TelegramBotClient(config, telegramFetch).validateAuthorization();

    expect(telegramFetch).toHaveBeenCalledTimes(3);
    expect(JSON.parse(telegramFetch.mock.calls[2][1].body)).toEqual({ chat_id: -100456, user_id: 123 });
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
      'not a forum with Topics enabled',
    );
  });

  it('rejects a user outside the configured group', async () => {
    const telegramFetch = vi
      .fn()
      .mockResolvedValueOnce(response({ id: 1 }))
      .mockResolvedValueOnce(response({ is_forum: true }))
      .mockResolvedValueOnce(response({ status: 'left' }));

    await expect(new TelegramBotClient(config, telegramFetch).validateAuthorization()).rejects.toThrow(
      'allowed user 123 is not a member of group -100456',
    );
  });
});
