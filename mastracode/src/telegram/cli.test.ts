import { describe, expect, it, vi } from 'vitest';

import { runTelegramCli } from './cli.js';

describe('runTelegramCli', () => {
  it('routes --init to the Telegram initializer', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);
    const showHelp = vi.fn();

    await runTelegramCli(['--init'], { initialize, startTui, showHelp });

    expect(initialize).toHaveBeenCalledOnce();
    expect(startTui).not.toHaveBeenCalled();
  });

  it('shows package help without requiring Telegram initialization', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);
    const showHelp = vi.fn();

    await runTelegramCli(['--help'], { initialize, startTui, showHelp });

    expect(showHelp).toHaveBeenCalledOnce();
    expect(initialize).not.toHaveBeenCalled();
    expect(startTui).not.toHaveBeenCalled();
  });

  it('routes the internal broker command without starting the TUI', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);
    const startBroker = vi.fn().mockResolvedValue(undefined);
    const showHelp = vi.fn();

    await runTelegramCli(['--broker', '--home-dir', '/tmp/test-home'], {
      initialize,
      startTui,
      startBroker,
      showHelp,
    });

    expect(startBroker).toHaveBeenCalledWith('/tmp/test-home');
    expect(startTui).not.toHaveBeenCalled();
  });

  it('rejects --init when combined with stock TUI arguments', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);
    const showHelp = vi.fn();

    await expect(runTelegramCli(['--init', '--help'], { initialize, startTui, showHelp })).rejects.toThrow(
      'Usage: mastracode-remote --init',
    );
    expect(initialize).not.toHaveBeenCalled();
    expect(startTui).not.toHaveBeenCalled();
  });
});
