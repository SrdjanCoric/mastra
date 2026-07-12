import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { createTelegramCliHandlers } from './entry.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';

describe('createTelegramCliHandlers', () => {
  it('prints package help without reading Telegram readiness', () => {
    const output: string[] = [];
    const handlers = createTelegramCliHandlers({
      homeDir: `/tmp/missing-mastracode-telegram-${process.pid}`,
      write: message => output.push(message),
    });

    handlers.showHelp();

    expect(output).toContain('MastraCode Remote');
    expect(output).toContain('  mastracode-remote --init   Initialize Telegram for the current project');
  });

  it('refuses to start the TUI before isolated Telegram setup is ready', async () => {
    const importStockCli = vi.fn().mockResolvedValue(undefined);
    const handlers = createTelegramCliHandlers({
      homeDir: `/tmp/missing-mastracode-telegram-${process.pid}`,
      importStockCli,
    });

    await expect(handlers.startTui()).rejects.toThrow(
      'Telegram is not initialized. Run `mastracode-remote --init` from this project first.',
    );
    expect(importStockCli).not.toHaveBeenCalled();
  });

  it('prints a concise guided setup summary', async () => {
    const output: string[] = [];
    const initializeProject = vi.fn().mockResolvedValue({
      projectPath: '/tmp/project',
      threadId: 42,
      reusedTopic: false,
      recoveredTopic: false,
      skills: ['mastra-workflow'],
    });
    const handlers = createTelegramCliHandlers({
      homeDir: '/tmp/home',
      projectPath: '/tmp/project',
      env: {
        TELEGRAM_BOT_TOKEN: 'secret-token',
        TELEGRAM_ALLOWED_USER_ID: '123',
        TELEGRAM_GROUP_ID: '-100456',
      },
      prompter: false,
      initializeProject,
      write: message => output.push(message),
    });

    await handlers.initialize();

    expect(initializeProject).toHaveBeenCalledOnce();
    expect(output).toContain('Topic: 42 (created)');
    expect(output).toContain('Next: run `mastracode-remote` from this project.');
    expect(output.join('\n')).not.toContain('secret-token');
  });

  it('starts the stock TUI with MastraCode-only skills after setup is ready', async () => {
    const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mastracode-telegram-entry-'));
    const paths = resolveTelegramRuntimePaths(homeDir);
    fs.mkdirSync(paths.stateDir, { recursive: true });
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'mastracode-telegram-project-'));
    fs.writeFileSync(
      paths.readinessFile,
      JSON.stringify({
        schemaVersion: 1,
        projects: [
          {
            projectPath: fs.realpathSync(projectPath),
            threadId: 42,
            initialized: true,
            checkedAt: '2026-07-11T20:00:00.000Z',
          },
        ],
      }),
    );
    const importStockCli = vi.fn().mockResolvedValue(undefined);
    const handlers = createTelegramCliHandlers({ homeDir, projectPath, importStockCli });

    try {
      await handlers.startTui();

      expect(process.env.MASTRACODE_SKILLS_SCOPE).toBe('mastracode');
      expect(process.env.MASTRACODE_TELEGRAM_ENABLED).toBe('1');
      expect(importStockCli).toHaveBeenCalledOnce();
    } finally {
      delete process.env.MASTRACODE_SKILLS_SCOPE;
      delete process.env.MASTRACODE_TELEGRAM_ENABLED;
      fs.rmSync(homeDir, { recursive: true, force: true });
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  });
});
