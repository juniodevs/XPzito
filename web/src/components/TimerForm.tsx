import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import type { TimerState } from '@/types/timer';
import { formatDuration } from '@/lib/time';

interface Props {
  state: TimerState;
  onStart: (seconds: number) => Promise<void>;
  onCancel: () => Promise<void>;
  isBusy?: boolean;
  onTest?: () => void;
  canTest?: boolean;
}

const quickPresets = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '20m', value: 20 * 60 }
];

export const TimerForm = ({ state, onStart, onCancel, isBusy = false, onTest, canTest = true }: Props) => {
  const [seconds, setSeconds] = useState(() => Math.max(10, state.durationSeconds || 60));
  const [message, setMessage] = useState<string | null>(null);

  const disabled = isBusy;

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

  const startLabel = useMemo(() => {
    if (state.status === 'running') {
      return 'Atualizar tempo';
    }
    if (state.status === 'triggered') {
      return 'Rearmar';
    }
    return 'Iniciar';
  }, [state.status]);

  const stateLabel = (() => {
    switch (state.status) {
      case 'running':
        return `Bot toca em ${formatDuration(state.remainingSeconds)}`;
      case 'triggered':
        return 'Bot pronto para tocar (aguardando visualização).';
      default:
        return 'Cronômetro aguardando configuração.';
    }
  })();

  return (
    <form className="timer-form" onSubmit={handleSubmit}>
      <header>
        <h1>Cronômetro do Bot</h1>
        <p>{stateLabel}</p>
      </header>

      <label className="timer-form__label" htmlFor="seconds">
        Tempo em segundos
      </label>
      <input
        id="seconds"
        type="number"
        min={5}
        step={5}
        value={seconds}
        disabled={disabled}
        onChange={(event) => {
          const value = Number(event.currentTarget.value);
          setSeconds(Number.isFinite(value) ? value : 0);
        }}
      />

      <div className="timer-form__presets">
        {quickPresets.map((preset) => (
          <button
            type="button"
            key={preset.label}
            disabled={disabled}
            onClick={() => setSeconds(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="timer-form__actions">
        <button type="submit" disabled={disabled}>
          {startLabel}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={disabled || state.status === 'idle'}
          onClick={async () => {
            try {
              await onCancel();
            } catch (err) {
              setMessage((err as Error).message);
            }
          }}
        >
          Cancelar
        </button>
      </div>

      {onTest && (
        <button
          type="button"
          className="timer-form__test"
          onClick={() => onTest()}
          disabled={disabled || !canTest}
        >
          Testar animação
        </button>
      )}

      {message && <p className="timer-form__message">{message}</p>}
    </form>
  );
};
