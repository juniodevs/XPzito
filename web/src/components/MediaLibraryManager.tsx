import { useCallback, useEffect, useState } from 'react';
import type { AudioLibrary, BotLibrary } from '@/types/media';
import { mediaService } from '@/services/mediaService';

interface Feedback {
  type: 'success' | 'error';
  message: string;
}

const filenameFromUrl = (url: string) => {
  if (!url) {
    return 'Nenhum arquivo';
  }
  try {
    const decoded = decodeURIComponent(url);
    const segments = decoded.split('/');
    return segments.at(-1) ?? decoded;
  } catch {
    return url;
  }
};

export const MediaLibraryManager = () => {
  const [audioLibrary, setAudioLibrary] = useState<AudioLibrary | null>(null);
  const [botLibrary, setBotLibrary] = useState<BotLibrary | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshLibraries = useCallback(async () => {
    const [audio, bot] = await Promise.all([mediaService.audioLibrary(), mediaService.botLibrary()]);
    setAudioLibrary(audio);
    setBotLibrary(bot);
  }, []);

  useEffect(() => {
    refreshLibraries()
      .catch(() => setFeedback({ type: 'error', message: 'Falha ao carregar biblioteca de mídia.' }))
      .finally(() => setIsLoading(false));
  }, [refreshLibraries]);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const runMutation = async <T,>(action: () => Promise<T>, onSuccess: (payload: T) => void, successMessage: string) => {
    setIsBusy(true);
    try {
      const payload = await action();
      onSuccess(payload);
      setFeedback({ type: 'success', message: successMessage });
    } catch (error) {
      setFeedback({ type: 'error', message: (error as Error).message ?? 'Falha ao salvar arquivos.' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSpriteUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const variant = (formData.get('variant') as string) ?? '';
    const file = formData.get('sprite');

    if (!(file instanceof File) || !file.size) {
      setFeedback({ type: 'error', message: 'Escolha um arquivo PNG ou SVG para o bot.' });
      return;
    }

    await runMutation(
      () => mediaService.uploadSprite(variant, file),
      (library) => {
        setBotLibrary(library);
        if (typeof form?.reset === 'function') {
          form.reset();
        }
      },
      'Sprite do bot atualizada com sucesso.'
    );
  };

  const handleTransitionUpload = (direction: 'in' | 'out') => async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('audio');

    if (!(file instanceof File) || !file.size) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo de áudio para enviar.' });
      return;
    }

    await runMutation(
      () => mediaService.uploadTransition(direction, file),
      (library) => {
        setAudioLibrary(library);
        if (typeof form?.reset === 'function') {
          form.reset();
        }
      },
      direction === 'in' ? 'Transição de entrada atualizada.' : 'Transição de saída atualizada.'
    );
  };

  const handleRandomUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData
      .getAll('files')
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!files.length) {
      setFeedback({ type: 'error', message: 'Selecione ao menos um arquivo de áudio.' });
      return;
    }

    await runMutation(
      () => mediaService.uploadRandomAudios(files),
      (library) => {
        setAudioLibrary(library);
        if (typeof form?.reset === 'function') {
          form.reset();
        }
      },
      'Biblioteca de áudios aleatórios atualizada.'
    );
  };

  const handleSpriteRemove = async (variant: string) => {
    await runMutation(
      () => mediaService.deleteSprite(variant),
      (library) => setBotLibrary(library),
      'Sprite removida.'
    );
  };

  const handleTransitionRemove = async (direction: 'in' | 'out') => {
    await runMutation(
      () => mediaService.deleteTransition(direction),
      (library) => setAudioLibrary(library),
      direction === 'in' ? 'Transição de entrada removida.' : 'Transição de saída removida.'
    );
  };

  const handleRandomRemove = async (fileUrl: string) => {
    const fileName = filenameFromUrl(fileUrl);
    await runMutation(
      () => mediaService.deleteRandomAudio(fileName),
      (library) => setAudioLibrary(library),
      'Áudio removido.'
    );
  };

  return (
    <div className="media-manager">
      <div className="error-message" style={{ marginBottom: '24px', border: '2px dashed #ff4d5a' }}>
        <strong>🚧 EM CONSTRUÇÃO 🚧</strong>
        <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>
          AINDA ESTÁ SENDO CONTRUÍDA ESSA PARTE DO SITE, PODE SER QUE VOCÊ PASSE POR PROBLEMAS AO UTILIZAR ELE,
          ACONSELHADO A MODIFICAÇÃO MANUAL
        </p>
      </div>

      {feedback?.type === 'success' && <p className="panel__toast">{feedback.message}</p>}
      {feedback?.type === 'error' && <p className="error-message">{feedback.message}</p>}

      <section className="panel">
        <div className="panel__header">
          <span className="status-dot" /> Sprites do Bot
        </div>
        <p>Envie as variações "open" e "closed" para controlar a animação de boca.</p>
        <form className="media-upload" onSubmit={handleSpriteUpload}>
          <label className="timer-form__label" htmlFor="bot-variant">
            Tipo de sprite
          </label>
          <select id="bot-variant" name="variant" className="form-select" defaultValue="open" disabled={isBusy}>
            <option value="open">Boca aberta (open)</option>
            <option value="closed">Boca fechada (closed)</option>
          </select>

          <label className="timer-form__label" htmlFor="bot-file">
            Arquivo do bot
          </label>
          <input id="bot-file" type="file" name="sprite" accept="image/png,image/svg+xml" className="form-input" disabled={isBusy} />

          <button type="submit" className="timer-form__test" disabled={isBusy}>
            {isBusy ? 'Enviando...' : 'Salvar sprite'}
          </button>
        </form>
        <div className="media-manager__list">
          <strong>Sprites existentes</strong>
          {botLibrary?.sprites.length ? (
            <ul>
              {botLibrary.sprites.map((sprite) => (
                <li key={sprite.url} className="media-manager__item">
                  <span>{sprite.name}</span>
                  <button
                    type="button"
                    className="media-manager__remove"
                    onClick={() => handleSpriteRemove(sprite.name)}
                    disabled={isBusy}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="media-manager__empty">Nenhuma imagem cadastrada ainda.</p>
          )}
        </div>
      </section>

      <section className="panel secondary">
        <div className="panel__header">
          <span className="status-dot" /> Áudios de Transição
        </div>
        <p>Substitua os áudios de abertura e encerramento do bot.</p>
        <div className="media-manager__grid">
          <form className="media-upload" onSubmit={handleTransitionUpload('in')}>
            <label className="timer-form__label" htmlFor="transition-in">
              Transição de entrada
            </label>
            <input id="transition-in" type="file" name="audio" accept="audio/*" className="form-input" disabled={isBusy} />
            <button type="submit" className="timer-form__test" disabled={isBusy}>
              {isBusy ? 'Enviando...' : 'Atualizar entrada'}
            </button>
            {audioLibrary && (
              <p className="media-manager__status">
                Atual: {filenameFromUrl(audioLibrary.transitions.in)}
                <button
                  type="button"
                  className="media-manager__link"
                  onClick={() => handleTransitionRemove('in')}
                  disabled={isBusy || !audioLibrary.transitions.in}
                >
                  Remover
                </button>
              </p>
            )}
          </form>
          <form className="media-upload" onSubmit={handleTransitionUpload('out')}>
            <label className="timer-form__label" htmlFor="transition-out">
              Transição de saída
            </label>
            <input id="transition-out" type="file" name="audio" accept="audio/*" className="form-input" disabled={isBusy} />
            <button type="submit" className="timer-form__test" disabled={isBusy}>
              {isBusy ? 'Enviando...' : 'Atualizar saída'}
            </button>
            {audioLibrary && (
              <p className="media-manager__status">
                Atual: {filenameFromUrl(audioLibrary.transitions.out)}
                <button
                  type="button"
                  className="media-manager__link"
                  onClick={() => handleTransitionRemove('out')}
                  disabled={isBusy || !audioLibrary.transitions.out}
                >
                  Remover
                </button>
              </p>
            )}
          </form>
        </div>
      </section>

      <section className="panel secondary">
        <div className="panel__header">
          <span className="status-dot" /> Áudios Aleatórios
        </div>
        <p>Envie vários arquivos para compor a lista de falas aleatórias.</p>
        <form className="media-upload" onSubmit={handleRandomUpload}>
          <label className="timer-form__label" htmlFor="random-files">
            Arquivos de áudio
          </label>
          <input id="random-files" type="file" name="files" multiple accept="audio/*" className="form-input" disabled={isBusy} />
          <button type="submit" className="timer-form__test" disabled={isBusy}>
            {isBusy ? 'Enviando...' : 'Adicionar áudios'}
          </button>
        </form>
        <div className="media-manager__list">
          <strong>Total de áudios: {audioLibrary?.random.length ?? 0}</strong>
          {audioLibrary?.random.length ? (
            <ul>
              {audioLibrary.random.map((item) => (
                <li key={item} className="media-manager__item">
                  <span>{filenameFromUrl(item)}</span>
                  <button
                    type="button"
                    className="media-manager__remove"
                    onClick={() => handleRandomRemove(item)}
                    disabled={isBusy}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="media-manager__empty">Nenhum áudio cadastrado.</p>
          )}
        </div>
      </section>

      {isLoading && <p className="media-manager__status">Carregando biblioteca...</p>}
    </div>
  );
};
