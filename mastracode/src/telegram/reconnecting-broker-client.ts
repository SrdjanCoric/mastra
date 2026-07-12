import type { TelegramBrokerClient } from './broker-client.js';
import type { TelegramPrompt } from './broker.js';

export class ReconnectingTelegramBrokerClient implements TelegramBrokerClient {
  private client: TelegramBrokerClient | undefined;
  private stopped = false;
  private reconnecting: Promise<void> | undefined;
  private connectionId = 0;
  private connectedBefore = false;

  constructor(
    private readonly options: {
      connect(onDisconnect: () => void): Promise<TelegramBrokerClient>;
      retryBaseMs: number;
      retryMaxMs: number;
      sleep?(delayMs: number): Promise<void>;
      onReconnect?(client: TelegramBrokerClient): Promise<void> | void;
    },
  ) {}

  async start(): Promise<void> {
    await this.connectOnce();
  }

  async sendMessage(text: string): Promise<void> {
    const client = this.client;
    if (!client) throw new Error('Telegram broker is reconnecting. The terminal session remains active locally.');
    await client.sendMessage(text);
  }

  async sendPrompt(prompt: TelegramPrompt): Promise<{ messageId: number }> {
    const client = this.client;
    if (!client) throw new Error('Telegram broker is reconnecting. The terminal session remains active locally.');
    return client.sendPrompt(prompt);
  }

  close(): void {
    this.stopped = true;
    this.connectionId += 1;
    this.client?.close();
    this.client = undefined;
  }

  private async connectOnce(): Promise<void> {
    const connectionId = ++this.connectionId;
    const client = await this.options.connect(() => this.handleDisconnect(connectionId));
    if (this.stopped || connectionId !== this.connectionId) {
      client.close();
      return;
    }
    const reconnect = this.connectedBefore;
    this.connectedBefore = true;
    this.client = client;
    if (reconnect) await this.options.onReconnect?.(client);
  }

  private handleDisconnect(connectionId: number): void {
    if (this.stopped || connectionId !== this.connectionId) return;
    this.client = undefined;
    this.reconnecting ??= this.reconnect().finally(() => {
      this.reconnecting = undefined;
    });
  }

  private async reconnect(): Promise<void> {
    let attempt = 0;
    while (!this.stopped && !this.client) {
      try {
        await this.connectOnce();
      } catch {
        attempt += 1;
        const delay = Math.min(this.options.retryMaxMs, this.options.retryBaseMs * 2 ** (attempt - 1));
        await (this.options.sleep ?? sleep)(delay);
      }
    }
  }
}

function sleep(delayMs: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}
