import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { TELEGRAM_BROKER_PROTOCOL_VERSION, createBrokerMessageParser, encodeBrokerMessage } from './broker-protocol.js';
import type { TelegramBrokerClientMessage, TelegramBrokerServerMessage } from './broker-protocol.js';
import type { TelegramBroker } from './broker.js';

export interface TelegramBrokerServerHandle {
  done: Promise<void>;
  close(): Promise<void>;
  isClosed(): boolean;
}

export async function startTelegramBrokerServer(options: {
  socketPath: string;
  broker: TelegramBroker;
  shutdownGraceMs?: number;
}): Promise<TelegramBrokerServerHandle> {
  const shutdownGraceMs = options.shutdownGraceMs ?? 1_000;
  let closed = false;
  let acceptedClient = false;
  let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
  const sockets = new Set<net.Socket>();
  let resolveDone: () => void = () => {};
  const done = new Promise<void>(resolve => {
    resolveDone = resolve;
  });

  const server = net.createServer(socket => {
    acceptedClient = true;
    sockets.add(socket);
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = undefined;
    }
    const clientId = randomUUID();
    let registered = false;
    const pendingDeliveries = new Map<string, { resolve(): void; reject(error: Error): void }>();
    const send = (message: TelegramBrokerServerMessage) => socket.write(encodeBrokerMessage(message));
    const rejectInvalidMessage = () => {
      send({ version: 1, type: 'error', message: 'Invalid Telegram broker message.' });
      socket.destroySoon();
    };
    const parse = createBrokerMessageParser<unknown>(message => {
      if (!isRecord(message) || typeof message.version !== 'number') {
        rejectInvalidMessage();
        return;
      }
      if (message.version !== TELEGRAM_BROKER_PROTOCOL_VERSION) {
        send({ version: 1, type: 'error', message: 'Unsupported Telegram broker protocol version.' });
        socket.destroy();
        return;
      }
      if (!isTelegramBrokerClientMessage(message)) {
        rejectInvalidMessage();
        return;
      }
      if (message.type === 'register') {
        if (registered) {
          send({ version: 1, type: 'error', message: 'Telegram broker client is already registered.' });
          return;
        }
        try {
          options.broker.register(
            clientId,
            message.registration,
            delivery =>
              new Promise<void>((resolve, reject) => {
                const deliveryId = randomUUID();
                pendingDeliveries.set(deliveryId, { resolve, reject });
                socket.write(
                  encodeBrokerMessage({
                    version: 1,
                    type: 'message',
                    deliveryId,
                    text: delivery.text,
                    ...(delivery.replyToMessageId === undefined ? {} : { replyToMessageId: delivery.replyToMessageId }),
                    ...(delivery.promptId === undefined ? {} : { promptId: delivery.promptId }),
                  }),
                  error => {
                    if (!error) return;
                    pendingDeliveries.delete(deliveryId);
                    reject(error);
                  },
                );
              }),
          );
          registered = true;
          send({ version: 1, type: 'registered' });
        } catch (error) {
          send({
            version: 1,
            type: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
          socket.destroySoon();
        }
        return;
      }
      if (message.type === 'verify') {
        void options.broker.verifyRoundTrip(message.threadId).then(
          () => send({ version: 1, type: 'verified', requestId: message.requestId }),
          error => {
            send({
              version: 1,
              type: 'error',
              requestId: message.requestId,
              message: error instanceof Error ? error.message : String(error),
            });
          },
        );
        return;
      }
      if (!registered) {
        send({ version: 1, type: 'error', message: 'Register the Telegram project before sending messages.' });
        return;
      }
      if (message.type === 'ack_delivery') {
        pendingDeliveries.get(message.deliveryId)?.resolve();
        pendingDeliveries.delete(message.deliveryId);
        return;
      }
      if (message.type === 'send_prompt') {
        void options.broker.sendProjectPrompt(clientId, message.prompt).then(
          result => send({ version: 1, type: 'sent', requestId: message.requestId, messageId: result.messageId }),
          error => {
            send({
              version: 1,
              type: 'error',
              requestId: message.requestId,
              message: error instanceof Error ? error.message : String(error),
            });
          },
        );
        return;
      }
      void options.broker.sendProjectMessage(clientId, message.text).then(
        () => send({ version: 1, type: 'sent', requestId: message.requestId }),
        error => {
          send({
            version: 1,
            type: 'error',
            requestId: message.requestId,
            message: error instanceof Error ? error.message : String(error),
          });
        },
      );
    }, rejectInvalidMessage);
    socket.on('data', parse);
    socket.on('close', () => {
      sockets.delete(socket);
      const error = new Error('Telegram TUI disconnected before acknowledging the delivered instruction.');
      for (const pending of pendingDeliveries.values()) pending.reject(error);
      pendingDeliveries.clear();
      options.broker.unregister(clientId);
      if (acceptedClient && options.broker.clientCount === 0 && !closed) {
        shutdownTimer = setTimeout(() => {
          void close();
        }, shutdownGraceMs);
      }
    });
  });

  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    if (shutdownTimer) clearTimeout(shutdownTimer);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    await fs.rm(options.socketPath, { force: true });
    resolveDone();
  };

  await fs.mkdir(path.dirname(options.socketPath), { recursive: true });
  await fs.rm(options.socketPath, { force: true });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.socketPath, () => {
      server.off('error', reject);
      resolve();
    });
  });
  await fs.chmod(options.socketPath, 0o600);

  return { done, close, isClosed: () => closed };
}

function isTelegramBrokerClientMessage(message: unknown): message is TelegramBrokerClientMessage {
  if (!isRecord(message) || message.version !== TELEGRAM_BROKER_PROTOCOL_VERSION || typeof message.type !== 'string') {
    return false;
  }
  if (message.type === 'register') {
    return (
      isRecord(message.registration) &&
      typeof message.registration.projectPath === 'string' &&
      Number.isSafeInteger(message.registration.threadId)
    );
  }
  if (message.type === 'send') {
    return typeof message.requestId === 'string' && typeof message.text === 'string';
  }
  if (message.type === 'send_prompt') {
    return (
      typeof message.requestId === 'string' &&
      isRecord(message.prompt) &&
      typeof message.prompt.promptId === 'string' &&
      (message.prompt.kind === 'approval' || message.prompt.kind === 'question') &&
      typeof message.prompt.title === 'string' &&
      typeof message.prompt.summary === 'string'
    );
  }
  if (message.type === 'verify') {
    return typeof message.requestId === 'string' && Number.isSafeInteger(message.threadId);
  }
  if (message.type === 'ack_delivery') {
    return typeof message.deliveryId === 'string';
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
