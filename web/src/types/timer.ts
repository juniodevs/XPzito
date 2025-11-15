import type { ViewerPreferences } from './viewer';
import { defaultViewerPreferences } from './viewer';

export type TimerStatus = 'idle' | 'running' | 'triggered';

export interface TimerState {
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  startedAt?: number;
  endsAt?: number;
  updatedAt: number;
  viewer: ViewerPreferences;
}

export const initialTimerState: TimerState = {
  durationSeconds: 0,
  remainingSeconds: 0,
  status: 'idle',
  updatedAt: Date.now(),
  viewer: defaultViewerPreferences
};
