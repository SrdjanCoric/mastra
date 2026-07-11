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
  let resolveDone: () => void = () => {};
  const done = new Promise<void>(resolve => {
    resolveDone = resolve;
  });

  const server = net.createServer(socket => {
    acceptedClient = true;
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = undefined;
    }
    const clientId = randomUUID();
    let registered = false;
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
          options.broker.register(clientId, message.registration, delivery => {
            send({ version: 1, type: 'message', text: delivery.text });
          });
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
  if (message.type === 'verify') {
    return typeof message.requestId === 'string' && Number.isSafeInteger(message.threadId);
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
