import fs from 'node:fs';

export const TELEGRAM_READINESS_SCHEMA_VERSION = 1;

export interface TelegramReadiness {
  schemaVersion: typeof TELEGRAM_READINESS_SCHEMA_VERSION;
  initialized: true;
}

const SETUP_GUIDANCE = 'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.';

export function assertTelegramInitialized(readinessFile: string): void {
  try {
    const readiness = JSON.parse(fs.readFileSync(readinessFile, 'utf8')) as unknown;
    if (
      typeof readiness === 'object' &&
      readiness !== null &&
      'schemaVersion' in readiness &&
      readiness.schemaVersion === TELEGRAM_READINESS_SCHEMA_VERSION &&
      'initialized' in readiness &&
      readiness.initialized === true
    ) {
      return;
    }
  } catch {}

  throw new Error(SETUP_GUIDANCE);
}
