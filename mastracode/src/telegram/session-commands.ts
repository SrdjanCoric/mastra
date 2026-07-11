export type TelegramSessionCommand = 'status' | 'stop' | 'help';

export type ParsedTelegramInput =
  | { type: 'message'; text: string }
  | { type: 'command'; command: TelegramSessionCommand }
  | { type: 'unsupported'; command: string };

export interface TelegramStatusSnapshot {
  project: string;
  thread: string;
  model: string;
  mode: string;
  runState: 'idle' | 'running' | 'suspended' | 'stopping';
  currentWork: string;
  queuedFollowUps: number;
  activeForMs?: number;
  telegramHealth: string;
}

export function parseTelegramCommand(input: string): ParsedTelegramInput {
  const text = input.trim();
  if (!text.startsWith('/')) return { type: 'message', text };

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = (rawCommand ?? '').split('@')[0]?.toLowerCase() ?? '';
  if (args.length === 0 && ['/status', '/stop', '/help'].includes(command)) {
    return { type: 'command', command: command.slice(1) as TelegramSessionCommand };
  }
  return { type: 'unsupported', command: command || '/' };
}

export function formatTelegramStatus(status: TelegramStatusSnapshot): string {
  return [
    'MastraCode status',
    `Project: ${safeField(status.project)}`,
    `Thread: ${safeField(status.thread)}`,
    `Model: ${safeField(status.model)}`,
    `Mode: ${safeField(status.mode)}`,
    `Run: ${status.runState}`,
    `Current: ${safeField(status.currentWork)}`,
    `Queued follow-ups: ${status.queuedFollowUps}`,
    `Active for: ${status.activeForMs === undefined ? 'n/a' : formatDuration(status.activeForMs)}`,
    `Telegram: ${safeField(status.telegramHealth)}`,
  ].join('\n');
}

export function formatTelegramHelp(): string {
  return [
    'MastraCode Telegram commands',
    '/status - show safe session status',
    '/stop - stop active work and clear queued Telegram follow-ups',
    '/help - show this help',
    'Thread switching, model selection, settings, shell commands, and other controls are terminal-only.',
  ].join('\n');
}

export function formatUnsupportedTelegramCommand(command: string): string {
  return `Unsupported Telegram command or arguments: ${command}. Use /help here; thread, model, settings, shell, and privileged controls are terminal-only.`;
}

export function formatThreadNotice(
  prefix: 'Following thread' | 'Now following thread',
  title: string | undefined,
  id: string,
): string {
  return `${prefix}: ${formatThreadReference(title, id)}`;
}

export function formatThreadReference(title: string | undefined, id: string): string {
  const shortId = id.slice(0, 8) || 'unknown';
  const safeTitle = title
    ?.replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 80);
  return safeTitle ? `${safeTitle} (${shortId})` : shortId;
}

function safeField(value: string): string {
  return (
    value
      .replace(/[\r\n\t]+/g, ' ')
      .trim()
      .slice(0, 120) || 'unknown'
  );
}

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
