import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeTelegramProject } from './setup.js';
import type { TelegramSetupDependencies } from './setup.js';

const temporaryDirectories: string[] = [];

async function makeTemporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-setup-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
  );
});

function createDependencies(overrides: Partial<TelegramSetupDependencies> = {}): TelegramSetupDependencies {
  return {
    checkPrerequisites: vi.fn().mockResolvedValue(undefined),
    checkMastraCode: vi.fn().mockResolvedValue(undefined),
    inspectRepository: vi.fn().mockImplementation(async projectPath => ({
      canonicalPath: await fs.realpath(projectPath),
      authorName: 'Test User',
      authorEmail: 'test@example.com',
      hasGitHubRemote: true,
    })),
    checkGitHub: vi.fn().mockResolvedValue(undefined),
    syncSkills: vi.fn().mockResolvedValue(['mastra-workflow']),
    createTelegramClient: vi.fn().mockReturnValue({
      validateAuthorization: vi.fn().mockResolvedValue(undefined),
      createForumTopic: vi.fn().mockResolvedValue({ threadId: 42 }),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    }),
    now: () => new Date('2026-07-11T20:00:00.000Z'),
    ...overrides,
  };
}

const telegramEnv = {
  TELEGRAM_BOT_TOKEN: 'secret-token',
  TELEGRAM_ALLOWED_USER_ID: '123',
  TELEGRAM_GROUP_ID: '-100456',
};

describe('initializeTelegramProject', () => {
  it('persists isolated config, a canonical topic mapping, restrictive secrets, and readiness', async () => {
    const homeDir = await makeTemporaryDirectory();
    const projectPath = await makeTemporaryDirectory();
    const dependencies = createDependencies();

    const result = await initializeTelegramProject({ homeDir, projectPath, env: telegramEnv, dependencies });

    expect(result).toMatchObject({ projectPath: await fs.realpath(projectPath), threadId: 42, reusedTopic: false });
    const root = path.join(homeDir, '.mastracode-telegram');
    const secretsPath = path.join(root, 'config', 'secrets.json');
    const readiness = JSON.parse(await fs.readFile(path.join(root, 'state', 'ready.json'), 'utf8'));
    const registry = JSON.parse(await fs.readFile(path.join(root, 'state', 'projects.json'), 'utf8'));
    expect(readiness.projects).toEqual([
      expect.objectContaining({ projectPath: await fs.realpath(projectPath), threadId: 42, initialized: true }),
    ]);
    expect(registry.projects).toHaveLength(1);
    expect((await fs.stat(secretsPath)).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(readiness)).not.toContain('secret-token');
    expect(JSON.stringify(registry)).not.toContain('secret-token');
    await expect(fs.access(path.join(homeDir, '.mastracode-remote'))).rejects.toThrow();
  });

  it('reuses the project topic on rerun', async () => {
    const homeDir = await makeTemporaryDirectory();
    const projectPath = await makeTemporaryDirectory();
    const dependencies = createDependencies();

    await initializeTelegramProject({ homeDir, projectPath, env: telegramEnv, dependencies });
    const second = await initializeTelegramProject({ homeDir, projectPath, env: {}, dependencies });

    const client = dependencies.createTelegramClient({
      botToken: 'secret-token',
      allowedUserId: 123,
      groupId: -100456,
    });
    expect(second).toMatchObject({ threadId: 42, reusedTopic: true });
    expect(client.createForumTopic).toHaveBeenCalledOnce();
  });

  it('recovers a deleted topic without duplicating the project', async () => {
    const homeDir = await makeTemporaryDirectory();
    const projectPath = await makeTemporaryDirectory();
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Bad Request: message thread not found'))
      .mockResolvedValue(undefined);
    const createForumTopic = vi.fn().mockResolvedValueOnce({ threadId: 42 }).mockResolvedValueOnce({ threadId: 84 });
    const dependencies = createDependencies({
      createTelegramClient: vi.fn().mockReturnValue({ validateAuthorization: vi.fn(), createForumTopic, sendMessage }),
    });

    await initializeTelegramProject({ homeDir, projectPath, env: telegramEnv, dependencies });
    const result = await initializeTelegramProject({ homeDir, projectPath, env: {}, dependencies });

    expect(result).toMatchObject({ threadId: 84, reusedTopic: true, recoveredTopic: true });
    const registry = JSON.parse(
      await fs.readFile(path.join(homeDir, '.mastracode-telegram', 'state', 'projects.json'), 'utf8'),
    );
    expect(registry.projects).toHaveLength(1);
    expect(registry.projects[0].threadId).toBe(84);
  });

  it('stops on prerequisite, MastraCode, GitHub, and Telegram validation errors without writing readiness', async () => {
    const checks: Array<Partial<TelegramSetupDependencies>> = [
      {
        checkPrerequisites: vi
          .fn()
          .mockRejectedValue(new Error('Install Git, then rerun `mastracode-telegram --init`.')),
      },
      { checkMastraCode: vi.fn().mockRejectedValue(new Error('Run normal `mastracode` first.')) },
      { checkGitHub: vi.fn().mockRejectedValue(new Error('Run `gh auth login`, then rerun init.')) },
      {
        createTelegramClient: vi.fn().mockReturnValue({
          validateAuthorization: vi
            .fn()
            .mockRejectedValue(new Error('Telegram bot cannot access the configured group.')),
          createForumTopic: vi.fn(),
          sendMessage: vi.fn(),
        }),
      },
    ];

    for (const override of checks) {
      const homeDir = await makeTemporaryDirectory();
      const projectPath = await makeTemporaryDirectory();
      await expect(
        initializeTelegramProject({
          homeDir,
          projectPath,
          env: telegramEnv,
          dependencies: createDependencies(override),
        }),
      ).rejects.toThrow();
      await expect(fs.access(path.join(homeDir, '.mastracode-telegram', 'state', 'ready.json'))).rejects.toThrow();
    }
  });

  it('resumes after a later GitHub failure using the saved validated credentials', async () => {
    const homeDir = await makeTemporaryDirectory();
    const projectPath = await makeTemporaryDirectory();
    const dependencies = createDependencies();
    const checkGitHub = vi.mocked(dependencies.checkGitHub);
    checkGitHub.mockRejectedValueOnce(new Error('Run `gh auth login`, then rerun init.')).mockResolvedValue(undefined);

    await expect(initializeTelegramProject({ homeDir, projectPath, env: telegramEnv, dependencies })).rejects.toThrow(
      'gh auth login',
    );
    await expect(initializeTelegramProject({ homeDir, projectPath, env: {}, dependencies })).resolves.toMatchObject({
      threadId: 42,
    });
  });

  it('never invokes service or launchd behavior', async () => {
    const homeDir = await makeTemporaryDirectory();
    const projectPath = await makeTemporaryDirectory();
    const dependencies = createDependencies();

    await initializeTelegramProject({ homeDir, projectPath, env: telegramEnv, dependencies });

    expect(Object.keys(dependencies).some(key => /launchd|service/i.test(key))).toBe(false);
  });
});
