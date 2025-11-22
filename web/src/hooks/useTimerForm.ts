import { useState, type FormEvent, useMemo } from 'react';
import type { TimerState } from '../types/timer';
import { formatDuration } from '../lib/time';

interface UseTimerFormProps {
  state: TimerState;
  onStart: (seconds: number) => Promise<void>;
  onCancel: () => Promise<void>;
}

export const useTimerForm = ({ state, onStart, onCancel }: UseTimerFormProps) => {
  const [seconds, setSeconds] = useState(() => Math.max(10, state.durationSeconds || 60));
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const safeSeconds = Math.max(1, Math.round(seconds));
    if (safeSeconds <= 0) {
      setMessage('Defina um tempo em segundos maior que zero.');
      return;
    }
    try {
      setMessage(null);
      await onStart(safeSeconds);
    } catch (error) {
      const err = error as Error;
      setMessage(err.message);
    }
  };

  const handleCancel = async () => {
    try {
      await onCancel();
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const startLabel = useMemo(() => {
    if (state.status === 'running') {
      return 'Atualizar tempo';
    }
    if (state.status === 'triggered') {
      return 'Rearmar';
    }
    return 'Iniciar';
  }, [state.status]);

  const stateLabel = useMemo(() => {
    switch (state.status) {
      case 'running':
        return `Bot toca em ${formatDuration(state.remainingSeconds)}`;
      case 'triggered':
        return 'Bot pronto para tocar (aguardando visualização).';
      default:
        return 'Cronômetro aguardando configuração.';
    }
  }, [state.status, state.remainingSeconds]);

  return {
    seconds,
    setSeconds,
    message,
    handleSubmit,
    handleCancel,
    startLabel,
    stateLabel
  };
};
