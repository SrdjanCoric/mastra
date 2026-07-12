import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createTelegramDiagnosticLogger } from './broker-diagnostics.js';

const cleanupPaths: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupPaths.splice(0).map(target => fs.rm(target, { recursive: true, force: true })));
});

describe('createTelegramDiagnosticLogger', () => {
  it('writes structured metadata without message or transcript content', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-log-'));
    cleanupPaths.push(directory);
    const logPath = path.join(directory, 'broker.log');
    const logger = createTelegramDiagnosticLogger(logPath, () => new Date('2026-07-12T00:00:00.000Z'));

    logger.write({ type: 'poll_error', attempt: 2, errorCode: 'ECONNRESET' });
    await logger.flush();

    expect(await fs.readFile(logPath, 'utf8')).toBe(
      '{"timestamp":"2026-07-12T00:00:00.000Z","type":"poll_error","attempt":2,"errorCode":"ECONNRESET"}\n',
    );
    expect((await fs.stat(logPath)).mode & 0o777).toBe(0o600);
  });
});
