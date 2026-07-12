import { randomUUID } from 'node:crypto';
import net from 'node:net';
import { TELEGRAM_BROKER_PROTOCOL_VERSION, createBrokerMessageParser, encodeBrokerMessage } from './broker-protocol.js';
import type { TelegramBrokerClientMessage, TelegramBrokerServerMessage } from './broker-protocol.js';
import type { TelegramProjectRegistration, TelegramPrompt } from './broker.js';

export interface TelegramBrokerIncomingMessage {
  text: string;
  replyToMessageId?: number;
  promptId?: string;
}

export interface TelegramBrokerClient {
  sendMessage(text: string): Promise<void>;
  sendPrompt(prompt: TelegramPrompt): Promise<{ messageId: number }>;
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
  onMessage(message: TelegramBrokerIncomingMessage): Promise<void> | void;
  onError?(error: Error): void;
  onDisconnect?(): void;
}): Promise<TelegramBrokerClient> {
  const socket = net.createConnection(options.socketPath);
  let intentionallyClosed = false;
  let resolveRegistered: () => void = () => {};
  let rejectRegistered: (error: Error) => void = () => {};
  const registered = new Promise<void>((resolve, reject) => {
    resolveRegistered = resolve;
    rejectRegistered = reject;
  });
  const pendingSends = new Map<
    string,
    { resolve: (messageId: number | undefined) => void; reject: (error: Error) => void }
  >();

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
        void Promise.resolve(
          options.onMessage({
            text: message.text,
            ...(message.replyToMessageId === undefined ? {} : { replyToMessageId: message.replyToMessageId }),
            ...(message.promptId === undefined ? {} : { promptId: message.promptId }),
          }),
        ).then(
          () => {
            socket.write(encodeBrokerMessage({ version: 1, type: 'ack_delivery', deliveryId: message.deliveryId }));
          },
          error => {
            options.onError?.(error instanceof Error ? error : new Error(String(error)));
            socket.destroy();
          },
        );
      } else if (message.type === 'sent') {
        pendingSends.get(message.requestId)?.resolve(message.messageId);
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
    if (!intentionallyClosed) options.onDisconnect?.();
  });

  await registered;

  const sendRequest = (message: TelegramBrokerClientMessage & { requestId: string }): Promise<number | undefined> =>
    new Promise((resolve, reject) => {
      pendingSends.set(message.requestId, { resolve, reject });
      socket.write(encodeBrokerMessage(message), error => {
        if (!error) return;
        pendingSends.delete(message.requestId);
        reject(error);
      });
    });

  return {
    sendMessage: async text => {
      await sendRequest({ version: 1, type: 'send', requestId: randomUUID(), text });
    },
    sendPrompt: async prompt => {
      const messageId = await sendRequest({ version: 1, type: 'send_prompt', requestId: randomUUID(), prompt });
      if (messageId === undefined) throw new Error('Telegram broker did not return the prompt message ID.');
      return { messageId };
    },
    close: () => {
      intentionallyClosed = true;
      socket.end();
    },
  };
}
