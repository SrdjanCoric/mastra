import { createHash } from 'node:crypto';
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

export function resolveTelegramBrokerPaths(
  homeDir: string,
  botToken: string,
): { socketPath: string; lockPath: string; statePath: string; logPath: string } {
  const runtimePaths = resolveTelegramRuntimePaths(homeDir);
  const tokenId = createHash('sha256').update(botToken).digest('hex').slice(0, 16);
  return {
    socketPath: path.join(runtimePaths.runtimeDir, `broker-${tokenId}.sock`),
    lockPath: path.join(runtimePaths.runtimeDir, `broker-${tokenId}.lock`),
    statePath: path.join(runtimePaths.stateDir, `broker-${tokenId}.json`),
    logPath: path.join(runtimePaths.logsDir, `broker-${tokenId}.log`),
  };
}

export function resolveTelegramProjectLockPath(homeDir: string, projectPath: string): string {
  const projectId = createHash('sha256').update(projectPath).digest('hex').slice(0, 16);
  return path.join(resolveTelegramRuntimePaths(homeDir).runtimeDir, `project-${projectId}.lock`);
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
