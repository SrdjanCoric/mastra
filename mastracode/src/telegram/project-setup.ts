import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import type { TelegramInitPrompter } from './guided-init.js';
import type { SystemCommandRunner } from './system-checks.js';

const execFileAsync = promisify(execFile);

export async function prepareGuidedProjectRepository(options: {
  projectPath: string;
  prompter?: TelegramInitPrompter;
  write: (message: string) => void;
  runner?: SystemCommandRunner;
}): Promise<string> {
  if (!options.prompter) return options.projectPath;
  const runner = options.runner ?? run;
  let repositoryRoot = await detectRepositoryRoot(options.projectPath, runner);

  if (!repositoryRoot) {
    const initialize = await confirm(
      options.prompter,
      'This directory is not a Git repository. Initialize it now? [Y/n]: ',
    );
    if (!initialize) throw new Error('Git repository setup was cancelled.');
    await runner('git', ['init'], options.projectPath);
    repositoryRoot = await detectRepositoryRoot(options.projectPath, runner);
    if (!repositoryRoot) throw new Error('Git initialized, but its repository root could not be detected.');
    options.write(`Git: initialized ${repositoryRoot}.`);
  }

  const canonicalPath = await fs.realpath(repositoryRoot);
  await ensureGitAuthor(canonicalPath, options.prompter, runner, options.write);

  const remotes = await runner('git', ['remote', '-v'], canonicalPath);
  if (/(?:git@github\.com:|https:\/\/github\.com\/)/.test(remotes)) return canonicalPath;

  const create = await confirm(
    options.prompter,
    'No GitHub remote is configured. Create a GitHub repository now? [Y/n]: ',
  );
  if (!create) throw new Error('A GitHub remote is required to initialize MastraCode Telegram.');

  try {
    await runner('gh', ['auth', 'status'], canonicalPath);
  } catch {
    throw new Error('GitHub authentication is missing. Run `gh auth login`, then rerun init.');
  }

  const defaultName = path.basename(canonicalPath);
  const repositoryName =
    (await options.prompter.ask(`GitHub repository name [${defaultName}]: `)).trim() || defaultName;
  const visibilityAnswer = (
    await options.prompter.ask('GitHub repository visibility, private or public [private]: ')
  ).toLowerCase();
  const visibility = visibilityAnswer || 'private';
  if (visibility !== 'private' && visibility !== 'public') {
    throw new Error('GitHub repository visibility must be `private` or `public`.');
  }

  const remoteNames = await runner('git', ['remote'], canonicalPath);
  const remoteName = remoteNames.split(/\s+/).includes('origin') ? 'github' : 'origin';
  await runner(
    'gh',
    ['repo', 'create', repositoryName, `--${visibility}`, '--source', canonicalPath, '--remote', remoteName],
    canonicalPath,
  );
  options.write(`GitHub: created ${repositoryName} as ${visibility} and configured remote ${remoteName}.`);
  return canonicalPath;
}

async function ensureGitAuthor(
  repositoryPath: string,
  prompter: TelegramInitPrompter,
  runner: SystemCommandRunner,
  write: (message: string) => void,
): Promise<void> {
  const authorName = await optionalCommand(runner, 'git', ['config', 'user.name'], repositoryPath);
  const authorEmail = await optionalCommand(runner, 'git', ['config', 'user.email'], repositoryPath);
  if (authorName && authorEmail) return;

  const name = authorName || (await prompter.ask('Git author name: ')).trim();
  const email = authorEmail || (await prompter.ask('Git author email: ')).trim();
  if (!name || !email) throw new Error('Git author name and email are required.');
  if (!authorName) await runner('git', ['config', 'user.name', name], repositoryPath);
  if (!authorEmail) await runner('git', ['config', 'user.email', email], repositoryPath);
  write('Git: configured author identity for this repository.');
}

async function detectRepositoryRoot(projectPath: string, runner: SystemCommandRunner): Promise<string | undefined> {
  return optionalCommand(runner, 'git', ['rev-parse', '--show-toplevel'], projectPath);
}

async function optionalCommand(
  runner: SystemCommandRunner,
  command: string,
  args: string[],
  cwd: string,
): Promise<string | undefined> {
  try {
    return (await runner(command, args, cwd)).trim() || undefined;
  } catch {
    return undefined;
  }
}

async function confirm(prompter: TelegramInitPrompter, question: string): Promise<boolean> {
  const answer = (await prompter.ask(question)).trim();
  return answer === '' || /^[Yy]/.test(answer);
}

async function run(command: string, args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { encoding: 'utf8', ...(cwd ? { cwd } : {}) });
  return stdout.trim();
}
