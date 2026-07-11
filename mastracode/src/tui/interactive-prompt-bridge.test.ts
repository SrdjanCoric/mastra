import { describe, expect, it, vi } from 'vitest';

import { InteractivePromptBridge } from './interactive-prompt-bridge.js';

function createBridge(ids = ['A1B2C3', 'D4E5F6']) {
  const sendMessage = vi.fn(async (_text: string) => {});
  let messageId = 100;
  const sendPrompt = vi.fn(async () => ({ messageId: ++messageId }));
  const idFactory = vi.fn(() => ids.shift() ?? 'ABCDEF');
  return { bridge: new InteractivePromptBridge({ sendMessage, sendPrompt, idFactory }), sendMessage, sendPrompt };
}

async function bindPrompt(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('InteractivePromptBridge', () => {
  it('binds an approval to Telegram reply metadata without showing or typing an ID', async () => {
    const { bridge, sendPrompt } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'approval', title: 'Tool approval', summary: 'Action: execute_command', onResolve });
    await bindPrompt();

    expect(sendPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: 'A1B2C3',
        kind: 'approval',
        title: 'Tool approval',
        summary: 'Action: execute_command',
      }),
    );
    await expect(bridge.receiveMessage({ text: 'approve', replyToMessageId: 101 })).resolves.toBe(true);
    expect(onResolve).toHaveBeenCalledWith({ type: 'approve' }, 'telegram');
  });

  it('does not treat ordinary or ambiguously bound text as approval', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'approval', title: 'Tool approval', summary: 'Action: execute_command', onResolve });
    await bindPrompt();

    await expect(bridge.receiveMessage({ text: 'approve' })).resolves.toBe(false);
    await expect(bridge.receiveMessage({ text: 'approve', replyToMessageId: 999 })).resolves.toBe(false);
    await expect(bridge.receiveMessage({ text: 'maybe', replyToMessageId: 101 })).resolves.toBe(true);
    expect(onResolve).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenLastCalledWith(expect.stringContaining('approve` or `deny'));
  });

  it('accepts free text only when Telegram binds it to the matching question message', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});

    bridge.present({ kind: 'question', title: 'Question', summary: 'Which branch?', onResolve });
    await bindPrompt();

    await bridge.receiveMessage({ text: 'feature/telegram', replyToMessageId: 101 });
    expect(onResolve).toHaveBeenCalledWith({ type: 'answer', text: 'feature/telegram' }, 'telegram');
  });

  it('resolves approval button callbacks by internal prompt identity', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});
    const handle = bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });
    await bindPrompt();

    await expect(bridge.receiveMessage({ text: 'approve', promptId: handle.id })).resolves.toBe(true);
    expect(onResolve).toHaveBeenCalledWith({ type: 'approve' }, 'telegram');
  });

  it('uses first-response-wins for terminal and Telegram races', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});
    const handle = bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });
    await bindPrompt();

    expect(handle.resolveLocal({ type: 'deny' })).toBe(true);
    await bridge.receiveMessage({ text: 'approve', replyToMessageId: 101 });

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith({ type: 'deny' }, 'terminal');
  });

  it('rejects delayed and duplicate replies after resolution', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {});
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });
    await bindPrompt();

    await bridge.receiveMessage({ text: 'deny', replyToMessageId: 101 });
    await bridge.receiveMessage({ text: 'approve', replyToMessageId: 101 });

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenLastCalledWith(expect.stringContaining('already resolved'));
  });

  it('cancels pending prompts on shutdown and ignores later replies', async () => {
    const { bridge } = createBridge();
    const onResolve = vi.fn(async () => {});
    const onCancel = vi.fn(async () => {});
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve, onCancel });
    await bindPrompt();

    await bridge.cancelAll('shutdown');
    await bridge.receiveMessage({ text: 'approve', replyToMessageId: 101 });

    expect(onCancel).toHaveBeenCalledWith('shutdown');
    expect(onResolve).not.toHaveBeenCalled();
  });

  it('surfaces resolution callback failures without reopening the prompt', async () => {
    const { bridge, sendMessage } = createBridge();
    const onResolve = vi.fn(async () => {
      throw new Error('policy failed');
    });
    bridge.present({ kind: 'approval', title: 'Approval', summary: 'Action: write file', onResolve });
    await bindPrompt();

    await bridge.receiveMessage({ text: 'approve', replyToMessageId: 101 });
    await bridge.receiveMessage({ text: 'deny', replyToMessageId: 101 });
    await bindPrompt();

    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(expect.stringContaining('could not be applied safely'));
  });
});
