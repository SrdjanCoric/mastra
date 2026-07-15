const MANAGED_WORKFLOW_PROMPT = /^mastra\s+workflow$/i;
const MANAGED_WORKFLOW_RUN_PROMPT = /^mastra\s+workflow\s+--run$/i;

export function isManagedWorkflowPrompt(input: string): boolean {
  return MANAGED_WORKFLOW_PROMPT.test(input.trim());
}

export function parseManagedWorkflowGoal(input: string): string | null {
  return MANAGED_WORKFLOW_RUN_PROMPT.test(input.trim()) ? 'mastra workflow --run' : null;
}
