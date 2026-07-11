import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareGuidedTelegramInit } from './guided-init.js';

const temporaryDirectories: string[] = [];

async function temporaryHome(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-guided-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('prepareGuidedTelegramInit', () => {
  it('confirms the selected project and prompts for missing Telegram settings with a hidden token', async () => {
    const homeDir = await temporaryHome();
    const ask = vi.fn().mockResolvedValueOnce('').mockResolvedValueOnce('123').mockResolvedValueOnce('-100456');
    const askHidden = vi.fn().mockResolvedValue('secret-token');
    const output: string[] = [];

    const result = await prepareGuidedTelegramInit({
      homeDir,
      projectPath: '/tmp/project',
      env: {},
      prompter: { ask, askHidden },
      write: message => output.push(message),
    });

    expect(result.confirmed).toBe(true);
    expect(result.env).toMatchObject({
      TELEGRAM_BOT_TOKEN: 'secret-token',
      TELEGRAM_ALLOWED_USER_ID: '123',
      TELEGRAM_GROUP_ID: '-100456',
    });
    expect(askHidden).toHaveBeenCalledWith('Telegram bot token: ');
    expect(output.join('\n')).toContain('Guided Telegram setup');
    expect(output.join('\n')).not.toContain('secret-token');
  });

  it('reuses saved configuration without asking for credentials', async () => {
    const homeDir = await temporaryHome();
    const configDir = path.join(homeDir, '.mastracode-telegram', 'config');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'settings.json'), JSON.stringify({ allowedUserId: 123, groupId: -100456 }));
    await fs.writeFile(path.join(configDir, 'secrets.json'), JSON.stringify({ botToken: 'secret-token' }));
    const ask = vi.fn().mockResolvedValue('');
    const output: string[] = [];

    const result = await prepareGuidedTelegramInit({
      homeDir,
      projectPath: '/tmp/project',
      env: {},
      prompter: { ask },
      write: message => output.push(message),
    });

    expect(result.confirmed).toBe(true);
    expect(ask).toHaveBeenCalledOnce();
    expect(output).toContain('Telegram: reusing saved configuration.');
  });

  it('allows the user to cancel before making changes', async () => {
    const homeDir = await temporaryHome();
    const result = await prepareGuidedTelegramInit({
      homeDir,
      projectPath: '/tmp/wrong-project',
      env: {},
      prompter: { ask: vi.fn().mockResolvedValue('n') },
      write: vi.fn(),
    });

    expect(result.confirmed).toBe(false);
  });
});
