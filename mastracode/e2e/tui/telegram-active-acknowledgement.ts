import type { TUIBridgeIncomingMessage } from '../../src/tui/state.js';
import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

let deliverTelegramMessage: ((message: TUIBridgeIncomingMessage) => Promise<void>) | undefined;
let telegramOutput: string[] = [];

export const telegramActiveAcknowledgementScenario: McE2eScenario = {
  name: 'telegram-active-acknowledgement',
  description: 'Acknowledge Telegram text during active tool work and return the completed assistant response.',
  testName: 'acknowledges Telegram text without stopping active work',
  useOpenAIModel: true,
  aimockFixture: 'telegram-active-acknowledgement.json',
  inProcessApp({ startMastraCodeApp }) {
    telegramOutput = [];
    deliverTelegramMessage = undefined;
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
      tui: {
        messageBridge: {
          async start(onMessage) {
            deliverTelegramMessage = onMessage;
          },
          async sendMessage(text) {
            telegramOutput.push(text);
          },
          async sendPrompt() {
            return { messageId: 101 };
          },
          health() {
            return 'connected';
          },
          stop() {},
        },
      },
    });
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })).toBeVisible();

    for (let attempt = 0; attempt < 50 && !deliverTelegramMessage; attempt += 1) {
      await runtime.sleep(10);
    }
    if (!deliverTelegramMessage) throw new Error('Telegram TUI bridge did not start.');

    terminal.submit('Run the active Telegram acknowledgement check.');
    await runtime.waitForScreenText(/ACTIVE_TELEGRAM_2/i, terminal, 30_000);
    await deliverTelegramMessage({ text: 'What is the active work status?' });

    const receipt = 'Received. I will respond here and keep the current work running.';
    for (let attempt = 0; attempt < 50 && !telegramOutput.includes(receipt); attempt += 1) {
      await runtime.sleep(10);
    }
    expect(telegramOutput.filter(message => message === receipt)).toHaveLength(1);

    await runtime.waitForScreenText(/Active Telegram message answered; normal work continued\./i, terminal, 30_000);
    expect(telegramOutput).toContain('Active Telegram message answered; normal work continued.');

    terminal.keyCtrlC();
  },
};
