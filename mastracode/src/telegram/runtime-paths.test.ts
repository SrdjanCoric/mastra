import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  resolveTelegramBrokerPaths,
  resolveTelegramProjectLockPath,
  resolveTelegramRuntimePaths,
} from './runtime-paths.js';

describe('resolveTelegramRuntimePaths', () => {
  it('keeps all Telegram experiment data under its own runtime root', () => {
    const paths = resolveTelegramRuntimePaths('/test/home');
    const root = path.join('/test/home', '.mastracode-telegram');

    expect(paths).toEqual({
      root,
      configDir: path.join(root, 'config'),
      stateDir: path.join(root, 'state'),
      runtimeDir: path.join(root, 'runtime'),
      logsDir: path.join(root, 'logs'),
      readinessFile: path.join(root, 'state', 'ready.json'),
    });
    expect(Object.values(paths).every(value => !value.includes('.mastracode-remote'))).toBe(true);
  });

  it('derives private broker paths without exposing the bot token', () => {
    const paths = resolveTelegramBrokerPaths('/test/home', '12345:super-secret');

    expect(paths.socketPath).toContain(path.join('.mastracode-telegram', 'runtime', 'broker-'));
    expect(paths.lockPath).toContain(path.join('.mastracode-telegram', 'runtime', 'broker-'));
    expect(paths.statePath).toContain(path.join('.mastracode-telegram', 'state', 'broker-'));
    expect(paths.logPath).toContain(path.join('.mastracode-telegram', 'logs', 'broker-'));
    expect(JSON.stringify(paths)).not.toContain('super-secret');
  });

  it('derives project ownership locks without exposing the project path', () => {
    const lockPath = resolveTelegramProjectLockPath('/test/home', '/private/projects/top-secret');

    expect(lockPath).toContain(path.join('.mastracode-telegram', 'runtime', 'project-'));
    expect(lockPath).not.toContain('top-secret');
  });
});
