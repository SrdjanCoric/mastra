import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { prepareGuidedProjectRepository } from './project-setup.js';
import type { SystemCommandRunner } from './system-checks.js';

const temporaryDirectories: string[] = [];

async function temporaryProject(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'tracker-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('prepareGuidedProjectRepository', () => {
  it('offers to initialize Git, configure author identity, and create a private GitHub repository', async () => {
    const projectPath = await temporaryProject();
    const canonicalPath = await fs.realpath(projectPath);
    let initialized = false;
    const runner: SystemCommandRunner = vi.fn(async (command, args) => {
      const invocation = `${command} ${args.join(' ')}`;
      if (invocation === 'git rev-parse --show-toplevel') {
        if (!initialized) throw new Error('not a repository');
        return projectPath;
      }
      if (invocation === 'git init') {
        initialized = true;
        return 'Initialized empty Git repository';
      }
      if (invocation === 'git config user.name' || invocation === 'git config user.email') return '';
      if (invocation.startsWith('git config user.')) return '';
      if (invocation === 'git remote -v' || invocation === 'git remote') return '';
      if (invocation === 'gh --version') return 'gh version 2';
      if (invocation === 'gh auth status') return 'authenticated';
      if (invocation.startsWith('gh repo create')) return '';
      throw new Error(`Unexpected command: ${invocation}`);
    });
    const prompter = {
      ask: vi
        .fn()
        .mockResolvedValueOnce('Test User')
        .mockResolvedValueOnce('test@example.com')
        .mockResolvedValueOnce('tracker'),
      confirm: vi.fn().mockResolvedValue(true),
      choose: vi.fn().mockResolvedValue('private'),
    };
    const output: string[] = [];

    await expect(
      prepareGuidedProjectRepository({
        projectPath,
        prompter,
        write: message => output.push(message),
        runner,
      }),
    ).resolves.toBe(canonicalPath);

    expect(prompter.confirm).toHaveBeenNthCalledWith(
      1,
      'This directory is not a Git repository. Initialize it now?',
      true,
    );
    expect(prompter.confirm).toHaveBeenNthCalledWith(2, 'No GitHub remote is configured. Create one now?', true);
    expect(prompter.choose).toHaveBeenCalledWith(
      'GitHub repository visibility',
      [
        { value: 'private', label: 'Private', hint: 'Only you and invited collaborators can access it' },
        { value: 'public', label: 'Public', hint: 'Anyone can view it' },
      ],
      'private',
    );
    expect(runner).toHaveBeenCalledWith('git', ['init'], projectPath);
    expect(runner).toHaveBeenCalledWith('git', ['config', 'user.name', 'Test User'], canonicalPath);
    expect(runner).toHaveBeenCalledWith('git', ['config', 'user.email', 'test@example.com'], canonicalPath);
    expect(runner).toHaveBeenCalledWith(
      'gh',
      ['repo', 'create', 'tracker', '--private', '--source', canonicalPath, '--remote', 'origin'],
      canonicalPath,
    );
    expect(output).toContain('GitHub: created tracker as private and configured remote origin.');
  });

  it('allows the user to choose a public GitHub repository', async () => {
    const projectPath = await temporaryProject();
    const canonicalPath = await fs.realpath(projectPath);
    const runner: SystemCommandRunner = vi.fn(async (command, args) => {
      const invocation = `${command} ${args.join(' ')}`;
      if (invocation === 'git rev-parse --show-toplevel') return projectPath;
      if (invocation === 'git config user.name') return 'Test User';
      if (invocation === 'git config user.email') return 'test@example.com';
      if (invocation === 'git remote -v' || invocation === 'git remote') return '';
      if (invocation === 'gh --version') return 'gh version 2';
      if (invocation === 'gh auth status') return 'authenticated';
      if (invocation.startsWith('gh repo create')) return '';
      throw new Error(`Unexpected command: ${invocation}`);
    });
    const prompter = {
      ask: vi.fn().mockResolvedValue('tracker-web'),
      confirm: vi.fn().mockResolvedValue(true),
      choose: vi.fn().mockResolvedValue('public'),
    };

    await prepareGuidedProjectRepository({ projectPath, prompter, write: vi.fn(), runner });

    expect(prompter.choose).toHaveBeenCalledWith(
      'GitHub repository visibility',
      expect.arrayContaining([
        expect.objectContaining({ value: 'private', label: 'Private' }),
        expect.objectContaining({ value: 'public', label: 'Public' }),
      ]),
      'private',
    );
    expect(runner).toHaveBeenCalledWith(
      'gh',
      ['repo', 'create', 'tracker-web', '--public', '--source', canonicalPath, '--remote', 'origin'],
      canonicalPath,
    );
  });

  it('does not modify project Git state during non-interactive initialization', async () => {
    const runner: SystemCommandRunner = vi.fn();

    await expect(prepareGuidedProjectRepository({ projectPath: '/tmp/tracker', write: vi.fn(), runner })).resolves.toBe(
      '/tmp/tracker',
    );
    expect(runner).not.toHaveBeenCalled();
  });
});
