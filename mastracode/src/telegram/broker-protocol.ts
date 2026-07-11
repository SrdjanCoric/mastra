import type { TelegramProjectRegistration } from './broker.js';

export const TELEGRAM_BROKER_PROTOCOL_VERSION = 1;

export type TelegramBrokerClientMessage =
  | { version: 1; type: 'register'; registration: TelegramProjectRegistration }
  | { version: 1; type: 'send'; requestId: string; text: string }
  | { version: 1; type: 'verify'; requestId: string; threadId: number };

export type TelegramBrokerServerMessage =
  | { version: 1; type: 'registered' }
  | { version: 1; type: 'sent'; requestId: string }
  | { version: 1; type: 'verified'; requestId: string }
  | { version: 1; type: 'message'; text: string }
  | { version: 1; type: 'error'; message: string; requestId?: string };

export function encodeBrokerMessage(message: TelegramBrokerClientMessage | TelegramBrokerServerMessage): string {
  return `${JSON.stringify(message)}\n`;
}

export function createBrokerMessageParser<T>(
  onMessage: (message: T) => void,
  onError: (error: Error) => void = () => {},
): (chunk: Buffer) => void {
  let buffered = '';
  return chunk => {
    buffered += chunk.toString('utf8');
    let newline = buffered.indexOf('\n');
    while (newline >= 0) {
      const line = buffered.slice(0, newline);
      buffered = buffered.slice(newline + 1);
      if (line.trim()) {
        try {
          onMessage(JSON.parse(line) as T);
        } catch (error) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
      newline = buffered.indexOf('\n');
    }
  };
}
