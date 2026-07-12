import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

const OBJECTIVE = 'mastra workflow --run';
const STATUS_MESSAGE = 'What is the current workflow status?';

export const persistentGoalJudgeDecisionScenario: McE2eScenario = {
  name: 'persistent-goal-judge-decision',
  description: 'Start the documented managed workflow prompt as a goal and continue after a status interjection.',
  testName: 'continues a managed workflow after answering a status interjection',
  useOpenAIModel: true,
  aimockFixture: 'persistent-goal-judge-decision.json',
  prepare({ appDataDir }) {
    const settingsPath = join(appDataDir, 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as Record<string, unknown> & {
      models?: Record<string, unknown>;
    };
    settings.models = {
      ...settings.models,
      goalJudgeModel: 'openai/gpt-5.4-mini',
      goalMaxTurns: 3,
    };
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await (expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })) as any).toBeVisible();

    terminal.submit(OBJECTIVE);
    await runtime.waitForScreenText(/pursuing goal/i, terminal, 8_000);
    terminal.submit(STATUS_MESSAGE);

    await runtime.waitForScreenText(/Status received; autonomous work will continue/i, terminal, 15_000);
    await runtime.waitForScreenText(/Second autonomous workflow task completed/i, terminal, 15_000);
    await runtime.waitForScreenText(/Goal\s+●\s+done/i, terminal, 15_000);
    await runtime.waitForScreenText(/Both autonomous workflow tasks are complete/i, terminal, 15_000);

    terminal.submit('/goal status');
    await runtime.waitForScreenText(/Goal \(done\):.*2\/3 turns used/i, terminal, 8_000);

    terminal.keyCtrlC();
  },
  verifyAimockRequests(requests) {
    if (requests.length < 4) {
      throw new Error(`Expected at least 4 AIMock requests for the active goal flow; received ${requests.length}`);
    }
    const body = JSON.stringify(requests);
    const normalizedBody = body.replaceAll('\\"', '"');
    if (!normalizedBody.includes(STATUS_MESSAGE)) {
      throw new Error('Expected the active goal request context to include the status interjection');
    }
    if (!normalizedBody.includes('delivery="while-active"')) {
      throw new Error('Expected the status interjection to retain while-active delivery metadata');
    }
    if (!normalizedBody.includes('Continue autonomous goal work')) {
      throw new Error('Expected the goal judge prompt to require continuation after the status interjection');
    }
  },
};
