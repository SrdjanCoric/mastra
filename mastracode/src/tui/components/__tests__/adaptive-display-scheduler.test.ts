import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdaptiveDisplayScheduler } from '../adaptive-display-scheduler.js';

describe('AdaptiveDisplayScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes the first update immediately, then adapts from 100ms to 250ms intervals', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));
    const flush = vi.fn();
    const scheduler = new AdaptiveDisplayScheduler(flush);

    scheduler.schedule();
    expect(flush).toHaveBeenCalledOnce();

    for (let interval = 1; interval <= 9; interval += 1) {
      scheduler.schedule();
      vi.advanceTimersByTime(99);
      expect(flush).toHaveBeenCalledTimes(interval);
      vi.advanceTimersByTime(1);
      expect(flush).toHaveBeenCalledTimes(interval + 1);
    }

    vi.advanceTimersByTime(100);
    scheduler.schedule();
    vi.advanceTimersByTime(149);
    expect(flush).toHaveBeenCalledTimes(10);
    vi.advanceTimersByTime(1);
    expect(flush).toHaveBeenCalledTimes(11);
  });

  it('flushes pending work on demand and cancels stale timers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'));
    const flush = vi.fn();
    const scheduler = new AdaptiveDisplayScheduler(flush);

    scheduler.schedule();
    scheduler.schedule();
    expect(scheduler.diagnostics.pending).toBe(true);

    scheduler.flush();
    expect(flush).toHaveBeenCalledTimes(2);
    expect(scheduler.diagnostics.pending).toBe(false);

    scheduler.schedule();
    expect(scheduler.diagnostics.pending).toBe(true);
    scheduler.cancel();
    vi.runOnlyPendingTimers();

    expect(flush).toHaveBeenCalledTimes(2);
    expect(scheduler.diagnostics.pending).toBe(false);
  });
});
