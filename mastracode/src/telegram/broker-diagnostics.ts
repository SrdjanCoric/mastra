import fs from 'node:fs/promises';
import path from 'node:path';

import type { TelegramBrokerDiagnostic } from './broker.js';

export function createTelegramDiagnosticLogger(
  logPath: string,
  now = () => new Date(),
): {
  write(diagnostic: TelegramBrokerDiagnostic): void;
  flush(): Promise<void>;
} {
  let writes = Promise.resolve();
  return {
    write(diagnostic) {
      const entry = `${JSON.stringify({ timestamp: now().toISOString(), ...diagnostic })}\n`;
      writes = writes.then(async () => {
        await fs.mkdir(path.dirname(logPath), { recursive: true, mode: 0o700 });
        await fs.appendFile(logPath, entry, { mode: 0o600 });
        await fs.chmod(logPath, 0o600);
      });
    },
    flush() {
      return writes;
    },
  };
}
