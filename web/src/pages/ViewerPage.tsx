import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { mediaService } from '@/services/mediaService';
import { audioController } from '@/lib/audioController';
import { useTimerChannel } from '@/hooks/useTimerChannel';
import type { AudioLibrary, BotSprite } from '@/types/media';
import { type ViewerEntranceAnimation, type ViewerExitAnimation } from '@/types/viewer';
import { loadViewerPreferences, resolveViewerPreferences } from '@/lib/viewerPreferencesStorage';

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

  const animateEntrance = useCallback((type: ViewerEntranceAnimation) => {
    const target = botRef.current;
    if (!target) {
      return Promise.resolve();
    }
    switch (type) {
      case 'pop-bounce':
        gsap.set(target, { display: 'flex', opacity: 0, scale: 0.8, yPercent: 0, rotation: 0 });
        return new Promise<void>((resolve) => {
          gsap.to(target, {
            opacity: 1,
            scale: 1,
            duration: 0.85,
            ease: 'back.out(2)',
            onComplete: resolve
          });
        });
      case 'slide-up':
      default:
        gsap.set(target, { display: 'flex', yPercent: 140, opacity: 0, rotation: 0 });
        return new Promise<void>((resolve) => {
          gsap.to(target, {
            yPercent: 0,
            opacity: 1,
            duration: 1.15,
            ease: 'power4.out',
            onComplete: resolve
          });
        });
    }
  }, []);

  const animateExit = useCallback((type: ViewerExitAnimation) => {
    const target = botRef.current;
    if (!target) {
      return Promise.resolve();
    }
    switch (type) {
      case 'spin-fall':
        gsap.set(target, { transformOrigin: '50% 50%' });
        return new Promise<void>((resolve) => {
          const tl = gsap.timeline({ onComplete: resolve });
          tl.to(target, {
            yPercent: -15,
            duration: 0.2,
            ease: 'power1.out'
          });
          tl.to(target, {
            yPercent: 160,
            rotation: -720,
            opacity: 0,
            duration: 1.2,
            ease: 'power2.in'
          });
        });
      case 'slide-down':
      default:
        return new Promise<void>((resolve) => {
          gsap.to(target, {
            yPercent: 140,
            opacity: 0,
            duration: 1.1,
            ease: 'power4.in',
            onComplete: () => resolve()
          });
        });
    }
  }, []);

  const playTransition = useCallback(
    (direction: 'in' | 'out') => {
      if (!audioLibrary) {
        return Promise.resolve();
      }
      const src = audioLibrary.transitions[direction];
      if (!src) {
        return Promise.resolve();
      }
      return audioController.play(src);
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

  const viewer = useMemo(
    () => resolveViewerPreferences(state.viewer, typeof window === 'undefined' ? null : loadViewerPreferences()),
    [state.viewer]
  );

  const runSequence = useCallback(async () => {
    if (playbackLock.current || !audioLibrary || !sprites.length) {
      return;
    }
    playbackLock.current = true;
    try {
      await Promise.all([animateEntrance(viewer.entranceAnimation), playTransition('in')]);
      await playRandomSpeech();
      await wait(Math.max(0, viewer.exitDelayMs));
      await Promise.all([animateExit(viewer.exitAnimation), playTransition('out')]);
      socket.emit('timer:ack-trigger');
    } catch (err) {
      console.error(err);
      setError('Falha ao reproduzir a animação/áudio. Confira os arquivos.');
    } finally {
      playbackLock.current = false;
      stopMouthAnimation();
    }
  }, [animateEntrance, animateExit, audioLibrary, playRandomSpeech, playTransition, socket, sprites.length, viewer]);

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

  useEffect(() => {
    // Try to unlock audio context automatically on mount. Browsers may still
    // block this if no user gesture is available; playback will fall back to
    // HTML5 where necessary.
    audioController.unlock().catch(() => {
      // Silent failure — we purposely do not show any UI.
    });
  }, []);

  return (
    <div className="viewer-overlay">
      {/* No audio gate or prompts — attempt automatic unlock only. */}
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
