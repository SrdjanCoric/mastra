import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { syncTelegramWorkflowSkills, TELEGRAM_WORKFLOW_SKILLS } from './skills.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mastracode-telegram-skills-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('syncTelegramWorkflowSkills', () => {
  it('installs missing packaged skills and preserves an existing valid skill', async () => {
    const homeDir = await temporaryDirectory();
    const sourceDir = await temporaryDirectory();
    for (const name of TELEGRAM_WORKFLOW_SKILLS) {
      await fs.mkdir(path.join(sourceDir, name), { recursive: true });
      await fs.writeFile(path.join(sourceDir, name, 'SKILL.md'), `# ${name}\n`);
    }
    const existing = path.join(homeDir, '.mastracode', 'skills', TELEGRAM_WORKFLOW_SKILLS[0]);
    await fs.mkdir(existing, { recursive: true });
    await fs.writeFile(path.join(existing, 'SKILL.md'), '# user-managed version\n');

    await syncTelegramWorkflowSkills(homeDir, sourceDir);

    expect(await fs.readFile(path.join(existing, 'SKILL.md'), 'utf8')).toBe('# user-managed version\n');
    for (const name of TELEGRAM_WORKFLOW_SKILLS) {
      await expect(fs.access(path.join(homeDir, '.mastracode', 'skills', name, 'SKILL.md'))).resolves.toBeUndefined();
    }
  });
});
