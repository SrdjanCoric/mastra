import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

let deliverTelegramMessage: ((text: string) => Promise<void>) | undefined;
let telegramOutput: string[] = [];

export const telegramSharedConversationScenario: McE2eScenario = {
  name: 'telegram-shared-conversation',
  description: 'Inject Telegram text into the real TUI session and verify the completed assistant reply returns.',
  testName: 'shares one conversation between Telegram and the real TUI',
  useOpenAIModel: true,
  aimockFixture: 'telegram-shared-conversation.json',
  inProcessApp({ startMastraCodeApp }) {
    telegramOutput = [];
    deliverTelegramMessage = undefined;
    return startMastraCodeApp({
      tui: {
        messageBridge: {
          async start(onMessage) {
            deliverTelegramMessage = onMessage;
          },
          async sendMessage(text) {
            telegramOutput.push(text);
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

    await deliverTelegramMessage('/help');
    await deliverTelegramMessage('/status');
    expect(telegramOutput.join('\n')).toContain('Following thread:');
    expect(telegramOutput.join('\n')).toContain('/status - show safe session status');
    expect(telegramOutput.join('\n')).toContain('MastraCode status');
    expect(telegramOutput.join('\n')).toContain('Telegram: connected');

    await deliverTelegramMessage('Reply to the Telegram e2e message.');
    await runtime.waitForScreenText(/Telegram shared conversation response/i, terminal, 30_000);
    await runtime.waitForScreenText(/Telegram/i, terminal);

    for (
      let attempt = 0;
      attempt < 50 && !telegramOutput.includes('Telegram shared conversation response');
      attempt += 1
    ) {
      await runtime.sleep(10);
    }
    expect(telegramOutput).toContain('Telegram shared conversation response');

    terminal.keyCtrlC();
  },
};
