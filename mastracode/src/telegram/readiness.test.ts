import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { assertTelegramInitialized } from './readiness.js';

describe('assertTelegramInitialized', () => {
  it('gives actionable setup guidance when Telegram is not initialized', () => {
    const readinessFile = path.join(os.tmpdir(), `missing-mastracode-telegram-${process.pid}`, 'ready.json');

    expect(() => assertTelegramInitialized(readinessFile)).toThrow(
      'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.',
    );
  });
});
