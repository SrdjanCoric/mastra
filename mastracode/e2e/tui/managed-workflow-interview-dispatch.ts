import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

const FEATURE = 'Add reliable workflow startup';
const SKILL_NAME = 'mastra-talk-it-through';
const SKILL_INSTRUCTIONS = 'Managed workflow interview e2e instructions.';

export const managedWorkflowInterviewDispatchScenario: McE2eScenario = {
  name: 'managed-workflow-interview-dispatch',
  description: 'Collect a feature locally, then activate the talk-it-through skill through the real TUI.',
  testName: 'activates mastra-talk-it-through after the user enters a feature',
  projectFixture: 'long-branch',
  useOpenAIModel: true,
  aimockFixture: 'managed-workflow-interview-dispatch.json',
  prepare({ projectDir }) {
    const skillDir = join(projectDir, '.mastracode', 'skills', SKILL_NAME);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, 'SKILL.md'),
      `---\nname: ${SKILL_NAME}\ndescription: Guided feature interview\nuser-invocable: true\n---\n${SKILL_INSTRUCTIONS}\n`,
    );
  },
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await (expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })) as any).toBeVisible();

    terminal.submit('mastra workflow');
    await runtime.waitForScreenText(/What would you like Mastra workflow to do\?/i, terminal, 2_000);
    terminal.write('\x1b[B');
    terminal.write('\r');
    await runtime.waitForScreenText(/What feature do you want to plan\?/i, terminal, 2_000);
    terminal.submit(FEATURE);

    await runtime.waitForScreenText(/Managed workflow interview activated\./i, terminal, 15_000);
    terminal.keyCtrlC();
  },
  verifyAimockRequests(requests) {
    expect(requests).toHaveLength(1);
    const body = JSON.stringify(requests);
    expect(body).toContain(SKILL_NAME);
    expect(body).toContain(SKILL_INSTRUCTIONS);
    expect(body).toContain(`ARGUMENTS: ${FEATURE}`);
  },
};
