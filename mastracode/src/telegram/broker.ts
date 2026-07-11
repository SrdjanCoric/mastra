import { randomBytes } from 'node:crypto';

export interface TelegramTextUpdate {
  updateId: number;
  userId: number;
  threadId: number;
  text: string;
  replyToMessageId?: number;
  promptId?: string;
  routable?: boolean;
}

export interface TelegramPrompt {
  promptId: string;
  kind: 'approval' | 'question';
  title: string;
  summary: string;
}

export interface TelegramBrokerTransport {
  getTextUpdates(offset: number | undefined, signal?: AbortSignal): Promise<TelegramTextUpdate[]>;
  sendMessage(threadId: number, text: string): Promise<void>;
  sendPrompt(threadId: number, prompt: TelegramPrompt): Promise<{ messageId: number }>;
}

export interface TelegramProjectRegistration {
  projectPath: string;
  threadId: number;
}

export type TelegramBrokerDelivery = {
  type: 'message';
  text: string;
  replyToMessageId?: number;
  promptId?: string;
};

type DeliveryHandler = (delivery: TelegramBrokerDelivery) => void;

interface ConnectedProject extends TelegramProjectRegistration {
  clientId: string;
  deliver: DeliveryHandler;
}

export class TelegramBroker {
  private readonly projectsByClientId = new Map<string, ConnectedProject>();
  private readonly projectsByPath = new Map<string, ConnectedProject>();
  private readonly projectsByThreadId = new Map<number, ConnectedProject>();
  private readonly roundTripWaiters = new Map<
    string,
    { threadId: number; resolve(): void; reject(error: Error): void; timeout: ReturnType<typeof setTimeout> }
  >();

  constructor(
    private readonly options: {
      allowedUserId: number;
      telegram: TelegramBrokerTransport;
    },
  ) {}

  get clientCount(): number {
    return this.projectsByClientId.size;
  }

  register(clientId: string, registration: TelegramProjectRegistration, deliver: DeliveryHandler): void {
    if (this.projectsByClientId.has(clientId)) {
      throw new Error(`Telegram broker client ${clientId} is already registered.`);
    }
    if (this.projectsByPath.has(registration.projectPath)) {
      throw new Error(`Telegram project ${registration.projectPath} is already connected.`);
    }
    if (this.projectsByThreadId.has(registration.threadId)) {
      throw new Error(`Telegram topic ${registration.threadId} is already registered.`);
    }

    const project = { clientId, ...registration, deliver };
    this.projectsByClientId.set(clientId, project);
    this.projectsByPath.set(project.projectPath, project);
    this.projectsByThreadId.set(project.threadId, project);
  }

  unregister(clientId: string): void {
    const project = this.projectsByClientId.get(clientId);
    if (!project) return;
    this.projectsByClientId.delete(clientId);
    this.projectsByPath.delete(project.projectPath);
    this.projectsByThreadId.delete(project.threadId);
  }

  startPolling(options: { intervalMs?: number; onError?(error: Error): void } = {}): {
    stop(): void;
    done: Promise<void>;
  } {
    let stopped = false;
    let nextOffset: number | undefined;
    const abortController = new AbortController();
    const intervalMs = options.intervalMs ?? 250;
    const done = (async () => {
      while (!stopped) {
        try {
          const updates = await this.options.telegram.getTextUpdates(nextOffset, abortController.signal);
          for (const update of updates) {
            nextOffset = Math.max(nextOffset ?? 0, update.updateId + 1);
            await this.processUpdate(update);
          }
        } catch (error) {
          if (!stopped) options.onError?.(error instanceof Error ? error : new Error(String(error)));
        }
        if (!stopped && intervalMs > 0) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    })();
    return {
      stop: () => {
        stopped = true;
        abortController.abort();
      },
      done,
    };
  }

  async verifyRoundTrip(threadId: number, timeoutMs = 30_000): Promise<void> {
    const marker = `verify ${randomBytes(3).toString('hex').toUpperCase()}`;
    const reply = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.roundTripWaiters.delete(marker);
        reject(new Error('Timed out waiting for the Telegram verification reply.'));
      }, timeoutMs);
      this.roundTripWaiters.set(marker, { threadId, resolve, reject, timeout });
    });
    try {
      await this.options.telegram.sendMessage(
        threadId,
        `MastraCode Telegram verification. Reply in this topic with exactly: ${marker}`,
      );
    } catch (error) {
      const waiter = this.roundTripWaiters.get(marker);
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.reject(error instanceof Error ? error : new Error(String(error)));
      }
      this.roundTripWaiters.delete(marker);
    }
    await reply;
  }

  async processUpdate(update: TelegramTextUpdate): Promise<void> {
    if (update.routable === false || update.userId !== this.options.allowedUserId) return;
    const waiter = this.roundTripWaiters.get(update.text.trim());
    if (waiter?.threadId === update.threadId) {
      clearTimeout(waiter.timeout);
      this.roundTripWaiters.delete(update.text.trim());
      waiter.resolve();
      return;
    }
    this.projectsByThreadId.get(update.threadId)?.deliver({
      type: 'message',
      text: update.text,
      ...(update.replyToMessageId === undefined ? {} : { replyToMessageId: update.replyToMessageId }),
      ...(update.promptId === undefined ? {} : { promptId: update.promptId }),
    });
  }

  async sendProjectMessage(clientId: string, text: string): Promise<void> {
    const project = this.getProject(clientId);
    await this.options.telegram.sendMessage(project.threadId, text);
  }

  async sendProjectPrompt(clientId: string, prompt: TelegramPrompt): Promise<{ messageId: number }> {
    const project = this.getProject(clientId);
    return this.options.telegram.sendPrompt(project.threadId, prompt);
  }

  private getProject(clientId: string): ConnectedProject {
    const project = this.projectsByClientId.get(clientId);
    if (!project) throw new Error(`Telegram broker client ${clientId} is not registered.`);
    return project;
  }
}
