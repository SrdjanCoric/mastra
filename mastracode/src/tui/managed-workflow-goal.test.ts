import { describe, expect, it } from 'vitest';

import { parseManagedWorkflowGoal } from './managed-workflow-goal.js';

describe('parseManagedWorkflowGoal', () => {
  it.each([
    ['mastra workflow', 'mastra workflow'],
    ['Mastra Workflow', 'mastra workflow'],
    ['  mastra   workflow  ', 'mastra workflow'],
    ['mastra workflow --run', 'mastra workflow --run'],
    ['MASTRA WORKFLOW --RUN', 'mastra workflow --run'],
  ])('routes %j into a persistent goal', (input, expected) => {
    expect(parseManagedWorkflowGoal(input)).toBe(expected);
  });

  it.each(['build the app', 'run mastra workflow', 'mastra workflow now', 'mastra workflow --plan'])(
    'leaves ordinary prompt %j unchanged',
    input => {
      expect(parseManagedWorkflowGoal(input)).toBeNull();
    },
  );
});
