import { Howl } from 'howler';

export interface AudioHandle {
  play: (src: string) => Promise<void>;
  stop: () => void;
}

let currentHowl: Howl | null = null;

const disposeCurrent = () => {
  if (currentHowl) {
    currentHowl.stop();
    currentHowl.unload();
    currentHowl = null;
  }
};

export const audioController: AudioHandle = {
  play: (src: string) =>
    new Promise<void>((resolve, reject) => {
      disposeCurrent();
      currentHowl = new Howl({
        src: [src],
        html5: true,
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
    }),
  stop: () => disposeCurrent()
};
