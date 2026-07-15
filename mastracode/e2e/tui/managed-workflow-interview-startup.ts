import { expect } from './expect.js';
import type { McE2eScenario } from './types.js';

export const managedWorkflowInterviewStartupScenario: McE2eScenario = {
  name: 'managed-workflow-interview-startup',
  description: 'Choose the bare mastra workflow mode before starting any model turn.',
  testName: 'shows the workflow startup chooser without invoking the model',
  useOpenAIModel: true,
  expectAimockRequests: false,
  async run({ terminal, runtime }) {
    runtime.startLiveOutput(terminal);
    await (expect(terminal.getByText(/Project:|Resource ID:|>/gi, { full: true, strict: false })) as any).toBeVisible();

    terminal.submit('mastra workflow');
    await runtime.waitForScreenText(/What would you like Mastra workflow to do\?/i, terminal, 2_000);
    await runtime.waitForScreenText(/Run existing plan/i, terminal, 2_000);
    await runtime.waitForScreenText(/Plan a new feature/i, terminal, 2_000);
    expect(terminal.serialize().view).not.toMatch(
      /skill.*mastra-workflow|pursuing goal|runs, unlimited|Goal \(judge:/i,
    );

    terminal.write('\x1b');
    terminal.keyCtrlC();
  },
  verifyAimockRequests(requests) {
    expect(requests).toHaveLength(0);
  },
};
