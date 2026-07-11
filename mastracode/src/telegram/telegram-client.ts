import { randomBytes } from 'node:crypto';
import type { TelegramPrompt, TelegramTextUpdate } from './broker.js';
import type { TelegramRuntimeConfig } from './setup.js';

export interface TelegramProjectClient {
  validateAuthorization(): Promise<void>;
  createForumTopic(name: string): Promise<{ threadId: number }>;
  sendMessage(threadId: number, text: string): Promise<void>;
  sendPrompt?(threadId: number, prompt: TelegramPrompt): Promise<{ messageId: number }>;
  verifyRoundTrip(threadId: number): Promise<void>;
}

export type TelegramFetch = typeof fetch;

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  parameters?: { migrate_to_chat_id?: number };
}

interface TelegramMessage {
  message_id?: number;
  message_thread_id?: number;
  text?: string;
  chat?: { id?: number };
  from?: { id?: number };
  reply_to_message?: { message_id?: number };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: {
    id?: string;
    data?: string;
    from?: { id?: number };
    message?: TelegramMessage;
  };
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

  async sendPrompt(threadId: number, prompt: TelegramPrompt): Promise<{ messageId: number }> {
    const instruction =
      prompt.kind === 'approval' ? 'Choose an action below.' : 'Type your answer in the reply field below.';
    const replyMarkup =
      prompt.kind === 'approval'
        ? {
            inline_keyboard: [
              [
                { text: 'Approve', callback_data: `mastracode:${prompt.promptId}:approve` },
                { text: 'Deny', callback_data: `mastracode:${prompt.promptId}:deny` },
              ],
            ],
          }
        : { force_reply: true, selective: true };
    const response = await this.request<{ message_id?: number }>('sendMessage', {
      chat_id: this.config.groupId,
      message_thread_id: threadId,
      text: `${prompt.title}\n${prompt.summary}\n${instruction}`,
      reply_markup: replyMarkup,
    });
    const messageId = response.result?.message_id;
    if (messageId === undefined) throw new Error('Telegram did not return the prompt message ID.');
    return { messageId };
  }

  async getTextUpdates(offset: number | undefined, signal?: AbortSignal): Promise<TelegramTextUpdate[]> {
    const response = await this.request<TelegramUpdate[]>(
      'getUpdates',
      {
        ...(offset === undefined ? {} : { offset }),
        timeout: 25,
        allowed_updates: JSON.stringify(['message', 'callback_query']),
      },
      signal,
    );

    const updates: TelegramTextUpdate[] = [];
    for (const update of response.result ?? []) {
      const callback = update.callback_query;
      const callbackMatch = callback?.data?.match(/^mastracode:([A-F0-9]{6}):(approve|deny)$/);
      if (callback && callbackMatch) {
        if (callback.id) await this.request('answerCallbackQuery', { callback_query_id: callback.id });
        const message = callback.message;
        const routable =
          message?.chat?.id === this.config.groupId &&
          callback.from?.id !== undefined &&
          message.message_thread_id !== undefined;
        updates.push({
          updateId: update.update_id,
          userId: callback.from?.id ?? 0,
          threadId: message?.message_thread_id ?? 0,
          text: callbackMatch[2] ?? '',
          promptId: callbackMatch[1],
          ...(routable ? {} : { routable: false }),
        });
        continue;
      }

      const message = update.message;
      const routable =
        message?.chat?.id === this.config.groupId &&
        message.from?.id !== undefined &&
        message.message_thread_id !== undefined &&
        message.text !== undefined;
      updates.push({
        updateId: update.update_id,
        userId: message?.from?.id ?? 0,
        threadId: message?.message_thread_id ?? 0,
        text: message?.text ?? '',
        ...(message?.reply_to_message?.message_id === undefined
          ? {}
          : { replyToMessageId: message.reply_to_message.message_id }),
        ...(routable ? {} : { routable: false }),
      });
    }
    return updates;
  }

