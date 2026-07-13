import type { TUI } from '@earendil-works/pi-tui';

import { ToolExecutionComponentEnhanced } from '../tui/components/tool-execution-enhanced.js';

const CHUNK_COUNT = 20_000;
const MAX_REBUILDS = 3;
const MAX_ACTIVE_HEAP_DELTA_BYTES = 16 * 1024 * 1024;
const MAX_ELAPSED_MS = 5_000;
const MAX_QUIET_VIEW_UPDATE_MS = 1_000;

function collectHeap(): number {
  const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  gc?.();
  return process.memoryUsage().heapUsed;
}

async function main(): Promise<void> {
  const heapBefore = collectHeap();
  let visibleRebuilds = 0;
  const ui = { requestRender: () => (visibleRebuilds += 1) } as unknown as TUI;
  const component = new ToolExecutionComponentEnhanced(
    'execute_command',
    { command: 'performance stream', tail: 1_000 },
    {},
    ui,
  );
  const startedAt = performance.now();

  for (let index = 0; index < CHUNK_COUNT; index += 1) {
    component.appendStreamingOutput(`chunk-${String(index).padStart(5, '0')} ${'x'.repeat(48)}\n`);
  }

  await new Promise(resolve => setTimeout(resolve, 125));
  const elapsedMs = performance.now() - startedAt;
  const active = component.getStreamingPreviewDiagnostics();
  const heapActive = collectHeap();

  component.dispose();
  const cleanup = component.getStreamingPreviewDiagnostics();
  const heapAfterCleanup = collectHeap();

  const quietViewOutput = Array.from(
    { length: CHUNK_COUNT },
    (_, index) => `${String(index + 1).padStart(6)}→export const value${index} = '${'x'.repeat(120)}';`,
  ).join('\n');
  const quietView = new ToolExecutionComponentEnhanced(
    'view',
    { path: 'src/huge.ts', offset: 1, limit: CHUNK_COUNT, showLineNumbers: true },
    { quietDisplayMode: 'quiet', quietPreviewLineLimit: 2, collapsedByDefault: true },
    ui,
  );
  const quietViewStartedAt = performance.now();
  quietView.updateResult({ content: [{ type: 'text', text: quietViewOutput }], isError: false });
  const quietViewUpdateMs = performance.now() - quietViewStartedAt;
  const quietViewRendered = quietView.render(160).join('\n');
  quietView.dispose();

  const result = {
    chunkCount: CHUNK_COUNT,
    visibleRebuilds,
    scheduledRebuilds: active.scheduledRebuilds,
    elapsedMs: Math.round(elapsedMs * 10) / 10,
    retainedChars: active.retainedChars,
    retainedLines: active.retainedLines,
    heapDeltaActiveBytes: heapActive - heapBefore,
    heapDeltaAfterCleanupBytes: heapAfterCleanup - heapBefore,
    quietViewOutputChars: quietViewOutput.length,
    quietViewUpdateMs: Math.round(quietViewUpdateMs * 10) / 10,
    quietViewRenderedChars: quietViewRendered.length,
    cleanup,
  };

  console.info(JSON.stringify(result, null, 2));

  if (active.retainedChars > 65_536 || active.retainedLines > 1_000) {
    throw new Error('Active display preview exceeded its retained-output limits.');
  }
  if (visibleRebuilds > MAX_REBUILDS || active.scheduledRebuilds > MAX_REBUILDS) {
    throw new Error(`Active display rebuilt too often: ${visibleRebuilds} visible rebuilds.`);
  }
  if (heapActive - heapBefore > MAX_ACTIVE_HEAP_DELTA_BYTES) {
    throw new Error(`Active display retained too much heap: ${heapActive - heapBefore} bytes.`);
  }
  if (elapsedMs > MAX_ELAPSED_MS) {
    throw new Error(`Active display processing exceeded ${MAX_ELAPSED_MS}ms.`);
  }
  if (quietViewUpdateMs > MAX_QUIET_VIEW_UPDATE_MS) {
    throw new Error(`Quiet view processing exceeded ${MAX_QUIET_VIEW_UPDATE_MS}ms.`);
  }
  if (quietViewRendered.includes('export const value') || quietViewRendered.length > 300) {
    throw new Error('Quiet view rendering leaked a partial source preview.');
  }
  if (cleanup.retainedChars !== 0 || cleanup.retainedLines !== 0 || cleanup.pendingUpdate) {
    throw new Error('Active display cleanup left retained preview state behind.');
  }
}

void main();
