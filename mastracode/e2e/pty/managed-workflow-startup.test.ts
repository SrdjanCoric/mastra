import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { LLMock } from '@copilotkit/aimock';
import { expect, it } from 'vitest';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cliPath = join(packageDir, 'dist', 'cli.js');

function stripTerminalControls(value: string): string {
  return value
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '');
}

async function waitForOutput(getOutput: () => string, pattern: RegExp, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pattern.test(stripTerminalControls(getOutput()))) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${pattern}.\nOutput:\n${stripTerminalControls(getOutput())}`);
}

it.skipIf(process.platform === 'win32')(
  'keeps the interactive workflow interview outside the goal loop in a real PTY',
  async () => {
    expect(existsSync(cliPath), `Build MastraCode before running the PTY regression: ${cliPath}`).toBe(true);

    const runRoot = mkdtempSync(join(tmpdir(), 'mc-workflow-pty-'));
    const homeDir = join(runRoot, 'home');
    const appDataDir = join(runRoot, 'app-data');
    const projectDir = join(runRoot, 'project');
    const skillDir = join(projectDir, '.mastracode', 'skills', 'mastra-workflow');
    mkdirSync(homeDir, { recursive: true });
    mkdirSync(appDataDir, { recursive: true });
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(projectDir, 'README.md'), '# PTY workflow regression\n');
    copyFileSync(join(packageDir, 'assets', 'skills', 'mastra-workflow', 'SKILL.md'), join(skillDir, 'SKILL.md'));
    writeFileSync(
      join(appDataDir, 'auth.json'),
      JSON.stringify({ 'apikey:openai-codex': { type: 'api_key', key: 'mc-pty-openai-key' } }, null, 2),
    );
    writeFileSync(
      join(appDataDir, 'settings.json'),
      JSON.stringify(
        {
          onboarding: {
            skippedAt: '2026-01-01T00:00:00.000Z',
            version: 1,
            quietModePreferenceSelected: true,
          },
          models: {
            activeModelPackId: null,
            modeDefaults: {
              build: 'openai/gpt-5.4-mini',
              plan: 'openai/gpt-5.4-mini',
            },
          },
        },
        null,
        2,
      ),
    );

    const mock = new LLMock({ port: 0 });
    await mock.start();

    const child = spawn('python3', [join(packageDir, 'e2e', 'pty', 'pty_driver.py'), process.execPath, cliPath], {
      cwd: projectDir,
      detached: true,
      env: {
        ...process.env,
        HOME: homeDir,
        MC_PTY_CWD: projectDir,
        MASTRA_APP_DATA_DIR: appDataDir,
        MASTRA_DB_PATH: join(runRoot, 'mastra.db'),
        MASTRA_OBSERVABILITY_DB_PATH: join(runRoot, 'observability.db'),
        MASTRA_USER_ID: 'mc-pty',
        OPENAI_API_KEY: 'mc-pty-openai-key',
        OPENAI_BASE_URL: `${mock.url.replace(/\/+$/, '')}/v1`,
        ANTHROPIC_API_KEY: '',
        GOOGLE_API_KEY: '',
        GOOGLE_GENERATIVE_AI_API_KEY: '',
        MASTRA_GATEWAY_API_KEY: '',
        MASTRACODE_MODEL_ID: 'openai/gpt-5.4-mini',
        MASTRACODE_YOLO: '1',
        MASTRACODE_DISABLE_MCP: '1',
        MASTRACODE_DISABLE_HOOKS: '1',
        MASTRACODE_DISABLE_UNIX_SOCKET_PUBSUB: '1',
        MASTRACODE_DISABLE_UPDATE_CHECK: '1',
        DO_NOT_TRACK: '1',
        FORCE_COLOR: '1',
        TERM: 'xterm-256color',
        LINES: '36',
        COLUMNS: '120',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      output += chunk.toString();
    });

    try {
      await waitForOutput(() => output, /Project:|Resource ID:/i);
      child.stdin.write('mastra workflow\r');
      await waitForOutput(() => output, /What would you like Mastra workflow to do\?/i, 2_000);
      expect(stripTerminalControls(output)).toMatch(/Run existing plan/i);
      expect(stripTerminalControls(output)).toMatch(/Plan a new feature/i);
      expect(stripTerminalControls(output)).not.toMatch(/pursuing goal|runs, unlimited|Goal \(judge:/i);
      expect(mock.getRequests()).toHaveLength(0);
    } finally {
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGTERM');
        } catch {
          child.kill('SIGTERM');
        }
      }
      await mock.stop();
      rmSync(runRoot, { recursive: true, force: true });
    }
  },
  45_000,
);
