import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

export const shellOutputBatchingScenario: McE2eScenario = {
  name: 'shell-output-batching',
  description: 'Stream noisy shell output through the real TUI and verify final rendering and subsequent input.',
  testName: 'batches shell output without losing the final result or input responsiveness',
  useOpenAIModel: true,
  aimockFixture: 'shell-output-batching.json',
  inProcessApp({ startMastraCodeApp }) {
    return startMastraCodeApp({
      config: {
        disableHooks: true,
        disableMcp: true,
        initialState: {
          observationThreshold: Number.MAX_SAFE_INTEGER,
          reflectionThreshold: Number.MAX_SAFE_INTEGER,
        },
        unixSocketPubSub: false,
      },
    });
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })).toBeVisible();

    terminal.submit('Run the noisy shell stream.');
    await runtime.waitForScreenText(/STREAM_STDOUT_10/i, terminal, 30_000);
    expect(terminal.serialize().view).not.toMatch(/Shell stream batching complete\./i);
    await runtime.waitForScreenText(/STREAM_STDOUT_39/i, terminal, 30_000);
    await runtime.waitForScreenText(/Shell stream batching complete\./i, terminal, 30_000);

    terminal.submit('Confirm input still works.');
    await runtime.waitForScreenText(/Confirm input still works\./i, terminal, 5_000);

    terminal.keyCtrlC();
  },
};
