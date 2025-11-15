import { EventEmitter } from 'node:events';

export type TimerStatus = 'idle' | 'running' | 'triggered';

export interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAt?: number;
  endsAt?: number;
  updatedAt: number;
}

export class TimerStore extends EventEmitter {
  private state: TimerState = {
    durationSeconds: 0,
    remainingSeconds: 0,
    status: 'idle',
    updatedAt: Date.now()
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
      updatedAt: now
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
      updatedAt: Date.now()
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
