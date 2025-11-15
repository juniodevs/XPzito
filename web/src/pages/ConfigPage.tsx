import { useMemo, useState } from 'react';
import { TimerForm } from '@/components/TimerForm';
import { timerService } from '@/services/timerService';
import { useTimerChannel } from '@/hooks/useTimerChannel';

export const ConfigPage = () => {
  const { state, isConnected, socket } = useTimerChannel();
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
    </div>
  );
};
