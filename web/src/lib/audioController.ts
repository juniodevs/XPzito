import { Howl, Howler } from 'howler';

export interface AudioHandle {
  play: (src: string) => Promise<void>;
  stop: () => void;
  unlock: () => Promise<void>;
  isUnlocked: () => boolean;
}

let currentHowl: Howl | null = null;

const disposeCurrent = () => {
  if (currentHowl) {
    currentHowl.stop();
    currentHowl.unload();
    currentHowl = null;
  }
};

// Chrome/Safari suspend the shared Web Audio context until a gesture happens.
const ensureContextActive = async () => {
  const ctx = Howler.ctx;
  if (ctx && ctx.state === 'suspended') {
    await ctx.resume();
  }
};

const isContextUnlocked = () => {
  const ctx = Howler.ctx;
  return Boolean(ctx && ctx.state === 'running');
};

export const audioController: AudioHandle = {
  play: async (src: string) => {
    await ensureContextActive();

    return new Promise<void>((resolve, reject) => {
      disposeCurrent();
      currentHowl = new Howl({
        src: [src],
        preload: true,
        volume: 0.85,
        onend: () => {
          disposeCurrent();
          resolve();
        },
        onloaderror: (_id, error) => {
          disposeCurrent();
          reject(error ?? new Error('Falha ao carregar áudio.'));
        },
        onplayerror: (_id, error) => {
          disposeCurrent();
          reject(error ?? new Error('Falha ao reproduzir áudio.'));
        }
      });
      currentHowl.play();
    });
  },
  stop: () => disposeCurrent(),
  unlock: async () => {
    await ensureContextActive();
  },
  isUnlocked: () => isContextUnlocked()
};
