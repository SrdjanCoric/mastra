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
}

const approvalWords = new Set(['approve', 'approved', 'confirm', 'confirmed', 'yes', 'y', 'ok', 'go', 'ship it']);
const denialWords = new Set(['deny', 'denied', 'reject', 'rejected', 'no', 'n', 'stop']);
const promptReplyPattern = /^([A-Z0-9]{6})\s+([\s\S]+)$/i;

export class InteractivePromptBridge {
  readonly #pending = new Map<string, PendingPrompt>();
  readonly #resolved = new Set<string>();
  readonly #sendMessage: (text: string) => Promise<void>;
  readonly #idFactory: () => string;

  constructor(options: { sendMessage(text: string): Promise<void>; idFactory?: () => string }) {
    this.#sendMessage = options.sendMessage;
    this.#idFactory = options.idFactory ?? (() => randomBytes(3).toString('hex').toUpperCase());
  }

  present(options: InteractivePromptOptions): InteractivePromptHandle {
    const id = this.#nextId();
    this.#pending.set(id, { ...options, id });
    void this.#sendMessage(formatPrompt(id, options)).catch(() => {});

    return {
      id,
      resolveLocal: response => this.#claim(id, response, 'terminal'),
    };
  }

  async receiveMessage(text: string): Promise<boolean> {
    const trimmed = text.trim();
    const match = promptReplyPattern.exec(trimmed);

    if (!match) {
      const pending = this.#pending.values().next().value as PendingPrompt | undefined;
      if (!pending) return false;
      await this.#sendMessage(replyGuidance(pending)).catch(() => {});
      return true;
    }

    const id = match[1]!.toUpperCase();
    const replyText = match[2]!.trim();
    const pending = this.#pending.get(id);
    if (!pending) {
      if (this.#resolved.has(id)) {
        await this.#sendMessage(
          `Prompt ${id} was already resolved. This delayed or duplicate reply was ignored.`,
        ).catch(() => {});
        return true;
      }
      if (this.#pending.size > 0) {
        const active = this.#pending.values().next().value as PendingPrompt;
        await this.#sendMessage(`Prompt ${id} is not active. ${replyGuidance(active)}`).catch(() => {});
        return true;
      }
      return false;
    }

    const response = parseResponse(pending.kind, replyText);
    if (!response) {
      await this.#sendMessage(replyGuidance(pending)).catch(() => {});
      return true;
    }

    this.#claim(id, response, 'telegram');
    return true;
  }

  async cancelAll(reason: InteractivePromptCancelReason): Promise<void> {
    const pending = [...this.#pending.values()];
    this.#pending.clear();
    for (const prompt of pending) {
      this.#resolved.add(prompt.id);
      await prompt.onCancel?.(reason);
    }
  }

  #claim(id: string, response: InteractivePromptResponse, source: InteractivePromptSource): boolean {
    const pending = this.#pending.get(id);
    if (!pending) return false;

    this.#pending.delete(id);
    this.#resolved.add(id);
    void Promise.resolve(pending.onResolve(response, source))
      .then(() =>
        this.#sendMessage(
          source === 'telegram'
            ? `Prompt ${id} was resolved from Telegram.`
            : `Prompt ${id} was resolved in the terminal. Later Telegram replies will be ignored.`,
        ),
      )
      .catch(() => this.#sendMessage(`Prompt ${id} could not be applied safely. The reply was not retried.`))
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

function formatPrompt(id: string, prompt: InteractivePromptOptions): string {
  const instruction =
    prompt.kind === 'approval'
      ? `Reply \`${id} approve\` or \`${id} deny\`.`
      : `Reply \`${id} <answer>\`. The prompt ID is required.`;
  return [`${prompt.title} (${id})`, prompt.summary, instruction].join('\n');
}

function replyGuidance(prompt: PendingPrompt): string {
  return prompt.kind === 'approval'
    ? `Reply \`${prompt.id} approve\` or \`${prompt.id} deny\`. Ambiguous text cannot approve work.`
    : `Reply \`${prompt.id} <answer>\` so the answer is bound to the current question.`;
}
