import fs from 'node:fs/promises';
import path from 'node:path';
import { TELEGRAM_READINESS_SCHEMA_VERSION } from './readiness.js';
import { resolveTelegramRuntimePaths } from './runtime-paths.js';
import { syncTelegramWorkflowSkills } from './skills.js';
import {
  checkGitHubReadiness,
  checkMastraCodeReadiness,
  checkSystemPrerequisites,
  inspectGitRepository,
} from './system-checks.js';
import type { InspectedRepository } from './system-checks.js';
import { TelegramBotClient } from './telegram-client.js';
import type { TelegramProjectClient } from './telegram-client.js';

export interface TelegramRuntimeConfig {
  botToken: string;
  allowedUserId: number;
  groupId: number;
}

export interface TelegramSetupDependencies {
  checkPrerequisites: () => Promise<void>;
  checkMastraCode: (env: NodeJS.ProcessEnv) => Promise<void>;
  inspectRepository: (projectPath: string) => Promise<InspectedRepository>;
  checkGitHub: (repository: InspectedRepository) => Promise<void>;
  syncSkills: (homeDir: string) => Promise<string[]>;
  createTelegramClient: (config: TelegramRuntimeConfig) => TelegramProjectClient;
  now: () => Date;
}

export interface InitializeTelegramProjectOptions {
  homeDir: string;
  projectPath: string;
  env: NodeJS.ProcessEnv;
  dependencies?: TelegramSetupDependencies;
}

export interface TelegramSetupResult {
  projectPath: string;
  threadId: number;
  reusedTopic: boolean;
  recoveredTopic: boolean;
  skills: string[];
}

interface RegisteredProject {
  projectPath: string;
  displayName: string;
  threadId: number;
}

interface ProjectRegistry {
  projects: RegisteredProject[];
}

export async function initializeTelegramProject(
  options: InitializeTelegramProjectOptions,
): Promise<TelegramSetupResult> {
  const dependencies = options.dependencies ?? createDefaultDependencies();
  const paths = resolveTelegramRuntimePaths(options.homeDir);

  await dependencies.checkPrerequisites();
  await dependencies.checkMastraCode(options.env);

  const config = await loadConfig(options.env, paths.configDir);
  const telegram = dependencies.createTelegramClient(config);
  await telegram.validateAuthorization();
  await saveConfig(paths.configDir, config);

  const repository = await dependencies.inspectRepository(options.projectPath);
  await dependencies.checkGitHub(repository);
  const skills = await dependencies.syncSkills(options.homeDir);
  const topic = await attachProject(paths.stateDir, repository.canonicalPath, telegram);

  await telegram.sendMessage(
    topic.project.threadId,
    `MastraCode Telegram setup verified for ${topic.project.displayName}.`,
  );
  await fs.mkdir(paths.stateDir, { recursive: true });
  const checkedAt = dependencies.now().toISOString();
  await saveReadiness(paths.readinessFile, {
    projectPath: repository.canonicalPath,
    threadId: topic.project.threadId,
    initialized: true,
    checkedAt,
  });

  return {
    projectPath: repository.canonicalPath,
    threadId: topic.project.threadId,
    reusedTopic: topic.reused,
    recoveredTopic: topic.recovered,
    skills,
  };
}

function createDefaultDependencies(): TelegramSetupDependencies {
  return {
    checkPrerequisites: checkSystemPrerequisites,
    checkMastraCode: checkMastraCodeReadiness,
    inspectRepository: inspectGitRepository,
    checkGitHub: checkGitHubReadiness,
    syncSkills: syncTelegramWorkflowSkills,
    createTelegramClient: config => new TelegramBotClient(config),
    now: () => new Date(),
  };
}

async function loadConfig(env: NodeJS.ProcessEnv, configDir: string): Promise<TelegramRuntimeConfig> {
  const envBotToken = env.TELEGRAM_BOT_TOKEN?.trim();
  const envAllowedUserId = env.TELEGRAM_ALLOWED_USER_ID?.trim();
  const envGroupId = env.TELEGRAM_GROUP_ID?.trim();
  if (envBotToken && envAllowedUserId && envGroupId) {
    return {
      botToken: envBotToken,
      allowedUserId: parseInteger('TELEGRAM_ALLOWED_USER_ID', envAllowedUserId),
      groupId: parseInteger('TELEGRAM_GROUP_ID', envGroupId),
    };
  }

  let saved: { botToken?: string; allowedUserId?: number; groupId?: number } = {};
  try {
    const [settingsRaw, secretsRaw] = await Promise.all([
      fs.readFile(path.join(configDir, 'settings.json'), 'utf8'),
      fs.readFile(path.join(configDir, 'secrets.json'), 'utf8'),
    ]);
    const settings = JSON.parse(settingsRaw) as { allowedUserId?: number; groupId?: number };
    const secrets = JSON.parse(secretsRaw) as { botToken?: string };
    saved = { ...settings, ...secrets };
  } catch (error) {
    if (!isMissingPathError(error)) {
      throw new Error('Saved Telegram configuration is invalid. Remove the isolated config and rerun init.');
    }
  }

  const botToken = env.TELEGRAM_BOT_TOKEN?.trim() || saved.botToken;
  const allowedUserId = env.TELEGRAM_ALLOWED_USER_ID?.trim() || saved.allowedUserId?.toString();
  const groupId = env.TELEGRAM_GROUP_ID?.trim() || saved.groupId?.toString();
  const missing = [
    ['TELEGRAM_BOT_TOKEN', botToken],
    ['TELEGRAM_ALLOWED_USER_ID', allowedUserId],
    ['TELEGRAM_GROUP_ID', groupId],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) throw new Error(`Missing required Telegram config: ${missing.join(', ')}`);

  return {
    botToken: botToken as string,
    allowedUserId: parseInteger('TELEGRAM_ALLOWED_USER_ID', allowedUserId as string),
    groupId: parseInteger('TELEGRAM_GROUP_ID', groupId as string),
  };
}

