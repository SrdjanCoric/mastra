import { describe, expect, it, vi } from 'vitest';

import { handleSubagentEnd, handleSubagentTextDelta } from '../subagent.js';

describe('subagent event handlers', () => {
  it('routes text deltas into the pending subagent component', () => {
    const appendTextDelta = vi.fn();
    const ctx = {
      state: {
        pendingSubagents: new Map([['subagent-1', { appendTextDelta }]]),
      },
    } as never;

    handleSubagentTextDelta(ctx, 'subagent-1', 'visible progress');

    expect(appendTextDelta).toHaveBeenCalledWith('visible progress');
  });

  it('finishes, disposes, and removes a completed subagent', () => {
    const finish = vi.fn();
    const dispose = vi.fn();
    const pendingSubagents = new Map([['subagent-1', { finish, dispose }]]);
    const ctx = { state: { pendingSubagents } } as never;

    handleSubagentEnd(ctx, 'subagent-1', false, 1500, 'done');

    expect(finish).toHaveBeenCalledWith(false, 1500, 'done');
    expect(dispose).toHaveBeenCalledOnce();
    expect(pendingSubagents.has('subagent-1')).toBe(false);
  });
});
