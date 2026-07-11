import { randomUUID } from 'node:crypto';
import net from 'node:net';
import { TELEGRAM_BROKER_PROTOCOL_VERSION, createBrokerMessageParser, encodeBrokerMessage } from './broker-protocol.js';
import type { TelegramBrokerClientMessage, TelegramBrokerServerMessage } from './broker-protocol.js';
import type { TelegramProjectRegistration } from './broker.js';

export interface TelegramBrokerClient {
  sendMessage(text: string): Promise<void>;
  close(): void;
}

export async function verifyTelegramRoundTripThroughBroker(options: {
  socketPath: string;
  threadId: number;
}): Promise<void> {
  const socket = net.createConnection(options.socketPath);
  const requestId = randomUUID();
  await new Promise<void>((resolve, reject) => {
    socket.on(
      'data',
      createBrokerMessageParser<TelegramBrokerServerMessage>(message => {
        if (message.type === 'verified' && message.requestId === requestId) {
          socket.end();
          resolve();
        } else if (message.type === 'error' && message.requestId === requestId) {
          socket.destroy();
          reject(new Error(message.message));
        }
      }),
    );
    socket.once('connect', () => {
      socket.write(encodeBrokerMessage({ version: 1, type: 'verify', requestId, threadId: options.threadId }));
    });
    socket.once('error', reject);
  });
}

export async function connectTelegramBrokerClient(options: {
  socketPath: string;
  registration: TelegramProjectRegistration;
  onMessage(text: string): void;
  onError?(error: Error): void;
}): Promise<TelegramBrokerClient> {
  const socket = net.createConnection(options.socketPath);
  let resolveRegistered: () => void = () => {};
  let rejectRegistered: (error: Error) => void = () => {};
  const registered = new Promise<void>((resolve, reject) => {
    resolveRegistered = resolve;
    rejectRegistered = reject;
  });
  const pendingSends = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();

  socket.on(
    'data',
    createBrokerMessageParser<TelegramBrokerServerMessage>(message => {
      if (message.version !== TELEGRAM_BROKER_PROTOCOL_VERSION) {
        const error = new Error('Unsupported Telegram broker protocol version.');
        rejectRegistered(error);
        options.onError?.(error);
        return;
      }
      if (message.type === 'registered') {
        resolveRegistered();
      } else if (message.type === 'message') {
        options.onMessage(message.text);
      } else if (message.type === 'sent') {
        pendingSends.get(message.requestId)?.resolve();
        pendingSends.delete(message.requestId);
      } else if (message.type === 'verified') {
        return;
      } else {
        const error = new Error(message.message);
        rejectRegistered(error);
        if (message.requestId) {
          pendingSends.get(message.requestId)?.reject(error);
          pendingSends.delete(message.requestId);
        }
        options.onError?.(error);
      }
    }),
  );
  socket.once('connect', () => {
    const message: TelegramBrokerClientMessage = {
      version: 1,
      type: 'register',
      registration: options.registration,
    };
    socket.write(encodeBrokerMessage(message));
  });
  socket.once('error', error => {
    rejectRegistered(error);
    for (const pending of pendingSends.values()) pending.reject(error);
    pendingSends.clear();
  });
  socket.on('close', () => {
    const error = new Error('Telegram broker connection closed.');
    for (const pending of pendingSends.values()) pending.reject(error);
    pendingSends.clear();
  });

  await registered;

  return {
    sendMessage: async text => {
      await new Promise<void>((resolve, reject) => {
        const requestId = randomUUID();
        pendingSends.set(requestId, { resolve, reject });
        const message: TelegramBrokerClientMessage = { version: 1, type: 'send', requestId, text };
        socket.write(encodeBrokerMessage(message), error => {
          if (!error) return;
          pendingSends.delete(requestId);
          reject(error);
        });
      });
    },
    close: () => socket.end(),
  };
}
