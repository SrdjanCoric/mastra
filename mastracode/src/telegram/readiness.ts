import fs from 'node:fs';

export const TELEGRAM_READINESS_SCHEMA_VERSION = 1;

export interface TelegramProjectReadiness {
  projectPath: string;
  threadId: number;
  initialized: true;
  checkedAt: string;
}

export interface TelegramReadiness {
  schemaVersion: typeof TELEGRAM_READINESS_SCHEMA_VERSION;
  projects: TelegramProjectReadiness[];
}

const SETUP_GUIDANCE = 'Telegram is not initialized. Run `mastracode-telegram --init` from this project first.';

export function assertTelegramInitialized(readinessFile: string, projectPath: string): TelegramProjectReadiness {
  try {
    const canonicalPath = fs.realpathSync(projectPath);
    const readiness = JSON.parse(fs.readFileSync(readinessFile, 'utf8')) as TelegramReadiness;
    const project = readiness.projects?.find(candidate => candidate.projectPath === canonicalPath);
    if (
      readiness.schemaVersion === TELEGRAM_READINESS_SCHEMA_VERSION &&
      project?.initialized === true &&
      Number.isInteger(project.threadId)
    ) {
      return project;
    }
  } catch {}

  throw new Error(SETUP_GUIDANCE);
}
