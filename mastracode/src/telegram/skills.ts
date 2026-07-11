import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TELEGRAM_WORKFLOW_SKILLS = [
  'mastra-workflow',
  'mastra-talk-it-through',
  'mastra-to-plan',
  'mastra-implement-next-task',
  'mastra-task-review',
  'mastra-diagnose',
  'mastra-handoff',
  'mastra-create-pr',
  'mastra-sync-main',
  'mastra-write-well',
] as const;

export async function syncTelegramWorkflowSkills(
  homeDir: string,
  sourceDir = bundledSkillsDirectory(),
): Promise<string[]> {
  const destination = path.join(homeDir, '.mastracode', 'skills');
  await fs.mkdir(destination, { recursive: true });

  for (const name of TELEGRAM_WORKFLOW_SKILLS) {
    const source = path.join(sourceDir, name);
    const sourceManifest = path.join(source, 'SKILL.md');
    try {
      await fs.access(sourceManifest);
    } catch {
      throw new Error(`Packaged workflow skill ${name} is missing. Reinstall @srdjancoric/mastracode-telegram.`);
    }

    const target = path.join(destination, name);
    try {
      await fs.access(path.join(target, 'SKILL.md'));
    } catch {
      await fs.cp(source, target, { recursive: true });
    }
  }

  return [...TELEGRAM_WORKFLOW_SKILLS];
}

function bundledSkillsDirectory(): string {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(moduleDirectory, '../../assets/skills');
}
