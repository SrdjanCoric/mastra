import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertTelegramInitialized } from './readiness.js';

describe('assertTelegramInitialized', () => {
  it('gives actionable setup guidance when Telegram is not initialized', () => {
    const readinessFile = path.join(os.tmpdir(), `missing-mastracode-telegram-${process.pid}`, 'ready.json');

    expect(() => assertTelegramInitialized(readinessFile, process.cwd())).toThrow(
      'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.',
    );
  });

  it('rejects a marker that does not prove setup completed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mastracode-telegram-readiness-'));
    const readinessFile = path.join(directory, 'ready.json');
    fs.writeFileSync(readinessFile, '{}');

    try {
      expect(() => assertTelegramInitialized(readinessFile, process.cwd())).toThrow(
        'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.',
      );
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
