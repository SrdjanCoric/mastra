import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkGitHubReadiness,
  checkMastraCodeReadiness,
  checkSystemPrerequisites,
  inspectGitRepository,
} from './system-checks.js';
import type { SystemCommandRunner } from './system-checks.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-system-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('Telegram setup system checks', () => {
  it('reports a missing GitHub CLI with a corrective command', async () => {
    const runner: SystemCommandRunner = vi.fn().mockImplementation(async command => {
      if (command === 'gh') throw new Error('not found');
      return 'git version 2';
    });

    await expect(checkSystemPrerequisites(runner)).rejects.toThrow('Install GitHub CLI');
  });

  it('requires Git author identity and detects a GitHub remote', async () => {
    const projectPath = await temporaryDirectory();
    const missingAuthor: SystemCommandRunner = vi.fn().mockImplementation(async (_command, args) => {
      if (args[0] === 'rev-parse') return projectPath;
      if (args.join(' ') === 'config user.email') return 'test@example.com';
      return '';
    });

    await expect(inspectGitRepository(projectPath, missingAuthor)).rejects.toThrow('Git author identity is missing');

    const ready: SystemCommandRunner = vi.fn().mockImplementation(async (_command, args) => {
      if (args[0] === 'rev-parse') return projectPath;
      if (args.join(' ') === 'config user.name') return 'Test User';
      if (args.join(' ') === 'config user.email') return 'test@example.com';
      return 'origin\thttps://github.com/example/project.git (fetch)';
    });
    await expect(inspectGitRepository(projectPath, ready)).resolves.toMatchObject({ hasGitHubRemote: true });
  });

  it('requires an authenticated GitHub CLI and accepts provider auth from the environment', async () => {
    const repository = {
      canonicalPath: '/tmp/project',
      authorName: 'Test User',
      authorEmail: 'test@example.com',
      hasGitHubRemote: true,
    };
    const runner: SystemCommandRunner = vi.fn().mockRejectedValue(new Error('not logged in'));

    await expect(checkGitHubReadiness(repository, runner)).rejects.toThrow('gh auth login');
    await expect(checkMastraCodeReadiness({ OPENAI_API_KEY: 'configured' })).resolves.toBeUndefined();
  });
});
