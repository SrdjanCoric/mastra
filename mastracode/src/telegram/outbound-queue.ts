export type TelegramOutboundPriority = 'low' | 'normal';

export interface TelegramOutboundItem {
  threadId: number;
  text: string;
  priority: TelegramOutboundPriority;
}

export class TelegramOutboundQueue {
  private readonly queues = new Map<number, TelegramOutboundItem[]>();
  private readonly threadOrder: number[] = [];
  private readonly retryAttempts = new Map<TelegramOutboundItem, number>();
  private draining = false;
  private stopped = false;
  private pendingCount = 0;
  private lastThreadId: number | undefined;

  constructor(
    private readonly options: {
      send(item: TelegramOutboundItem): Promise<void>;
      maxSize: number;
      retryBaseMs: number;
      retryMaxMs: number;
      sleep?(delayMs: number): Promise<void>;
      onDrop?(item: TelegramOutboundItem): void;
      onError?(error: Error, attempt: number): void;
      isRetryable?(error: Error): boolean;
      onPermanentFailure?(item: TelegramOutboundItem, error: Error): void;
    },
  ) {}

  enqueue(item: TelegramOutboundItem): boolean {
    if (this.stopped) return false;
    if (this.pendingCount >= this.options.maxSize) {
      if (item.priority === 'low' || !this.dropOldestLowPriorityItem()) {
        this.options.onDrop?.(item);
        return false;
      }
    }

    const queue = this.queues.get(item.threadId);
    if (queue) {
      queue.push(item);
    } else {
      this.queues.set(item.threadId, [item]);
      this.threadOrder.push(item.threadId);
    }
    this.pendingCount += 1;
    void this.drain();
    return true;
  }

  stop(): void {
    this.stopped = true;
    this.queues.clear();
    this.threadOrder.splice(0);
    this.retryAttempts.clear();
    this.pendingCount = 0;
  }

  private dropOldestLowPriorityItem(): boolean {
    for (const threadId of this.threadOrder) {
      const queue = this.queues.get(threadId);
      const index = queue?.findIndex(item => item.priority === 'low') ?? -1;
      if (!queue || index < 0) continue;
      const [dropped] = queue.splice(index, 1);
      this.pendingCount -= 1;
      if (queue.length === 0) this.removeThread(threadId);
      if (dropped) {
        this.retryAttempts.delete(dropped);
        this.options.onDrop?.(dropped);
      }
      return true;
    }
    return false;
  }

  private async drain(): Promise<void> {
    if (this.draining || this.stopped) return;
    this.draining = true;
    try {
      while (!this.stopped) {
        const item = this.takeNext();
        if (!item) return;
        try {
          await this.options.send(item);
          this.retryAttempts.delete(item);
          this.lastThreadId = item.threadId;
        } catch (error) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          if (this.options.isRetryable?.(normalized) === false) {
            this.retryAttempts.delete(item);
            this.options.onPermanentFailure?.(item, normalized);
            continue;
          }
          const attempt = (this.retryAttempts.get(item) ?? 0) + 1;
          this.retryAttempts.set(item, attempt);
          this.options.onError?.(normalized, attempt);
          const retryAfterMs = 'retryAfterMs' in normalized ? normalized.retryAfterMs : undefined;
          const delay =
            typeof retryAfterMs === 'number'
              ? retryAfterMs
              : Math.min(this.options.retryMaxMs, this.options.retryBaseMs * 2 ** (attempt - 1));
          await (this.options.sleep ?? sleep)(delay);
          if (!this.stopped) this.requeue(item);
        }
      }
    } finally {
      this.draining = false;
      if (!this.stopped && this.pendingCount > 0) void this.drain();
    }
  }

  private takeNext(): TelegramOutboundItem | undefined {
    if (this.threadOrder.length > 1 && this.threadOrder[0] === this.lastThreadId) {
      const repeatedThread = this.threadOrder.shift();
      if (repeatedThread !== undefined) this.threadOrder.push(repeatedThread);
    }
    const threadId = this.threadOrder.shift();
    if (threadId === undefined) return undefined;
    const queue = this.queues.get(threadId);
    const item = queue?.shift();
    if (!queue || !item) {
      this.queues.delete(threadId);
      return this.takeNext();
    }
    this.pendingCount -= 1;
    if (queue.length > 0) {
      this.threadOrder.push(threadId);
    } else {
      this.queues.delete(threadId);
    }
    return item;
  }

  private requeue(item: TelegramOutboundItem): void {
    const queue = this.queues.get(item.threadId);
    if (queue) queue.push(item);
    else {
      this.queues.set(item.threadId, [item]);
      this.threadOrder.push(item.threadId);
    }
    this.pendingCount += 1;
  }

  private removeThread(threadId: number): void {
    this.queues.delete(threadId);
    const index = this.threadOrder.indexOf(threadId);
    if (index >= 0) this.threadOrder.splice(index, 1);
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
