import type { AgentControllerEvent } from '@mastra/core/agent-controller';

export type InterjectionReplyOrigin = 'telegram' | 'terminal';

export function shouldSendAssistantReplyToTelegram(origin: InterjectionReplyOrigin | undefined): boolean {
  return origin !== 'terminal';
}

export class InterjectionReplyTracker {
  readonly #signalOrigins = new Map<string, InterjectionReplyOrigin>();
  readonly #pendingOrigins: InterjectionReplyOrigin[] = [];

  track(signalId: string, origin: InterjectionReplyOrigin): void {
    this.#signalOrigins.set(signalId, origin);
  }

  discard(signalId: string): void {
    this.#signalOrigins.delete(signalId);
  }

  observe(event: AgentControllerEvent): void {
    if ((event.type !== 'message_start' && event.type !== 'message_end') || event.message.role !== 'user') return;

    const origin = this.#signalOrigins.get(event.message.id);
    if (!origin) return;

    this.#signalOrigins.delete(event.message.id);
    this.#pendingOrigins.push(origin);
  }

  consume(): InterjectionReplyOrigin | undefined {
    return this.#pendingOrigins.shift();
  }
}
