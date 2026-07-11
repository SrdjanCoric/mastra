import type { TelegramCliHandlers } from './cli.js';
import { assertTelegramInitialized } from './readiness.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';

export interface TelegramCliEntryDependencies {
  homeDir?: string;
  importStockCli?: () => Promise<unknown>;
}

export function createTelegramCliHandlers(dependencies: TelegramCliEntryDependencies = {}): TelegramCliHandlers {
  const paths = resolveTelegramRuntimePaths(dependencies.homeDir);
  const importStockCli = dependencies.importStockCli ?? (() => import('../main.js'));

  return {
    initialize: async () => {
      throw new Error('Telegram initialization is not available yet.');
    },
    startTui: async () => {
      assertTelegramInitialized(paths.readinessFile);
      process.env.MASTRACODE_SKILLS_SCOPE = 'mastracode';
      await importStockCli();
    },
  };
}
