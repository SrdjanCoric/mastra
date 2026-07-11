import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createTelegramCliHandlers } from './entry.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';

describe('createTelegramCliHandlers', () => {
  it('refuses to start the TUI before isolated Telegram setup is ready', async () => {
    const importStockCli = vi.fn().mockResolvedValue(undefined);
    const handlers = createTelegramCliHandlers({
      homeDir: `/tmp/missing-mastracode-telegram-${process.pid}`,
      importStockCli,
    });

    await expect(handlers.startTui()).rejects.toThrow(
      'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.',
    );
    expect(importStockCli).not.toHaveBeenCalled();
  });

  it('starts the stock TUI with MastraCode-only skills after setup is ready', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mastracode-telegram-entry-'));
    const paths = resolveTelegramRuntimePaths(homeDir);
    fs.mkdirSync(paths.stateDir, { recursive: true });
    fs.writeFileSync(paths.readinessFile, '{}');
    const importStockCli = vi.fn().mockResolvedValue(undefined);
    const handlers = createTelegramCliHandlers({ homeDir, importStockCli });

    try {
      await handlers.startTui();

      expect(process.env.MASTRACODE_SKILLS_SCOPE).toBe('mastracode');
      expect(importStockCli).toHaveBeenCalledOnce();
    } finally {
      delete process.env.MASTRACODE_SKILLS_SCOPE;
      fs.rmSync(homeDir, { recursive: true, force: true });
    }
  });
});
