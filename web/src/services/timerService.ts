import type { TimerState } from '@/types/timer';
import { apiFetch } from './apiClient';

export const timerService = {
  start: (durationSeconds: number) =>
    apiFetch<TimerState>('/api/timer/start', {
      method: 'POST',
      body: JSON.stringify({ durationSeconds })
    }),
  cancel: () =>
    apiFetch<TimerState>('/api/timer/cancel', {
      method: 'POST'
    }),
  acknowledge: () =>
    apiFetch<TimerState>('/api/timer/ack-trigger', {
      method: 'POST'
    }),
  current: () => apiFetch<TimerState>('/api/timer')
};