  async verifyRoundTrip(threadId: number): Promise<void> {
    const baseline = await this.request<TelegramUpdate[]>('getUpdates', {
      offset: -1,
      timeout: 0,
      allowed_updates: JSON.stringify(['message']),
    });
    let offset = nextUpdateOffset(baseline.result ?? []);
    const code = randomBytes(3).toString('hex').toUpperCase();
    const expectedText = `verify ${code}`;
    await this.sendMessage(threadId, `MastraCode connectivity test. Reply in this topic with exactly: ${expectedText}`);

    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const updates = await this.request<TelegramUpdate[]>('getUpdates', {
        ...(offset === undefined ? {} : { offset }),
        timeout: 5,
        allowed_updates: JSON.stringify(['message']),
      });
      const received = updates.result ?? [];
      offset = nextUpdateOffset(received) ?? offset;
      const matched = received.some(update => {
        const message = update.message;
        return (
          message?.chat?.id === this.config.groupId &&
          message.from?.id === this.config.allowedUserId &&
          message.message_thread_id === threadId &&
          message.text?.trim() === expectedText
        );
      });
      if (matched) {
        if (offset !== undefined) {
          await this.request<TelegramUpdate[]>('getUpdates', {
            offset,
            timeout: 0,
            allowed_updates: JSON.stringify(['message']),
          });
        }
        await this.sendMessage(threadId, 'MastraCode connectivity test passed. Incoming and outgoing messages work.');
        return;
      }
    }

    throw new Error(
      `Telegram connectivity test timed out. Reply in project topic ${threadId} from allowed user ${this.config.allowedUserId}, and make sure the bot can read group messages before rerunning init.`,
    );
  }

  private async request<T = unknown>(
    method: string,
    body: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<TelegramResponse<T>> {
    const response = await this.telegramFetch(`https://api.telegram.org/bot${this.config.botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal,
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
  if (!text) return [''];
  const chunks: string[] = [];
  let remaining = text;
  let openFenceLanguage: string | undefined;

  while (Array.from(remaining).length > TELEGRAM_MESSAGE_LIMIT) {
    const characters = Array.from(remaining);
    const hardLimit = TELEGRAM_MESSAGE_LIMIT - 4;
    const candidate = characters.slice(0, hardLimit).join('');
    const newlineIndex = candidate.lastIndexOf('\n');
    const splitAt = newlineIndex >= Math.floor(hardLimit * 0.6) ? newlineIndex + 1 : candidate.length;
    let chunk = candidate.slice(0, splitAt);
    remaining = characters.slice(Array.from(chunk).length).join('');

    openFenceLanguage = findOpenCodeFence(chunk);
    if (openFenceLanguage !== undefined) {
      chunk = `${chunk.replace(/\s*$/, '')}\n\`\`\``;
      remaining = `\`\`\`${openFenceLanguage}\n${remaining}`;
    }
    chunks.push(chunk);
  }

  chunks.push(remaining);
  return chunks;
}

function findOpenCodeFence(chunk: string): string | undefined {
  let language: string | undefined;
  for (const match of chunk.matchAll(/^```([^\s`]*)[^\n]*$/gm)) {
    language = language === undefined ? (match[1] ?? '') : undefined;
  }
  return language;
}

function nextUpdateOffset(updates: TelegramUpdate[]): number | undefined {
  if (updates.length === 0) return undefined;
  return Math.max(...updates.map(update => update.update_id)) + 1;
}

function formatMigratedGroupMessage(message: string): string {
  const migratedId = /migrate_to_chat_id=(-?\d+)/.exec(message)?.[1];
  return migratedId
    ? `Telegram group was upgraded to a supergroup. Set TELEGRAM_GROUP_ID=${migratedId} and rerun init.`
    : 'Telegram group was upgraded to a supergroup. Use its new group ID and rerun init.';
}
