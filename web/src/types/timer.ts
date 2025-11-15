export type TimerStatus = 'idle' | 'running' | 'triggered';

export interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAt?: number;
  endsAt?: number;
  updatedAt: number;
}

export const initialTimerState: TimerState = {
  durationSeconds: 0,
  remainingSeconds: 0,
  status: 'idle',
  updatedAt: Date.now()
};
