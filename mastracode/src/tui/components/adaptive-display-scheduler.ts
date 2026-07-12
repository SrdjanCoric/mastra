export const ACTIVE_DISPLAY_INITIAL_INTERVAL_MS = 100;
export const ACTIVE_DISPLAY_STEADY_INTERVAL_MS = 250;
export const ACTIVE_DISPLAY_INITIAL_WINDOW_MS = 1_000;

interface AdaptiveDisplaySchedulerOptions {
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

export class AdaptiveDisplayScheduler {
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private startedAt: number | undefined;
  private lastFlushAt: number | undefined;
  private dirty = false;
  private flushCount = 0;

  constructor(
    private readonly onFlush: () => void,
    options: AdaptiveDisplaySchedulerOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.setTimer = options.setTimer ?? setTimeout;
    this.clearTimer = options.clearTimer ?? clearTimeout;
  }

  schedule(): void {
    this.dirty = true;
    const now = this.now();
    this.startedAt ??= now;

    if (this.lastFlushAt === undefined) {
      this.flushAt(now);
      return;
    }
    if (this.timer) return;

    const interval =
      now - this.startedAt < ACTIVE_DISPLAY_INITIAL_WINDOW_MS
        ? ACTIVE_DISPLAY_INITIAL_INTERVAL_MS
        : ACTIVE_DISPLAY_STEADY_INTERVAL_MS;
    const delay = Math.max(0, interval - (now - this.lastFlushAt));
    if (delay === 0) {
      this.flushAt(now);
      return;
    }

    this.timer = this.setTimer(() => {
      this.timer = undefined;
      this.flushAt(this.now());
    }, delay);
  }

  flush(): void {
    this.cancelTimer();
    if (!this.dirty) return;
    this.flushAt(this.now());
  }

  cancel(): void {
    this.cancelTimer();
    this.dirty = false;
  }

  reset(): void {
    this.cancel();
    this.startedAt = undefined;
    this.lastFlushAt = undefined;
    this.flushCount = 0;
  }

  get diagnostics(): { pending: boolean; flushCount: number } {
    return { pending: this.timer !== undefined, flushCount: this.flushCount };
  }

  private flushAt(now: number): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.lastFlushAt = now;
    this.flushCount += 1;
    this.onFlush();
  }

  private cancelTimer(): void {
    if (!this.timer) return;
    this.clearTimer(this.timer);
    this.timer = undefined;
  }
}
