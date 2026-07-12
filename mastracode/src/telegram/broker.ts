import { randomBytes } from 'node:crypto';

import type { TelegramBrokerState, TelegramBrokerStateStore } from './broker-state.js';
import { TelegramOutboundQueue } from './outbound-queue.js';
import type { TelegramOutboundPriority } from './outbound-queue.js';

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

export interface TelegramBrokerDiagnostic {
  type: 'poll_error' | 'recovered' | 'queue_drop' | 'delivery_retry' | 'unprocessed';
  threadId?: number;
  attempt?: number;
  errorCode?: string;
  count?: number;
}

type DeliveryHandler = (delivery: TelegramBrokerDelivery) => Promise<void> | void;
type UpdateResult = 'delivered' | 'ignored' | 'unprocessed';

interface ConnectedProject extends TelegramProjectRegistration {
  clientId: string;
  deliver: DeliveryHandler;
}

const EMPTY_STATE: TelegramBrokerState = { processedUpdateIds: [], unprocessedByThread: {} };
const MAX_PROCESSED_UPDATE_IDS = 1_000;

function normalizeVerificationReply(text: string): string {
  return text.trim().toLowerCase();
}

export class TelegramBroker {
  private readonly projectsByClientId = new Map<string, ConnectedProject>();
  private readonly projectsByPath = new Map<string, ConnectedProject>();
  private readonly projectsByThreadId = new Map<number, ConnectedProject>();
  private readonly roundTripWaiters = new Map<
    string,
    { threadId: number; resolve(): void; reject(error: Error): void; timeout: ReturnType<typeof setTimeout> }
  >();
  private readonly disabledThreads = new Set<number>();
  private readonly outboundQueue: TelegramOutboundQueue;
  private state: TelegramBrokerState = structuredClone(EMPTY_STATE);
  private processedUpdateIds = new Set<number>();
  private initialized = false;
  private stateWrite = Promise.resolve();

  constructor(
    private readonly options: {
      allowedUserId: number;
      telegram: TelegramBrokerTransport;
      stateStore?: TelegramBrokerStateStore;
      outboundQueueSize?: number;
      deliveryRetryBaseMs?: number;
      deliveryRetryMaxMs?: number;
      sleep?(delayMs: number): Promise<void>;
      onDiagnostic?(diagnostic: TelegramBrokerDiagnostic): void;
    },
  ) {
    this.outboundQueue = new TelegramOutboundQueue({
      send: item => this.options.telegram.sendMessage(item.threadId, item.text),
      maxSize: options.outboundQueueSize ?? 100,
      retryBaseMs: options.deliveryRetryBaseMs ?? 500,
      retryMaxMs: options.deliveryRetryMaxMs ?? 30_000,
      ...(options.sleep ? { sleep: options.sleep } : {}),
      onDrop: item => options.onDiagnostic?.({ type: 'queue_drop', threadId: item.threadId }),
      onError: (error, attempt) =>
        options.onDiagnostic?.({ type: 'delivery_retry', attempt, errorCode: safeErrorCode(error) }),
      isRetryable: error => !isDeletedTopicError(error),
      onPermanentFailure: item => {
        this.disabledThreads.add(item.threadId);
        const project = this.projectsByThreadId.get(item.threadId);
        if (project) {
          void Promise.resolve(
            project.deliver({
              type: 'message',
              text: 'The saved Telegram topic is unavailable or deleted. Run `mastracode-remote --init` to repair it. This terminal session remains active locally.',
            }),
          ).catch(() => {});
        }
      },
    });
  }

  get clientCount(): number {
    return this.projectsByClientId.size;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.state = this.options.stateStore ? await this.options.stateStore.load() : structuredClone(EMPTY_STATE);
    this.processedUpdateIds = new Set(this.state.processedUpdateIds);
    this.initialized = true;
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

    const unprocessed = this.state.unprocessedByThread[String(project.threadId)];
    if (unprocessed) {
      void Promise.resolve(
        deliver({
          type: 'message',
          text: `${unprocessed} Telegram ${unprocessed === 1 ? 'instruction was' : 'instructions were'} not processed before the previous broker stopped. Please resend.`,
        }),
      )
        .then(() => {
          const key = String(project.threadId);
          const current = this.state.unprocessedByThread[key] ?? 0;
          if (current <= unprocessed) delete this.state.unprocessedByThread[key];
          else this.state.unprocessedByThread[key] = current - unprocessed;
          this.options.onDiagnostic?.({ type: 'unprocessed', threadId: project.threadId, count: unprocessed });
          return this.persistState();
        })
        .catch(() => {});
    }
  }

