export interface TelegramCliHandlers {
  initialize: () => Promise<void>;
  startTui: () => Promise<void>;
  startBroker?: (homeDir: string) => Promise<void>;
}

export async function runTelegramCli(args: string[], handlers: TelegramCliHandlers): Promise<void> {
  if (args[0] === '--broker') {
    const homeDirIndex = args.indexOf('--home-dir');
    const homeDir = homeDirIndex >= 0 ? args[homeDirIndex + 1] : undefined;
    if (args.length !== 3 || !homeDir || !handlers.startBroker) {
      throw new Error('Invalid internal Telegram broker invocation.');
    }
    await handlers.startBroker(homeDir);
    return;
  }
  if (args.includes('--init')) {
    if (args.length !== 1) {
      throw new Error('Usage: mastracode-remote --init');
    }
    await handlers.initialize();
    return;
  }

  await handlers.startTui();
}
