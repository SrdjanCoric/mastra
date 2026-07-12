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

export type SystemCommandRunner = (command: string, args: string[], cwd?: string) => Promise<string>;

export async function checkSystemPrerequisites(runner: SystemCommandRunner = run): Promise<void> {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    throw new Error('Install Node 22 or newer, then rerun `mastracode-remote --init`.');
  }
  if (!(await commandExists(runner, 'git', ['--version']))) {
    throw new Error('Install Git, then rerun `mastracode-remote --init`.');
  }
  if (!(await commandExists(runner, 'gh', ['--version']))) {
    throw new Error(githubCliInstallInstructions());
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
    'MastraCode provider setup was not detected. Run normal `mastracode`, complete provider login and model setup, then rerun `mastracode-remote --init`.',
  );
}

export async function inspectGitRepository(
  projectPath: string,
  runner: SystemCommandRunner = run,
): Promise<InspectedRepository> {
  try {
    const root = await runner('git', ['rev-parse', '--show-toplevel'], projectPath);
    const canonicalPath = await fs.realpath(root);
    const [authorName, authorEmail, remotes] = await Promise.all([
      runner('git', ['config', 'user.name'], canonicalPath),
      runner('git', ['config', 'user.email'], canonicalPath),
      runner('git', ['remote', '-v'], canonicalPath),
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

export async function checkGitHubReadiness(
  repository: InspectedRepository,
  runner: SystemCommandRunner = run,
): Promise<void> {
  if (!repository.hasGitHubRemote) {
    throw new Error('No GitHub remote is configured. Add one or run `gh repo create`, then rerun init.');
  }
  try {
    await runner('gh', ['auth', 'status'], repository.canonicalPath);
  } catch {
    throw new Error(githubAuthInstructions());
  }
}

export function githubCliInstallInstructions(): string {
  return [
    'Install GitHub CLI: the required `gh` command was not found.',
    '',
    'On macOS with Homebrew:',
    '  brew install gh',
    '',
    'Then connect it to your GitHub account:',
    '  gh auth login',
    '',
    'Choose GitHub.com, HTTPS, and Login with a web browser. Verify with `gh auth status`, then rerun `mastracode-remote --init`.',
  ].join('\n');
}

export function githubAuthInstructions(): string {
  return [
    'GitHub CLI is installed but is not connected to a GitHub account.',
    '',
    'Run:',
    '  gh auth login',
    '',
    'Choose GitHub.com, HTTPS, and Login with a web browser. Verify with `gh auth status`, then rerun `mastracode-remote --init`.',
  ].join('\n');
}

async function commandExists(runner: SystemCommandRunner, command: string, args: string[]): Promise<boolean> {
  try {
    await runner(command, args);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { encoding: 'utf8', ...(cwd ? { cwd } : {}) });
  return stdout.trim();
}