async function saveConfig(configDir: string, config: TelegramRuntimeConfig): Promise<void> {
  await fs.mkdir(configDir, { recursive: true });
  const secretsPath = path.join(configDir, 'secrets.json');
  await fs.writeFile(
    path.join(configDir, 'settings.json'),
    `${JSON.stringify({ allowedUserId: config.allowedUserId, groupId: config.groupId }, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(secretsPath, `${JSON.stringify({ botToken: config.botToken }, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await fs.chmod(secretsPath, 0o600);
}

async function attachProject(
  stateDir: string,
  canonicalPath: string,
  telegram: TelegramProjectClient,
): Promise<{ project: RegisteredProject; reused: boolean; recovered: boolean }> {
  await fs.mkdir(stateDir, { recursive: true });
  const registryPath = path.join(stateDir, 'projects.json');
  const registry = await loadRegistry(registryPath);
  const existing = registry.projects.find(project => project.projectPath === canonicalPath);

  if (existing) {
    try {
      await postAttachedMessage(telegram, existing);
      return { project: existing, reused: true, recovered: false };
    } catch (error) {
      if (!isMissingTopicError(error)) throw error;
      const recovered = await createProjectTopic(telegram, existing);
      await saveRegistry(registryPath, {
        projects: registry.projects.map(project => (project.projectPath === canonicalPath ? recovered : project)),
      });
      await postAttachedMessage(telegram, recovered);
      return { project: recovered, reused: true, recovered: true };
    }
  }

  const displayName = buildDisplayName(canonicalPath, registry.projects);
  const project = await createProjectTopic(telegram, { projectPath: canonicalPath, displayName, threadId: 0 });
  await saveRegistry(registryPath, { projects: [...registry.projects, project] });
  await postAttachedMessage(telegram, project);
  return { project, reused: false, recovered: false };
}

async function loadRegistry(registryPath: string): Promise<ProjectRegistry> {
  try {
    const parsed = JSON.parse(await fs.readFile(registryPath, 'utf8')) as ProjectRegistry;
    return { projects: parsed.projects ?? [] };
  } catch (error) {
    if (isMissingPathError(error)) return { projects: [] };
    throw error;
  }
}

async function saveRegistry(registryPath: string, registry: ProjectRegistry): Promise<void> {
  await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

async function createProjectTopic(
  telegram: TelegramProjectClient,
  project: RegisteredProject,
): Promise<RegisteredProject> {
  const topic = await telegram.createForumTopic(project.displayName);
  return { ...project, threadId: topic.threadId };
}

async function postAttachedMessage(telegram: TelegramProjectClient, project: RegisteredProject): Promise<void> {
  await telegram.sendMessage(project.threadId, `Attached ${project.displayName}: ${project.projectPath}`);
}

function buildDisplayName(canonicalPath: string, projects: RegisteredProject[]): string {
  const name = path.basename(canonicalPath);
  return projects.some(project => path.basename(project.projectPath) === name)
    ? `${name} (${path.basename(path.dirname(canonicalPath))})`
    : name;
}

async function saveReadiness(
  readinessFile: string,
  marker: { projectPath: string; threadId: number; initialized: true; checkedAt: string },
): Promise<void> {
  let projects: Array<typeof marker> = [];
  try {
    const existing = JSON.parse(await fs.readFile(readinessFile, 'utf8')) as { projects?: Array<typeof marker> };
    projects = existing.projects ?? [];
  } catch (error) {
    if (!isMissingPathError(error)) throw error;
  }
  const next = projects.filter(project => project.projectPath !== marker.projectPath);
  await fs.writeFile(
    readinessFile,
    `${JSON.stringify({ schemaVersion: TELEGRAM_READINESS_SCHEMA_VERSION, projects: [...next, marker] }, null, 2)}\n`,
    'utf8',
  );
}

function parseInteger(name: string, value: string): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${name} must be a safe integer`);
  return parsed;
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isMissingTopicError(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('message thread not found');
}
