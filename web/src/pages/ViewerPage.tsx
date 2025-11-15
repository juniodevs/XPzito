import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { mediaService } from '@/services/mediaService';
import { audioController } from '@/lib/audioController';
import { useTimerChannel } from '@/hooks/useTimerChannel';
import type { AudioLibrary, BotSprite } from '@/types/media';

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const ViewerPage = () => {
  const { state, socket } = useTimerChannel();
  const [audioLibrary, setAudioLibrary] = useState<AudioLibrary | null>(null);
  const [sprites, setSprites] = useState<BotSprite[]>([]);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const botRef = useRef<HTMLDivElement | null>(null);
  const playbackLock = useRef(false);
  const mouthIntervalRef = useRef<ReturnType<typeof window.setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;
    mediaService
      .audioLibrary()
      .then((library) => mounted && setAudioLibrary(library))
      .catch(() => mounted && setError('Falha ao carregar biblioteca de áudio.'));
    mediaService
      .botLibrary()
      .then((library) => mounted && setSprites(library.sprites))
      .catch(() => mounted && setError('Falha ao carregar sprites do bot.'));
    return () => {
      mounted = false;
    };
  }, []);

  const openSprite = useMemo(() => {
    if (!sprites.length) {
      return undefined;
    }
    return sprites.find((sprite) => /open/i.test(sprite.name)) ?? sprites[0];
  }, [sprites]);

  const closedSprite = useMemo(() => {
    if (!sprites.length) {
      return undefined;
    }
    return sprites.find((sprite) => /closed/i.test(sprite.name)) ?? sprites.at(-1);
  }, [sprites]);

  const currentSprite = mouthOpen ? openSprite ?? closedSprite : closedSprite ?? openSprite;

  const stopMouthAnimation = () => {
    if (mouthIntervalRef.current) {
      window.clearInterval(mouthIntervalRef.current);
      mouthIntervalRef.current = null;
    }
    setMouthOpen(false);
  };

  useEffect(() => () => stopMouthAnimation(), []);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    body.classList.add('viewer-mode');
    root.classList.add('viewer-mode');
    return () => {
      body.classList.remove('viewer-mode');
      root.classList.remove('viewer-mode');
    };
  }, []);

  const animateEntrance = useCallback(() => {
    const target = botRef.current;
    if (!target) {
      return Promise.resolve();
    }
    gsap.set(target, { display: 'flex', yPercent: 140, opacity: 0 });
    return new Promise<void>((resolve) => {
      gsap.to(target, {
        yPercent: 0,
        opacity: 1,
        duration: 1.15,
        ease: 'power4.out',
        onComplete: resolve
      });
    });
  }, []);

  const animateExit = useCallback(() => {
    const target = botRef.current;
    if (!target) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      gsap.to(target, {
        yPercent: 140,
        opacity: 0,
        duration: 1.1,
        ease: 'power4.in',
        onComplete: () => resolve()
      });
    });
  }, []);

  const playTransition = useCallback(
    (direction: 'in' | 'out') => {
      if (!audioLibrary) {
        return Promise.resolve();
      }
      return audioController.play(audioLibrary.transitions[direction]);
    },
    [audioLibrary]
  );

  const playRandomSpeech = useCallback(async () => {
    if (!audioLibrary || !audioLibrary.random.length) {
      return wait(1500);
    }
    const pick = audioLibrary.random[Math.floor(Math.random() * audioLibrary.random.length)];
    mouthIntervalRef.current = window.setInterval(() => {
      setMouthOpen((value) => !value);
    }, 180);
    await audioController.play(pick);
    stopMouthAnimation();
  }, [audioLibrary]);

  const runSequence = useCallback(async () => {
    if (playbackLock.current || !audioLibrary || !sprites.length) {
      return;
    }
    playbackLock.current = true;
    try {
      await Promise.all([animateEntrance(), playTransition('in')]);
      await playRandomSpeech();
      await wait(4000);
      await Promise.all([animateExit(), playTransition('out')]);
      socket.emit('timer:ack-trigger');
    } catch (err) {
      console.error(err);
      setError('Falha ao reproduzir a animação/áudio. Confira os arquivos.');
    } finally {
      playbackLock.current = false;
      stopMouthAnimation();
    }
  }, [animateEntrance, animateExit, audioLibrary, playRandomSpeech, playTransition, socket, sprites.length]);

  useEffect(() => {
    const handler = () => runSequence();
    socket.on('timer:trigger', handler);
    socket.on('timer:preview', handler);
    return () => {
      socket.off('timer:trigger', handler);
      socket.off('timer:preview', handler);
    };
  }, [socket, runSequence]);

  useEffect(() => {
    if (state.status === 'triggered' && !playbackLock.current) {
      runSequence();
    }
  }, [state.status, runSequence]);

  return (
    <div className="viewer-overlay">
      <div className="bot-stage bot-stage--floating" ref={botRef}>
        {currentSprite ? (
          <img src={currentSprite.url} alt="Bot" className={mouthOpen ? 'bot-mouth-open' : 'bot-mouth-closed'} />
        ) : (
          <div className="viewer-loader" aria-live="polite">
            Carregando bot...
          </div>
        )}
      </div>
      {error && <div className="viewer-error">{error}</div>}
    </div>
  );
};
