import fs from 'node:fs';

export function assertTelegramInitialized(readinessFile: string): void {
  if (!fs.existsSync(readinessFile)) {
    throw new Error('Telegram is not initialized. Run `mastracode-telegram --init` from this project first.');
  }
}
