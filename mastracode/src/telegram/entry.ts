import os from 'node:os';
import type { TelegramCliHandlers } from './cli.js';
import { createTerminalInitPrompter, prepareGuidedTelegramInit } from './guided-init.js';
import type { TelegramInitPrompter } from './guided-init.js';
import { assertTelegramInitialized } from './readiness.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';
import { initializeTelegramProject } from './setup.js';
import type { TelegramSetupResult } from './setup.js';

export interface TelegramCliEntryDependencies {
  homeDir?: string;
  projectPath?: string;
  env?: NodeJS.ProcessEnv;
  prompter?: TelegramInitPrompter | false;
  write?: (message: string) => void;
  importStockCli?: () => Promise<unknown>;
  initializeProject?: (options: {
    homeDir: string;
    projectPath: string;
    env: NodeJS.ProcessEnv;
  }) => Promise<TelegramSetupResult>;
}

export function createTelegramCliHandlers(dependencies: TelegramCliEntryDependencies = {}): TelegramCliHandlers {
  const homeDir = dependencies.homeDir;
  const projectPath = dependencies.projectPath ?? process.cwd();
  const resolvedHomeDir = homeDir ?? os.homedir();
  const paths = resolveTelegramRuntimePaths(homeDir);
  const importStockCli = dependencies.importStockCli ?? (() => import('../main.js'));
  const initializeProject = dependencies.initializeProject ?? initializeTelegramProject;
  const write = dependencies.write ?? (message => process.stdout.write(`${message}\n`));

  return {
    initialize: async () => {
      const guided = await prepareGuidedTelegramInit({
        homeDir: resolvedHomeDir,
        projectPath,
        env: dependencies.env ?? process.env,
        prompter: dependencies.prompter === false ? undefined : (dependencies.prompter ?? createTerminalInitPrompter()),
        write,
      });
      if (!guided.confirmed) {
        write('Initialization cancelled before any project setup changes were made.');
        return;
      }
      write('Validating MastraCode, Git, GitHub, Telegram, and workflow skills...');
      const result = await initializeProject({ homeDir: resolvedHomeDir, projectPath, env: guided.env });
      write(`Telegram initialized for ${result.projectPath}.`);
      write(`Topic: ${result.threadId}${result.reusedTopic ? ' (reused)' : ' (created)'}`);
      write(`Workflow skills: ${result.skills.length} verified.`);
      write('Next: run `mastracode-telegram` from this project.');
    },
    startTui: async () => {
      assertTelegramInitialized(paths.readinessFile, projectPath);
      process.env.MASTRACODE_SKILLS_SCOPE = 'mastracode';
      await importStockCli();
    },
  };
}
