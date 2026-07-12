import { describe, expect, it, vi } from 'vitest';

import { runTelegramCli } from './cli.js';

describe('runTelegramCli', () => {
  it('routes --init to the Telegram initializer', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);

    await runTelegramCli(['--init'], { initialize, startTui });

    expect(initialize).toHaveBeenCalledOnce();
    expect(startTui).not.toHaveBeenCalled();
  });

  it('routes the internal broker command without starting the TUI', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);
    const startBroker = vi.fn().mockResolvedValue(undefined);

    await runTelegramCli(['--broker', '--home-dir', '/tmp/test-home'], { initialize, startTui, startBroker });

    expect(startBroker).toHaveBeenCalledWith('/tmp/test-home');
    expect(startTui).not.toHaveBeenCalled();
  });

  it('rejects --init when combined with stock TUI arguments', async () => {
    const initialize = vi.fn().mockResolvedValue(undefined);
    const startTui = vi.fn().mockResolvedValue(undefined);

    await expect(runTelegramCli(['--init', '--help'], { initialize, startTui })).rejects.toThrow(
      'Usage: mastracode-remote --init',
    );
    expect(initialize).not.toHaveBeenCalled();
    expect(startTui).not.toHaveBeenCalled();
  });
});
