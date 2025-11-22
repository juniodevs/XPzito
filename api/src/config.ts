import path from 'node:path';

export const PORT = Number(process.env.PORT ?? 4000);
export const HOST = process.env.HOST ?? '0.0.0.0';

const isCompiled = __dirname.includes(`${path.sep}dist${path.sep}`);
export const WORKSPACE_ROOT = isCompiled
  ? path.resolve(__dirname, '../../..')
  : path.resolve(__dirname, '../..');

export const CLIENT_BUILD_DIR = path.join(WORKSPACE_ROOT, 'web', 'dist');
export const PUBLIC_DIR = path.resolve(__dirname, '../public');

export const PUBLIC_MEDIA_DIR = path.join(PUBLIC_DIR, 'media');
export const MEDIA_MIRROR_DIRS = (() => {
  const distMediaDir = path.join(WORKSPACE_ROOT, 'api', 'dist', 'public', 'media');
  return distMediaDir === PUBLIC_MEDIA_DIR ? [] : [distMediaDir];
})();

export const AUDIO_DIR = path.join(PUBLIC_MEDIA_DIR, 'audio');
export const BOT_DIR = path.join(PUBLIC_MEDIA_DIR, 'bot');
export const TRANSITION_DIR = path.join(AUDIO_DIR, 'transition');
export const RANDOM_DIR = path.join(AUDIO_DIR, 'random');

export const SUPPORTED_BOT_EXTENSIONS = new Set(['.svg', '.png']);
export const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
