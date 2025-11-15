import { EventEmitter } from 'node:events';

export type TimerStatus = 'idle' | 'running' | 'triggered';

export const entranceAnimations = ['slide-up', 'pop-bounce'] as const;
export type ViewerEntranceAnimation = (typeof entranceAnimations)[number];

export const exitAnimations = ['slide-down', 'spin-fall'] as const;
export type ViewerExitAnimation = (typeof exitAnimations)[number];

export interface ViewerPreferences {
  entranceAnimation: ViewerEntranceAnimation;
  exitAnimation: ViewerExitAnimation;
  exitDelayMs: number;
}

export const defaultViewerPreferences: ViewerPreferences = {
  entranceAnimation: 'slide-up',
  exitAnimation: 'slide-down',
  exitDelayMs: 4000
};

export interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAt?: number;
  endsAt?: number;
  updatedAt: number;
  viewer: ViewerPreferences;
}

export class TimerStore extends EventEmitter {
  private state: TimerState = {
    durationSeconds: 0,
    remainingSeconds: 0,
    status: 'idle',
    updatedAt: Date.now(),
    viewer: { ...defaultViewerPreferences }
  };

  private ticker?: NodeJS.Timeout;
  private targetTimestamp: number | null = null;

  start(durationSeconds: number) {
    const clamped = Math.max(1, Math.floor(durationSeconds));
    this.clearTicker();
    const now = Date.now();
    this.targetTimestamp = now + clamped * 1000;
    this.state = {
      durationSeconds: clamped,
      remainingSeconds: clamped,
      status: 'running',
      startedAt: now,
      endsAt: this.targetTimestamp,
      updatedAt: now,
      viewer: { ...(this.state.viewer ?? defaultViewerPreferences) }
    };
    this.emitUpdate();
    this.ticker = setInterval(() => this.handleTick(), 250);
  }

  cancel() {
    this.clearTicker();
    this.targetTimestamp = null;
    this.state = {
      durationSeconds: 0,
      remainingSeconds: 0,
      status: 'idle',
      updatedAt: Date.now(),
      viewer: { ...(this.state.viewer ?? defaultViewerPreferences) }
    };
    this.emitUpdate();
  }

  acknowledgeTrigger() {
    if (this.state.status !== 'triggered') {
      return;
    }
    this.state = {
      ...this.state,
      status: 'idle',
      updatedAt: Date.now()
    };
    this.emitUpdate();
  }

  getState(): TimerState {
    return this.state;
  }

  updateViewerPreferences(preferences: Partial<ViewerPreferences>) {
    const next: ViewerPreferences = {
      ...(this.state.viewer ?? defaultViewerPreferences),
      ...preferences
    };
    this.state = {
      ...this.state,
      viewer: next,
      updatedAt: Date.now()
    };
    this.emitUpdate();
  }

  private handleTick() {
    if (!this.targetTimestamp) {
      return;
    }
    const now = Date.now();
    const remainingMs = this.targetTimestamp - now;
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    if (remainingSeconds !== this.state.remainingSeconds) {
      this.state = {
        ...this.state,
        remainingSeconds,
        updatedAt: now
      };
      this.emitUpdate();
    }

    if (remainingSeconds <= 0) {
      this.clearTicker();
      this.targetTimestamp = null;
      this.state = {
        ...this.state,
        remainingSeconds: 0,
        status: 'triggered',
        updatedAt: now
      };
      this.emit('timer:trigger');
      this.emitUpdate();
    }
  }

  private emitUpdate() {
    this.emit('timer:update', this.state);
  }

  private clearTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = undefined;
    }
  }
}
