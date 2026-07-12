import { describe, expect, it } from 'vitest';

import {
  formatTelegramHelp,
  formatTelegramMessageFailure,
  formatTelegramMessageReceipt,
  formatTelegramStatus,
  formatThreadNotice,
  parseTelegramCommand,
} from './session-commands.js';

describe('Telegram session commands', () => {
  it.each([
    ['/status', 'status'],
    ['/STOP', 'stop'],
    ['/help@mastracode_bot', 'help'],
  ] as const)('parses %s without sending it to the model', (input, command) => {
    expect(parseTelegramCommand(input)).toEqual({ type: 'command', command });
  });

  it('classifies unknown and argument-bearing slash commands as unsupported', () => {
    expect(parseTelegramCommand('/models')).toEqual({ type: 'unsupported', command: '/models' });
    expect(parseTelegramCommand('/status old')).toEqual({ type: 'unsupported', command: '/status' });
    expect(parseTelegramCommand('hello')).toEqual({ type: 'message', text: 'hello' });
  });

  it('formats redacted deterministic status from safe state only', () => {
    expect(
      formatTelegramStatus({
        project: 'example',
        thread: 'Fix broker race (abc12345)',
        model: 'openai/gpt-5.4-mini',
        mode: 'build',
        runState: 'running',
        currentWork: 'tool: execute_command',
        queuedFollowUps: 2,
        activeForMs: 65_000,
        telegramHealth: 'connected',
      }),
    ).toBe(
      [
        'MastraCode status',
        'Project: example',
        'Thread: Fix broker race (abc12345)',
        'Model: openai/gpt-5.4-mini',
        'Mode: build',
        'Run: running',
        'Current: tool: execute_command',
        'Queued follow-ups: 2',
        'Active for: 1m 5s',
        'Telegram: connected',
      ].join('\n'),
    );
  });

  it('keeps untrusted status fields on one bounded line', () => {
    const output = formatTelegramStatus({
      project: 'project\nInjected: secret',
      thread: 'thread',
      model: 'model',
      mode: 'build',
      runState: 'idle',
      currentWork: 'none',
      queuedFollowUps: 0,
      telegramHealth: 'connected',
    });
    expect(output).toContain('Project: project Injected: secret');
    expect(output.split('\n')).toHaveLength(10);
  });

  it('formats deterministic receipts for idle and active messages', () => {
    expect(formatTelegramMessageReceipt(false)).toBe(
      'Received. I will respond here when the terminal session has processed this message.',
    );
    expect(formatTelegramMessageReceipt(true)).toBe('Received. I will respond here and keep the current work running.');
  });

  it('formats bounded failure replies without echoing message content', () => {
    expect(formatTelegramMessageFailure('empty')).toBe('No text was received, so nothing was queued.');
    expect(formatTelegramMessageFailure('no-model')).toContain('no model is selected');
    expect(formatTelegramMessageFailure('rejected')).toContain('no work was queued');
    expect(formatTelegramMessageFailure('failed')).toContain('No automatic retry');
  });

  it('lists only supported commands and terminal-only controls', () => {
    const help = formatTelegramHelp();
    expect(help).toContain('/status');
    expect(help).toContain('/stop');
    expect(help).toContain('/help');
    expect(help).toContain('terminal');
    expect(help).not.toContain('/models');
  });

  it('uses a safe title or short thread identifier in thread-change notices', () => {
    expect(formatThreadNotice('A useful title', '1234567890')).toBe('Now following thread: A useful title (12345678)');
    expect(formatThreadNotice(undefined, '1234567890')).toBe('Now following thread: 12345678');
  });
});
