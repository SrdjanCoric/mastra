import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { isManagedWorkflowPrompt, parseManagedWorkflowGoal } from './managed-workflow-goal.js';

describe('parseManagedWorkflowGoal', () => {
  it.each([
    ['mastra workflow --run', 'mastra workflow --run'],
    ['MASTRA WORKFLOW --RUN', 'mastra workflow --run'],
    ['  mastra   workflow   --run  ', 'mastra workflow --run'],
  ])('routes %j into a persistent goal', (input, expected) => {
    expect(parseManagedWorkflowGoal(input)).toBe(expected);
  });

  it.each(['mastra workflow', 'Mastra Workflow', '  mastra   workflow  '])(
    'recognizes bare workflow prompt %j for the startup chooser',
    input => {
      expect(isManagedWorkflowPrompt(input)).toBe(true);
      expect(parseManagedWorkflowGoal(input)).toBeNull();
    },
  );

  it.each(['build the app', 'run mastra workflow', 'mastra workflow now', 'mastra workflow --plan'])(
    'ignores unrelated prompt %j',
    input => {
      expect(isManagedWorkflowPrompt(input)).toBe(false);
      expect(parseManagedWorkflowGoal(input)).toBeNull();
    },
  );

  it('keeps every bare workflow instruction on the startup-choice path', () => {
    const skill = readFileSync(new URL('../../assets/skills/mastra-workflow/SKILL.md', import.meta.url), 'utf8');

    expect(skill).toContain('Act on the invocation before inspecting the repository or master plan.');
    expect(skill).toContain('**Bare invocation** → ask for the startup mode before repository inspection.');
    expect(skill).not.toContain('**Bare invocation** → run `mastra-talk-it-through` first.');
  });
});
