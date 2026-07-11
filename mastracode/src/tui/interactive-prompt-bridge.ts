import { randomBytes } from 'node:crypto';

export type InteractivePromptResponse =
  | { type: 'approve' }
  | { type: 'deny' }
  | { type: 'goal' }
  | { type: 'always_allow_category' }
  | { type: 'yolo' }
  | { type: 'answer'; text: string }
  | { type: 'answers'; answers: string[] };

export type InteractivePromptSource = 'terminal' | 'telegram';
export type InteractivePromptCancelReason = 'stopped' | 'shutdown' | 'thread-changed';

export interface InteractivePromptHandle {
  id: string;
  resolveLocal(response: InteractivePromptResponse): boolean;
}

export interface InteractivePromptOptions {
  kind: 'approval' | 'question';
  title: string;
  summary: string;
  onResolve(response: InteractivePromptResponse, source: InteractivePromptSource): Promise<void> | void;
  onCancel?(reason: InteractivePromptCancelReason): Promise<void> | void;
}

interface PendingPrompt extends InteractivePromptOptions {
  id: string;
  telegramMessageId?: number;
}

export interface InteractivePromptTelegramMessage {
  text: string;
  replyToMessageId?: number;
  promptId?: string;
}

const approvalWords = new Set(['approve', 'approved', 'confirm', 'confirmed', 'yes', 'y', 'ok', 'go', 'ship it']);
const denialWords = new Set(['deny', 'denied', 'reject', 'rejected', 'no', 'n', 'stop']);

export class InteractivePromptBridge {
  readonly #pending = new Map<string, PendingPrompt>();
  readonly #resolved = new Set<string>();
  readonly #resolvedTelegramMessageIds = new Set<number>();
  readonly #sendMessage: (text: string) => Promise<void>;
  readonly #sendPrompt: (
    prompt: Pick<InteractivePromptOptions, 'kind' | 'title' | 'summary'> & { promptId: string },
  ) => Promise<{ messageId: number }>;
  readonly #idFactory: () => string;

  constructor(options: {
    sendMessage(text: string): Promise<void>;
    sendPrompt(
      prompt: Pick<InteractivePromptOptions, 'kind' | 'title' | 'summary'> & { promptId: string },
    ): Promise<{ messageId: number }>;
    idFactory?: () => string;
  }) {
    this.#sendMessage = options.sendMessage;
    this.#sendPrompt = options.sendPrompt;
    this.#idFactory = options.idFactory ?? (() => randomBytes(3).toString('hex').toUpperCase());
  }

  present(options: InteractivePromptOptions): InteractivePromptHandle {
    const id = this.#nextId();
    const pending: PendingPrompt = { ...options, id };
    this.#pending.set(id, pending);
    void this.#sendPrompt({ promptId: id, kind: options.kind, title: options.title, summary: options.summary })
      .then(({ messageId }) => {
        pending.telegramMessageId = messageId;
        if (this.#resolved.has(id)) this.#resolvedTelegramMessageIds.add(messageId);
      })
      .catch(() => {});

    return {
      id,
      resolveLocal: response => this.#claim(id, response, 'terminal'),
    };
  }

  async receiveMessage(message: InteractivePromptTelegramMessage): Promise<boolean> {
    const promptId = message.promptId?.toUpperCase();
    const pending = promptId
      ? this.#pending.get(promptId)
      : [...this.#pending.values()].find(prompt => prompt.telegramMessageId === message.replyToMessageId);
    if (!pending) {
      const wasResolved =
        (promptId !== undefined && this.#resolved.has(promptId)) ||
        (message.replyToMessageId !== undefined && this.#resolvedTelegramMessageIds.has(message.replyToMessageId));
      if (!wasResolved) return false;
      await this.#sendMessage('That prompt was already resolved. This delayed or duplicate reply was ignored.').catch(
        () => {},
      );
      return true;
    }

    const response = parseResponse(pending.kind, message.text.trim());
    if (!response) {
      await this.#sendMessage(replyGuidance(pending)).catch(() => {});
      return true;
    }

    this.#claim(pending.id, response, 'telegram');
    return true;
  }

  async cancelAll(reason: InteractivePromptCancelReason): Promise<void> {
    const pending = [...this.#pending.values()];
    this.#pending.clear();
    for (const prompt of pending) {
      this.#resolved.add(prompt.id);
      if (prompt.telegramMessageId !== undefined) this.#resolvedTelegramMessageIds.add(prompt.telegramMessageId);
      await prompt.onCancel?.(reason);
    }
  }

  #claim(id: string, response: InteractivePromptResponse, source: InteractivePromptSource): boolean {
    const pending = this.#pending.get(id);
    if (!pending) return false;

    this.#pending.delete(id);
    this.#resolved.add(id);
    if (pending.telegramMessageId !== undefined) this.#resolvedTelegramMessageIds.add(pending.telegramMessageId);
    void Promise.resolve(pending.onResolve(response, source))
      .then(() =>
        this.#sendMessage(
          source === 'telegram'
            ? 'The prompt was resolved from Telegram.'
            : 'The prompt was resolved in the terminal. Later Telegram replies will be ignored.',
        ),
      )
      .catch(() => this.#sendMessage('The prompt could not be applied safely. The reply was not retried.'))
      .catch(() => {});
    return true;
  }

  #nextId(): string {
    for (;;) {
      const id = this.#idFactory().trim().toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(id)) throw new Error('Interactive prompt IDs must contain six letters or digits.');
      if (!this.#pending.has(id) && !this.#resolved.has(id)) return id;
    }
  }
}

function parseResponse(kind: InteractivePromptOptions['kind'], text: string): InteractivePromptResponse | undefined {
  const normalized = text.toLowerCase();
  if (kind === 'question') return text.length > 0 ? { type: 'answer', text } : undefined;
  if (approvalWords.has(normalized)) return { type: 'approve' };
  if (denialWords.has(normalized)) return { type: 'deny' };
  return undefined;
}

function replyGuidance(prompt: PendingPrompt): string {
  return prompt.kind === 'approval'
    ? 'Reply directly to the approval prompt with `approve` or `deny`. Ambiguous text cannot approve work.'
    : 'Reply directly to the question prompt so Telegram can bind the answer automatically.';
}
