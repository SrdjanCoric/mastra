import { describe, expect, it, vi } from 'vitest';

import { InteractivePromptBridge } from './interactive-prompt-bridge.js';

function createBridge(ids = ['A1B2C3', 'D4E5F6']) {
  const sendMessage = vi.fn(async (_text: string) => {});
  const idFactory = vi.fn(() => ids.shift() ?? 'ABCDEF');
  return { bridge: new InteractivePromptBridge({ sendMessage, idFactory }), sendMessage };
}

describe('InteractivePromptBridge', () => {
  it('binds an approval reply to the exact pending prompt identity', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'approval', title: 'Tool approval', summary: 'Action: execute_command', onResolve });
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('A1B2C3'));

    await expect(bridge.receiveMessage('A1B2C3 approve')).resolves.toBe(true);
    expect(onResolve).toHaveBeenCalledWith({ type: 'approve' }, 'telegram');
  });

  it('does not treat unbound or ambiguous text as approval', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'approval', title: 'Tool approval', summary: 'Action: execute_command', onResolve });

    await expect(bridge.receiveMessage('approve')).resolves.toBe(true);
    await expect(bridge.receiveMessage('A1B2C3 maybe')).resolves.toBe(true);
    expect(onResolve).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenLastCalledWith(expect.stringContaining('A1B2C3 approve'));
  });

  it('accepts a free-text answer only for the matching question identity', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'question', title: 'Question', summary: 'Which branch?', onResolve });

    await bridge.receiveMessage('A1B2C3 feature/telegram');
    expect(onResolve).toHaveBeenCalledWith({ type: 'answer', text: 'feature/telegram' }, 'telegram');
  });

  it('uses first-response-wins for terminal and Telegram races', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});
    const handle = bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });

    expect(handle.resolveLocal({ type: 'deny' })).toBe(true);
    await bridge.receiveMessage('A1B2C3 approve');

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith({ type: 'deny' }, 'terminal');
  });

  it('rejects delayed and duplicate replies after resolution', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {});
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });

    await bridge.receiveMessage('A1B2C3 deny');
    await bridge.receiveMessage('A1B2C3 approve');

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenLastCalledWith(expect.stringContaining('already resolved'));
  });

  it('cancels pending prompts on shutdown and ignores later replies', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});
    const onCancel = vi.fn(async () => {});
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve, onCancel });

    await bridge.cancelAll('shutdown');
    await bridge.receiveMessage('A1B2C3 approve');

    expect(onCancel).toHaveBeenCalledWith('shutdown');
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('surfaces resolution callback failures without reopening the prompt', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {
      throw new Error('policy failed');
    });
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });

    await bridge.receiveMessage('A1B2C3 approve');
    await bridge.receiveMessage('A1B2C3 deny');

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('could not be applied safely'));
  });
});
