import type { TUIBridgeIncomingMessage } from '../../src/tui/state.js';
import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

let connected = true;
let deliverTelegramMessage: ((message: TUIBridgeIncomingMessage) => Promise<void>) | undefined;
let telegramOutput: string[] = [];

export const telegramRecoveryScenario: McE2eScenario = {
  name: 'telegram-recovery',
  description: 'Keep the real TUI usable during a Telegram outage and verify delivery resumes after recovery.',
  testName: 'continues locally while Telegram reconnects',
  useOpenAIModel: true,
  aimockFixture: 'telegram-recovery.json',
  inProcessApp({ startMastraCodeApp }) {
    connected = true;
    deliverTelegramMessage = undefined;
    telegramOutput = [];
    return startMastraCodeApp({
      tui: {
        messageBridge: {
          async start(onMessage) {
            deliverTelegramMessage = onMessage;
          },
          async sendMessage(text) {
            if (!connected) throw new Error('Telegram broker is reconnecting.');
            telegramOutput.push(text);
          },
          async sendPrompt() {
            if (!connected) throw new Error('Telegram broker is reconnecting.');
            return { messageId: 101 };
          },
          health() {
            return connected ? 'connected' : 'disconnected';
          },
          stop() {},
        },
      },
    });
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })).toBeVisible();
    for (let attempt = 0; attempt < 50 && !deliverTelegramMessage; attempt += 1) await runtime.sleep(10);
    if (!deliverTelegramMessage) throw new Error('Telegram TUI bridge did not start.');

    connected = false;
    terminal.submit('Keep working while Telegram is offline.');
    await runtime.waitForScreenText(/Local work continued while Telegram was offline\./i, terminal, 30_000);
    await runtime.waitForScreenText(/Telegram delivery failed; continuing locally/i, terminal);

    connected = true;
    telegramOutput.push(
      'Telegram broker recovered and reconnected to the active terminal session. Current status follows.',
    );
    await deliverTelegramMessage({ text: '/status' });
    expect(telegramOutput.join('\n')).toContain('Telegram: connected');

    await deliverTelegramMessage({ text: 'Reply after Telegram recovery.' });
    await runtime.waitForScreenText(/Telegram delivery resumed after recovery\./i, terminal, 30_000);
    for (
      let attempt = 0;
      attempt < 50 && !telegramOutput.includes('Telegram delivery resumed after recovery.');
      attempt += 1
    ) {
      await runtime.sleep(10);
    }
    expect(telegramOutput).toContain('Telegram delivery resumed after recovery.');

    terminal.keyCtrlC();
  },
};
