import type { TimerState } from '@/types/timer';
import { useTimerForm } from '@/hooks/useTimerForm';

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
  const {
    seconds,
    setSeconds,
    message,
    handleSubmit,
    handleCancel,
    startLabel,
    stateLabel
  } = useTimerForm({ state, onStart, onCancel });

  const disabled = isBusy;

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
          onClick={handleCancel}
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
