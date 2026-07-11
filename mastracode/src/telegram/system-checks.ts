import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface InspectedRepository {
  canonicalPath: string;
  authorName: string;
  authorEmail: string;
  hasGitHubRemote: boolean;
}

export async function checkSystemPrerequisites(): Promise<void> {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error('Install Node 22 or newer, then rerun `mastracode-telegram --init`.');
  }
  if (!(await commandExists('git', ['--version']))) {
    throw new Error('Install Git, then rerun `mastracode-telegram --init`.');
  }
  if (!(await commandExists('gh', ['--version']))) {
    throw new Error('Install GitHub CLI, run `gh auth login`, then rerun `mastracode-telegram --init`.');
  }
}

export async function checkMastraCodeReadiness(env: NodeJS.ProcessEnv): Promise<void> {
  const envHasAuth = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'].some(name =>
    env[name]?.trim(),
  );
  if (envHasAuth) return;

  try {
    const { createAuthStorage } = await import('../index.js');
    const storage = createAuthStorage();
    const ready = ['anthropic', 'openai', 'google', 'copilot'].some(
      provider => storage.isLoggedIn(provider) || storage.hasStoredApiKey(provider),
    );
    if (ready) return;
  } catch {}

  throw new Error(
    'MastraCode provider setup was not detected. Run normal `mastracode`, complete provider login and model setup, then rerun `mastracode-telegram --init`.',
  );
}

export async function inspectGitRepository(projectPath: string): Promise<InspectedRepository> {
  try {
    const root = await run('git', ['rev-parse', '--show-toplevel'], projectPath);
    const canonicalPath = await fs.realpath(root);
    const [authorName, authorEmail, remotes] = await Promise.all([
      run('git', ['config', 'user.name'], canonicalPath),
      run('git', ['config', 'user.email'], canonicalPath),
      run('git', ['remote', '-v'], canonicalPath),
    ]);
    if (!authorName || !authorEmail) {
      throw new Error(
        'Git author identity is missing. Set `git config user.name` and `git config user.email`, then rerun init.',
      );
    }
    return {
      canonicalPath,
      authorName,
      authorEmail,
      hasGitHubRemote: /(?:git@github\.com:|https:\/\/github\.com\/)/.test(remotes),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Git author identity')) throw error;
    throw new Error(
      `${projectPath} is not inside a usable Git worktree. Run init from the target repository after configuring Git author identity.`,
      { cause: error },
    );
  }
}

export async function checkGitHubReadiness(repository: InspectedRepository): Promise<void> {
  if (!repository.hasGitHubRemote) {
    throw new Error('No GitHub remote is configured. Add one or run `gh repo create`, then rerun init.');
  }
  try {
    await run('gh', ['auth', 'status'], repository.canonicalPath);
  } catch {
    throw new Error('GitHub authentication is missing or insufficient. Run `gh auth login`, then rerun init.');
  }
}

async function commandExists(command: string, args: string[]): Promise<boolean> {
  try {
    await execFileAsync(command, args);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { cwd });
  return stdout.trim();
}
