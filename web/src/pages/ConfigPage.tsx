import { useEffect, useMemo, useState } from 'react';
import { TimerForm } from '@/components/TimerForm';
import { timerService } from '@/services/timerService';
import { useTimerChannel } from '@/hooks/useTimerChannel';
import {
  entranceAnimationOptions,
  exitAnimationOptions,
  defaultViewerPreferences,
  type ViewerPreferences
} from '@/types/viewer';

export const ConfigPage = () => {
  const { state, isConnected, socket } = useTimerChannel();
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewerToast, setViewerToast] = useState<string | null>(null);
  const [viewerPrefs, setViewerPrefs] = useState<ViewerPreferences>(state.viewer ?? defaultViewerPreferences);
  const [exitDelaySeconds, setExitDelaySeconds] = useState(() => Math.round((state.viewer?.exitDelayMs ?? defaultViewerPreferences.exitDelayMs) / 1000));
  const [isSavingViewerPrefs, setIsSavingViewerPrefs] = useState(false);

  useEffect(() => {
    setViewerPrefs(state.viewer ?? defaultViewerPreferences);
    setExitDelaySeconds(Math.round((state.viewer?.exitDelayMs ?? defaultViewerPreferences.exitDelayMs) / 1000));
  }, [state.viewer]);

  const viewerUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/viewer';
    }
    const base = window.location.origin.replace(/\/$/, '');
    return `${base}/viewer`;
  }, []);

  const handleStart = async (seconds: number) => {
    setIsBusy(true);
    try {
      await timerService.start(seconds);
      setToast('Cronômetro atualizado com sucesso.');
    } finally {
      setIsBusy(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleCancel = async () => {
    setIsBusy(true);
    try {
      await timerService.cancel();
      setToast('Cronômetro resetado.');
    } finally {
      setIsBusy(false);
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleTestAnimation = () => {
    if (!socket || !isConnected) {
      return;
    }
    socket.emit('timer:test');
    setToast('Teste enviado ao viewer.');
    setTimeout(() => setToast(null), 2000);
  };

  const handleSaveViewerPreferences = async () => {
    setIsSavingViewerPrefs(true);
    try {
      const updated = await timerService.updateViewerPreferences({
        entranceAnimation: viewerPrefs.entranceAnimation,
        exitAnimation: viewerPrefs.exitAnimation,
        exitDelayMs: Math.max(0, exitDelaySeconds) * 1000
      });
      if (updated.viewer) {
        setViewerPrefs(updated.viewer);
        setExitDelaySeconds(Math.round(updated.viewer.exitDelayMs / 1000));
      }
      setViewerToast('Predefinições salvas.');
    } catch (error) {
      setViewerToast((error as Error).message ?? 'Falha ao salvar predefinições.');
    } finally {
      setIsSavingViewerPrefs(false);
      setTimeout(() => setViewerToast(null), 2500);
    }
  };

  const handleViewerChange = (values: Partial<ViewerPreferences>) => {
    setViewerPrefs((prev) => ({ ...prev, ...values }));
  };

  return (
    <div className="page-shell">
      <section className="panel">
        <div className="panel__header">
          <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
          {isConnected ? 'Conectado ao servidor' : 'Reconectando...'}
        </div>
        <TimerForm
          state={state}
          onStart={handleStart}
          onCancel={handleCancel}
          isBusy={isBusy}
          onTest={handleTestAnimation}
          canTest={isConnected}
        />
        {toast && <p className="panel__toast">{toast}</p>}
      </section>

      <section className="panel secondary">
        <h2>Link do Bot</h2>
        <p>Compartilhe este link com quem precisa visualizar o bot animado.</p>
        <div className="share-box">
          <span>{viewerUrl}</span>
          <button
            type="button"
            onClick={() => {
              if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(viewerUrl);
              } else {
                window.prompt('Copie o link', viewerUrl);
              }
            }}
            aria-label="Copiar link"
          >
            Copiar
          </button>
        </div>
      </section>

      <section className="panel secondary">
        <h2>Transições do Bot</h2>
        <p>Defina os movimentos do bot na entrada/saída e quanto tempo ele permanece em tela.</p>

        <label className="timer-form__label" htmlFor="entrance-animation">
          Transição de entrada
        </label>
        <select
          id="entrance-animation"
          className="form-select"
          value={viewerPrefs.entranceAnimation}
          onChange={(event) => handleViewerChange({ entranceAnimation: event.currentTarget.value as ViewerPreferences['entranceAnimation'] })}
        >
          {entranceAnimationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="timer-form__label" htmlFor="exit-animation">
          Transição de saída
        </label>
        <select
          id="exit-animation"
          className="form-select"
          value={viewerPrefs.exitAnimation}
          onChange={(event) => handleViewerChange({ exitAnimation: event.currentTarget.value as ViewerPreferences['exitAnimation'] })}
        >
          {exitAnimationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <label className="timer-form__label" htmlFor="exit-delay">
          Tempo antes de sair (segundos)
        </label>
        <input
          id="exit-delay"
          type="number"
          min={0}
          step={1}
          className="form-input"
          value={exitDelaySeconds}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            setExitDelaySeconds(Number.isFinite(value) ? value : 0);
          }}
        />

        <button
          type="button"
          className="timer-form__test"
          onClick={handleSaveViewerPreferences}
          disabled={isSavingViewerPrefs}
        >
          {isSavingViewerPrefs ? 'Salvando...' : 'Salvar predefinições'}
        </button>

        {viewerToast && <p className="panel__toast">{viewerToast}</p>}
      </section>
    </div>
  );
};
