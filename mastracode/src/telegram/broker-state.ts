import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface TelegramBrokerState {
  nextOffset?: number;
  processedUpdateIds: number[];
  unprocessedByThread: Record<string, number>;
}

export interface TelegramBrokerStateStore {
  load(): Promise<TelegramBrokerState>;
  save(state: TelegramBrokerState): Promise<void>;
}

const EMPTY_STATE: TelegramBrokerState = {
  processedUpdateIds: [],
  unprocessedByThread: {},
};

export class FileTelegramBrokerStateStore implements TelegramBrokerStateStore {
  constructor(private readonly statePath: string) {}

  async load(): Promise<TelegramBrokerState> {
    let contents: string;
    try {
      contents = await fs.readFile(this.statePath, 'utf8');
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) return structuredClone(EMPTY_STATE);
      throw error;
    }

    try {
      return parseBrokerState(JSON.parse(contents));
    } catch {
      throw new Error(`Telegram broker state is corrupted: ${this.statePath}. Remove it and rerun init.`);
    }
  }

  async save(state: TelegramBrokerState): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.statePath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(state)}\n`, { mode: 0o600 });
      await fs.rename(temporaryPath, this.statePath);
      await fs.chmod(this.statePath, 0o600);
    } finally {
      await fs.rm(temporaryPath, { force: true });
    }
  }
}

function parseBrokerState(value: unknown): TelegramBrokerState {
  if (!isRecord(value)) throw new Error('invalid broker state');
  const nextOffset = value.nextOffset;
  if (nextOffset !== undefined && (!Number.isSafeInteger(nextOffset) || Number(nextOffset) < 0)) {
    throw new Error('invalid broker offset');
  }
  if (!Array.isArray(value.processedUpdateIds) || !value.processedUpdateIds.every(Number.isSafeInteger)) {
    throw new Error('invalid processed update IDs');
  }
  if (!isRecord(value.unprocessedByThread)) throw new Error('invalid unprocessed update counts');
  const unprocessedByThread: Record<string, number> = {};
  for (const [threadId, count] of Object.entries(value.unprocessedByThread)) {
    if (!/^\d+$/.test(threadId) || !Number.isSafeInteger(count) || Number(count) < 1) {
      throw new Error('invalid unprocessed update count');
    }
    unprocessedByThread[threadId] = Number(count);
  }
  return {
    ...(nextOffset === undefined ? {} : { nextOffset: Number(nextOffset) }),
    processedUpdateIds: value.processedUpdateIds.map(Number),
    unprocessedByThread,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}
