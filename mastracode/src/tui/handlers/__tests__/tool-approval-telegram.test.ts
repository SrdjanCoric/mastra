import { describe, expect, it, vi } from 'vitest';

import { createMockState } from '../../__tests__/agent-controller-mock.js';
import { InteractivePromptBridge } from '../../interactive-prompt-bridge.js';
import type { TUIState } from '../../state.js';
import { handleToolApprovalRequired } from '../tool.js';
import type { EventHandlerContext } from '../types.js';

describe('handleToolApprovalRequired Telegram resolution', () => {
  it('routes an identified Telegram approval through the native approval API without exposing arguments', async () => {
    const respondToToolApproval = vi.fn();
    const sendMessage = vi.fn(async (_text: string) => {});
    const state = createMockState({
      session: {
        respondToToolApproval,
        state: { set: vi.fn() },
      },
      extra: {
        ui: {
          terminal: { columns: 120 },
          showOverlay: vi.fn(() => ({ hide: vi.fn() })),
          hideOverlay: vi.fn(),
          requestRender: vi.fn(),
        },
      },
    }) as unknown as TUIState;
    const bridge = new InteractivePromptBridge({ sendMessage, idFactory: () => 'ABC123' });
    state.interactivePromptBridge = bridge;
    const ctx = { state, notify: vi.fn() } as unknown as EventHandlerContext;

    handleToolApprovalRequired(ctx, 'tool-telegram', 'execute_command', { command: 'echo super-secret' });
    await bridge.receiveMessage('ABC123 approve');

    expect(respondToToolApproval).toHaveBeenCalledWith({
      decision: 'approve',
      toolCallId: 'tool-telegram',
    });
    expect(sendMessage.mock.calls[0]?.[0]).toContain('Arguments are available only in the terminal.');
    expect(sendMessage.mock.calls[0]?.[0]).not.toContain('super-secret');
  });
});
