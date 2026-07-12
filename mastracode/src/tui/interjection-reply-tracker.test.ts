import type { AgentControllerEvent } from '@mastra/core/agent-controller';
import { describe, expect, it } from 'vitest';
import { InterjectionReplyTracker, shouldSendAssistantReplyToTelegram } from './interjection-reply-tracker.js';

function userEvent(type: 'message_start' | 'message_end', id: string): AgentControllerEvent {
  return {
    type,
    message: {
      id,
      role: 'user',
      content: [{ type: 'text', text: 'status?' }],
      createdAt: new Date(),
    },
  } as AgentControllerEvent;
}

describe('InterjectionReplyTracker', () => {
  it('routes Telegram and ordinary replies to Telegram but keeps terminal interjection replies local', () => {
    expect(shouldSendAssistantReplyToTelegram('telegram')).toBe(true);
    expect(shouldSendAssistantReplyToTelegram('terminal')).toBe(false);
    expect(shouldSendAssistantReplyToTelegram(undefined)).toBe(true);
  });

  it('returns the origin of a tracked interjection exactly once', () => {
    const tracker = new InterjectionReplyTracker();
    tracker.track('telegram-signal', 'telegram');

    tracker.observe(userEvent('message_start', 'telegram-signal'));
    tracker.observe(userEvent('message_end', 'telegram-signal'));

    expect(tracker.consume()).toBe('telegram');
    expect(tracker.consume()).toBeUndefined();
  });

  it('keeps terminal and Telegram interjection replies in arrival order', () => {
    const tracker = new InterjectionReplyTracker();
    tracker.track('terminal-signal', 'terminal');
    tracker.track('telegram-signal', 'telegram');

    tracker.observe(userEvent('message_start', 'terminal-signal'));
    tracker.observe(userEvent('message_start', 'telegram-signal'));

    expect(tracker.consume()).toBe('terminal');
    expect(tracker.consume()).toBe('telegram');
  });

  it('does not claim a reply for a failed or unrelated signal', () => {
    const tracker = new InterjectionReplyTracker();
    tracker.track('failed-signal', 'telegram');
    tracker.discard('failed-signal');

    tracker.observe(userEvent('message_start', 'failed-signal'));
    tracker.observe(userEvent('message_start', 'unrelated-signal'));

    expect(tracker.consume()).toBeUndefined();
  });
});
