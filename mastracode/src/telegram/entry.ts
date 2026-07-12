import os from 'node:os';
import { runTelegramBroker } from './broker-main.js';
import type { TelegramCliHandlers } from './cli.js';
import { createTerminalInitPrompter, prepareGuidedTelegramInit } from './guided-init.js';
import type { TelegramInitPrompter } from './guided-init.js';
import { prepareGuidedProjectRepository } from './project-setup.js';
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
  runBroker?: (homeDir: string) => Promise<void>;
  prepareRepository?: (options: {
    projectPath: string;
    prompter?: TelegramInitPrompter;
    write: (message: string) => void;
  }) => Promise<string>;
  initializeProject?: (options: {
    homeDir: string;
    projectPath: string;
    env: NodeJS.ProcessEnv;
    onProgress?: (message: string) => void;
  }) => Promise<TelegramSetupResult>;
}

export function createTelegramCliHandlers(dependencies: TelegramCliEntryDependencies = {}): TelegramCliHandlers {
  const homeDir = dependencies.homeDir;
  const projectPath = dependencies.projectPath ?? process.cwd();
  const resolvedHomeDir = homeDir ?? os.homedir();
  const paths = resolveTelegramRuntimePaths(homeDir);
  const importStockCli = dependencies.importStockCli ?? (() => import('../main.js'));
  const startBroker = dependencies.runBroker ?? runTelegramBroker;
  const initializeProject = dependencies.initializeProject ?? initializeTelegramProject;
  const prepareRepository = dependencies.prepareRepository ?? prepareGuidedProjectRepository;
  const write = dependencies.write ?? (message => process.stdout.write(`${message}\n`));

  return {
    initialize: async () => {
      const prompter =
        dependencies.prompter === false ? undefined : (dependencies.prompter ?? createTerminalInitPrompter());
      const guided = await prepareGuidedTelegramInit({
        homeDir: resolvedHomeDir,
        projectPath,
        env: dependencies.env ?? process.env,
        prompter,
        write,
      });
      if (!guided.confirmed) {
        write('Initialization cancelled before any project setup changes were made.');
        return;
      }
      const preparedProjectPath = await prepareRepository({ projectPath, prompter, write });
      write('Validating MastraCode, Git, GitHub, Telegram, and workflow skills...');
      const result = await initializeProject({
        homeDir: resolvedHomeDir,
        projectPath: preparedProjectPath,
        env: guided.env,
        onProgress: write,
      });
      write(`Telegram initialized for ${result.projectPath}.`);
      write(`Topic: ${result.threadId}${result.reusedTopic ? ' (reused)' : ' (created)'}`);
      write(`Workflow skills: ${result.skills.length} verified.`);
      write('Next: run `mastracode-remote` from this project.');
    },
    showHelp: () => {
      write('MastraCode Remote');
      write('');
      write('Usage:');
      write('  mastracode-remote          Start the visible MastraCode TUI with Telegram');
      write('  mastracode-remote --init   Initialize Telegram for the current project');
      write('  mastracode-remote --help   Show this help');
    },
    startTui: async () => {
      const readiness = assertTelegramInitialized(paths.readinessFile, projectPath);
      process.env.MASTRACODE_SKILLS_SCOPE = 'mastracode';
      process.env.MASTRACODE_TELEGRAM_ENABLED = '1';
      process.env.MASTRACODE_TELEGRAM_HOME = resolvedHomeDir;
      process.env.MASTRACODE_TELEGRAM_PROJECT_PATH = readiness.projectPath;
      process.env.MASTRACODE_TELEGRAM_THREAD_ID = String(readiness.threadId);
      process.env.MASTRACODE_TELEGRAM_EXECUTABLE = process.argv[1];
      await importStockCli();
    },
    startBroker,
  };
}
