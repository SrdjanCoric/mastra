import type { TelegramRuntimeConfig } from './setup.js';

export interface TelegramProjectClient {
  validateAuthorization(): Promise<void>;
  createForumTopic(name: string): Promise<{ threadId: number }>;
  sendMessage(threadId: number, text: string): Promise<void>;
}

export type TelegramFetch = typeof fetch;

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  parameters?: { migrate_to_chat_id?: number };
}

export class TelegramBotClient implements TelegramProjectClient {
  constructor(
    private readonly config: TelegramRuntimeConfig,
    private readonly telegramFetch: TelegramFetch = fetch,
  ) {}

  async validateAuthorization(): Promise<void> {
    try {
      await this.request('getMe', {});
      const chat = await this.request<{ is_forum?: boolean; type?: string; username?: string }>('getChat', {
        chat_id: this.config.groupId,
      });
      if (chat.result?.type !== 'supergroup' || chat.result.is_forum !== true) {
        throw new Error(
          `group ${this.config.groupId} is not a forum supergroup with Topics enabled. Enable Topics, add the bot, and rerun init.`,
        );
      }
      if (chat.result.username) {
        throw new Error(
          `group ${this.config.groupId} is public. Remove its public username so Telegram control remains private, then rerun init.`,
        );
      }
      const member = await this.request<{ status?: string }>('getChatMember', {
        chat_id: this.config.groupId,
        user_id: this.config.allowedUserId,
      });
      if (!member.result?.status || ['left', 'kicked'].includes(member.result.status)) {
        throw new Error(
          `allowed user ${this.config.allowedUserId} is not a member of group ${this.config.groupId}. Add that user and rerun init.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/unauthorized/i.test(message)) {
        throw new Error('Telegram bot credentials are invalid. Replace TELEGRAM_BOT_TOKEN and rerun init.');
      }
      if (/chat not found/i.test(message)) {
        throw new Error(
          `Telegram group ${this.config.groupId} was not found or the bot cannot access it. Check TELEGRAM_GROUP_ID, add the bot, and rerun init.`,
        );
      }
      if (/upgraded to a supergroup/i.test(message)) {
        throw new Error(formatMigratedGroupMessage(message));
      }
      if (/not a forum|allowed user|is public/i.test(message)) {
        throw new Error(`Telegram authorization failed: ${message}`);
      }
      throw new Error(`Telegram validation failed: ${message}`);
    }
  }

  async createForumTopic(name: string): Promise<{ threadId: number }> {
    const response = await this.request<{ message_thread_id?: number }>('createForumTopic', {
      chat_id: this.config.groupId,
      name,
    });
    const threadId = response.result?.message_thread_id;
    if (threadId === undefined) throw new Error('Telegram did not return a forum topic thread ID.');
    return { threadId };
  }

  async sendMessage(threadId: number, text: string): Promise<void> {
    for (const chunk of splitTelegramMessage(text)) {
      await this.request('sendMessage', {
        chat_id: this.config.groupId,
        message_thread_id: threadId,
        text: chunk,
      });
    }
  }

  private async request<T = unknown>(
    method: string,
    body: Record<string, string | number>,
  ): Promise<TelegramResponse<T>> {
    const response = await this.telegramFetch(`https://api.telegram.org/bot${this.config.botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as TelegramResponse<T>;
    if (!response.ok || !payload.ok) {
      const migrated = payload.parameters?.migrate_to_chat_id;
      throw new Error(
        `${payload.description ?? `Telegram ${method} failed`}${migrated ? ` migrate_to_chat_id=${migrated}` : ''}`,
      );
    }
    return payload;
  }
}

export const TELEGRAM_MESSAGE_LIMIT = 4096;

export function splitTelegramMessage(text: string): string[] {
  const characters = Array.from(text);
  const chunks: string[] = [];
  for (let offset = 0; offset < characters.length; offset += TELEGRAM_MESSAGE_LIMIT) {
    chunks.push(characters.slice(offset, offset + TELEGRAM_MESSAGE_LIMIT).join(''));
  }
  return chunks.length === 0 ? [''] : chunks;
}

function formatMigratedGroupMessage(message: string): string {
  const migratedId = /migrate_to_chat_id=(-?\d+)/.exec(message)?.[1];
  return migratedId
    ? `Telegram group was upgraded to a supergroup. Set TELEGRAM_GROUP_ID=${migratedId} and rerun init.`
    : 'Telegram group was upgraded to a supergroup. Use its new group ID and rerun init.';
}
