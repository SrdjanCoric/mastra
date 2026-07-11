import os from 'node:os';
import type { TelegramCliHandlers } from './cli.js';
import { assertTelegramInitialized } from './readiness.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';
import { initializeTelegramProject } from './setup.js';
import type { TelegramSetupResult } from './setup.js';

export interface TelegramCliEntryDependencies {
  homeDir?: string;
  projectPath?: string;
  env?: NodeJS.ProcessEnv;
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
  const paths = resolveTelegramRuntimePaths(homeDir);
  const importStockCli = dependencies.importStockCli ?? (() => import('../main.js'));
  const initializeProject = dependencies.initializeProject ?? initializeTelegramProject;

  return {
    initialize: async () => {
      const result = await initializeProject({
        homeDir: homeDir ?? os.homedir(),
        projectPath,
        env: dependencies.env ?? process.env,
      });
      process.stdout.write(`Telegram initialized for ${result.projectPath} in topic ${result.threadId}.\n`);
    },
    startTui: async () => {
      assertTelegramInitialized(paths.readinessFile, projectPath);
      process.env.MASTRACODE_SKILLS_SCOPE = 'mastracode';
      await importStockCli();
    },
  };
}
