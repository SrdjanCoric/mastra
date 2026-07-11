export interface TelegramCliHandlers {
  initialize: () => Promise<void>;
  startTui: () => Promise<void>;
}

export async function runTelegramCli(args: string[], handlers: TelegramCliHandlers): Promise<void> {
  if (args.includes('--init')) {
    if (args.length !== 1) {
      throw new Error('Usage: mastracode-telegram --init');
    }
    await handlers.initialize();
    return;
  }

  await handlers.startTui();
}
