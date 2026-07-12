const MANAGED_WORKFLOW_PROMPT = /^mastra\s+workflow(?:\s+(--run))?$/i;

export function parseManagedWorkflowGoal(input: string): string | null {
  const match = MANAGED_WORKFLOW_PROMPT.exec(input.trim());
  if (!match) return null;
  return match[1] ? 'mastra workflow --run' : 'mastra workflow';
}