  unregister(clientId: string): void {
    const project = this.projectsByClientId.get(clientId);
    if (!project) return;
    this.projectsByClientId.delete(clientId);
    this.projectsByPath.delete(project.projectPath);
    this.projectsByThreadId.delete(project.threadId);
  }

  startPolling(
    options: {
      intervalMs?: number;
      backoffBaseMs?: number;
      backoffMaxMs?: number;
      sleep?(delayMs: number): Promise<void>;
      onError?(error: Error): void;
    } = {},
  ): { stop(): void; done: Promise<void> } {
    let stopped = false;
    let consecutiveFailures = 0;
    let disconnected = false;
    const abortController = new AbortController();
    const intervalMs = options.intervalMs ?? 250;
    const backoffBaseMs = options.backoffBaseMs ?? 500;
    const backoffMaxMs = options.backoffMaxMs ?? 30_000;
    const wait = options.sleep ?? sleep;
    const done = (async () => {
      await this.initialize();
      while (!stopped) {
        let delay = intervalMs;
        try {
          const updates = await this.options.telegram.getTextUpdates(this.state.nextOffset, abortController.signal);
          for (const update of [...updates].sort((left, right) => left.updateId - right.updateId)) {
            await this.processPersistedUpdate(update);
          }
          if (disconnected) {
            disconnected = false;
            for (const project of this.projectsByClientId.values()) {
              this.queueProjectMessage(
                project,
                'Telegram connection recovered. The terminal session stayed active. Current status follows.',
                'low',
              );
              void Promise.resolve(project.deliver({ type: 'message', text: '/status' })).catch(() => {});
              this.options.onDiagnostic?.({ type: 'recovered', threadId: project.threadId });
            }
          }
          consecutiveFailures = 0;
        } catch (error) {
          if (stopped) break;
          disconnected = true;
          consecutiveFailures += 1;
          const normalized = error instanceof Error ? error : new Error(String(error));
          options.onError?.(normalized);
          this.options.onDiagnostic?.({
            type: 'poll_error',
            attempt: consecutiveFailures,
            errorCode: safeErrorCode(normalized),
          });
          delay = Math.min(backoffMaxMs, backoffBaseMs * 2 ** (consecutiveFailures - 1));
        }
        if (!stopped && delay > 0) await wait(delay);
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
    const normalizedMarker = normalizeVerificationReply(marker);
    const reply = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.roundTripWaiters.delete(normalizedMarker);
        reject(new Error('Timed out waiting for the Telegram verification reply.'));
      }, timeoutMs);
      this.roundTripWaiters.set(normalizedMarker, { threadId, resolve, reject, timeout });
    });
    try {
      await this.options.telegram.sendMessage(
        threadId,
        'MastraCode Remote verification. Reply in this topic with the code in the next message.',
      );
      await this.options.telegram.sendMessage(threadId, marker);
    } catch (error) {
      const waiter = this.roundTripWaiters.get(normalizedMarker);
      if (waiter) {
        clearTimeout(waiter.timeout);
        waiter.reject(error instanceof Error ? error : new Error(String(error)));
      }
      this.roundTripWaiters.delete(normalizedMarker);
    }
    await reply;
  }

  async processUpdate(update: TelegramTextUpdate): Promise<UpdateResult> {
    if (update.routable === false || update.userId !== this.options.allowedUserId) return 'ignored';
    const normalizedReply = normalizeVerificationReply(update.text);
    const waiter = this.roundTripWaiters.get(normalizedReply);
    if (waiter?.threadId === update.threadId) {
      clearTimeout(waiter.timeout);
      this.roundTripWaiters.delete(normalizedReply);
      waiter.resolve();
      return 'ignored';
    }
    const project = this.projectsByThreadId.get(update.threadId);
    if (!project) return 'unprocessed';
    await project.deliver({
      type: 'message',
      text: update.text,
      ...(update.replyToMessageId === undefined ? {} : { replyToMessageId: update.replyToMessageId }),
      ...(update.promptId === undefined ? {} : { promptId: update.promptId }),
    });
    return 'delivered';
  }

  async sendProjectMessage(
    clientId: string,
    text: string,
    priority: TelegramOutboundPriority = 'normal',
  ): Promise<void> {
    const project = this.getProject(clientId);
    if (this.disabledThreads.has(project.threadId)) {
      throw new Error('The saved Telegram topic is unavailable. Run `mastracode-remote --init` to repair it.');
    }
    if (!this.queueProjectMessage(project, text, priority)) {
      throw new Error('Telegram outbound queue is full. The message was not queued.');
    }
  }

  async sendProjectPrompt(clientId: string, prompt: TelegramPrompt): Promise<{ messageId: number }> {
    const project = this.getProject(clientId);
    if (this.disabledThreads.has(project.threadId)) {
      throw new Error('The saved Telegram topic is unavailable. Run `mastracode-remote --init` to repair it.');
    }
    try {
      return await this.options.telegram.sendPrompt(project.threadId, prompt);
    } catch (error) {
      if (error instanceof Error && isDeletedTopicError(error)) {
        this.disabledThreads.add(project.threadId);
        void Promise.resolve(
          project.deliver({
            type: 'message',
            text: 'The saved Telegram topic is unavailable or deleted. Run `mastracode-remote --init` to repair it. This terminal session remains active locally.',
          }),
        ).catch(() => {});
      }
      throw error;
    }
  }

  shutdown(): void {
    this.outboundQueue.stop();
  }

  private async processPersistedUpdate(update: TelegramTextUpdate): Promise<void> {
    const previousOffset = this.state.nextOffset;
    if (previousOffset !== undefined && update.updateId < previousOffset) {
      await this.persistState();
      return;
    }
    this.state.nextOffset = Math.max(previousOffset ?? 0, update.updateId + 1);
    if (this.processedUpdateIds.has(update.updateId)) {
      await this.persistState();
      return;
    }

    this.processedUpdateIds.add(update.updateId);
    this.state.processedUpdateIds.push(update.updateId);
    if (this.state.processedUpdateIds.length > MAX_PROCESSED_UPDATE_IDS) {
      const removed = this.state.processedUpdateIds.splice(
        0,
        this.state.processedUpdateIds.length - MAX_PROCESSED_UPDATE_IDS,
      );
      for (const updateId of removed) this.processedUpdateIds.delete(updateId);
    }

    const mayBeInstruction = update.routable !== false && update.userId === this.options.allowedUserId;
    if (mayBeInstruction) this.incrementUnprocessed(update.threadId);
    await this.persistState();

    const result = await this.processUpdate(update);
    if (mayBeInstruction && result !== 'unprocessed') {
      this.decrementUnprocessed(update.threadId);
      await this.persistState();
    }
  }

  private incrementUnprocessed(threadId: number): void {
    const key = String(threadId);
    this.state.unprocessedByThread[key] = (this.state.unprocessedByThread[key] ?? 0) + 1;
  }

  private decrementUnprocessed(threadId: number): void {
    const key = String(threadId);
    const count = this.state.unprocessedByThread[key] ?? 0;
    if (count <= 1) delete this.state.unprocessedByThread[key];
    else this.state.unprocessedByThread[key] = count - 1;
  }

  private persistState(): Promise<void> {
    const store = this.options.stateStore;
    if (!store) return Promise.resolve();
    const snapshot = structuredClone(this.state);
    this.stateWrite = this.stateWrite.then(() => store.save(snapshot));
    return this.stateWrite;
  }

  private queueProjectMessage(project: ConnectedProject, text: string, priority: TelegramOutboundPriority): boolean {
    if (this.disabledThreads.has(project.threadId)) return false;
    return this.outboundQueue.enqueue({ threadId: project.threadId, text, priority });
  }

  private getProject(clientId: string): ConnectedProject {
    const project = this.projectsByClientId.get(clientId);
    if (!project) throw new Error(`Telegram broker client ${clientId} is not registered.`);
    return project;
  }
}

function safeErrorCode(error: Error): string {
  if ('code' in error && typeof error.code === 'string') return error.code;
  return error.name || 'Error';
}

function isDeletedTopicError(error: Error): boolean {
  return /message thread not found|topic (?:was )?(?:closed|deleted)|TOPIC_(?:CLOSED|DELETED)/i.test(error.message);
}

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
