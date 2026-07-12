import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TELEGRAM_WORKFLOW_SKILLS = [
  'mastra-workflow',
  'mastra-talk-it-through',
  'mastra-to-plan',
  'mastra-implement-next-task',
  'mastra-task-review',
  'mastra-tdd',
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
  const stateDir = path.join(homeDir, '.mastracode-telegram', 'state');
  const backupDir = path.join(stateDir, 'managed-skill-backups');
  const hashes: Record<string, string> = {};
  await fs.mkdir(destination, { recursive: true });
  await fs.mkdir(stateDir, { recursive: true });

  for (const name of TELEGRAM_WORKFLOW_SKILLS) {
    const source = path.join(sourceDir, name);
    const packagedHash = await hashSkill(source).catch(() => undefined);
    if (!packagedHash) {
      throw new Error(`Packaged workflow skill ${name} is missing. Reinstall mastracode-remote.`);
    }

    const target = path.join(destination, name);
    const targetExists = await pathExists(target);
    const installedHash = await hashSkill(target).catch(() => undefined);
    if (installedHash !== packagedHash) {
      if (targetExists) {
        const backup = path.join(backupDir, name);
        await fs.rm(backup, { recursive: true, force: true });
        await fs.mkdir(path.dirname(backup), { recursive: true });
        await fs.cp(target, backup, { recursive: true });
      }
      await fs.rm(target, { recursive: true, force: true });
      await fs.cp(source, target, { recursive: true });
    }
    hashes[name] = packagedHash;
  }

  await fs.writeFile(
    path.join(stateDir, 'managed-skills.json'),
    `${JSON.stringify({ schemaVersion: 1, hashes }, null, 2)}\n`,
    'utf8',
  );
  return [...TELEGRAM_WORKFLOW_SKILLS];
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function hashSkill(directory: string): Promise<string> {
  const files = await listFiles(directory);
  if (!files.includes('SKILL.md')) throw new Error(`${directory} has no SKILL.md`);
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(await fs.readFile(path.join(directory, file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function listFiles(root: string, directory = root): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(root, entryPath)));
    else if (entry.isFile()) files.push(path.relative(root, entryPath));
  }
  return files.sort();
}

function bundledSkillsDirectory(): string {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  const packaged = path.resolve(moduleDirectory, '../assets/skills');
  return existsSync(packaged) ? packaged : path.resolve(moduleDirectory, '../../assets/skills');
}
