import os from 'node:os';
import path from 'node:path';

export const TELEGRAM_RUNTIME_DIR_NAME = '.mastracode-telegram';

export interface TelegramRuntimePaths {
  root: string;
  configDir: string;
  stateDir: string;
  runtimeDir: string;
  logsDir: string;
  readinessFile: string;
}

export function resolveTelegramRuntimePaths(homeDir = os.homedir()): TelegramRuntimePaths {
  const root = path.join(homeDir, TELEGRAM_RUNTIME_DIR_NAME);
  const stateDir = path.join(root, 'state');

  return {
    root,
    configDir: path.join(root, 'config'),
    stateDir,
    runtimeDir: path.join(root, 'runtime'),
    logsDir: path.join(root, 'logs'),
    readinessFile: path.join(stateDir, 'ready.json'),
  };
}
