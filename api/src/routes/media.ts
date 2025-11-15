import { Router } from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';

const isCompiled = __dirname.includes(`${path.sep}dist${path.sep}`);
const PUBLIC_MEDIA_DIR = isCompiled
  ? path.resolve(__dirname, '../public/media')
  : path.resolve(__dirname, '../../public/media');
const AUDIO_DIR = path.join(PUBLIC_MEDIA_DIR, 'audio');
const BOT_DIR = path.join(PUBLIC_MEDIA_DIR, 'bot');

const asMediaPath = (absoluteFilePath: string) => {
  const relative = path.relative(PUBLIC_MEDIA_DIR, absoluteFilePath).replace(/\\/g, '/');
  return relative.startsWith('/') ? relative : `/${relative}`;
};

const safeReaddir = async (dir: string) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(dir, entry.name));
  } catch (error) {
    return [];
  }
};

export const mediaRouter = () => {
  const router = Router();

  router.get('/audio', async (_req, res) => {
    const transitionIn = path.join(AUDIO_DIR, 'transition', 'transition-in.mp3');
    const transitionOut = path.join(AUDIO_DIR, 'transition', 'transition-out.mp3');
    const randomDir = path.join(AUDIO_DIR, 'random');
    const randomFiles = await safeReaddir(randomDir);

    res.json({
      transitions: {
        in: `/media${asMediaPath(transitionIn)}`,
        out: `/media${asMediaPath(transitionOut)}`
      },
      random: randomFiles
        .sort((a, b) => a.localeCompare(b))
        .map((file) => `/media${asMediaPath(file)}`)
    });
  });

  router.get('/bot', async (_req, res) => {
    const botFiles = await safeReaddir(BOT_DIR);
    res.json({
      sprites: botFiles.sort((a, b) => a.localeCompare(b)).map((file) => ({
        name: path.basename(file, path.extname(file)),
        url: `/media${asMediaPath(file)}`
      }))
    });
  });

  return router;
};
