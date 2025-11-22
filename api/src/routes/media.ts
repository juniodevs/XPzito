import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import {
  AUDIO_DIR,
  BOT_DIR,
  PUBLIC_MEDIA_DIR,
  SUPPORTED_BOT_EXTENSIONS
} from '../config';
import {
  buildAudioLibrary,
  buildBotLibrary,
  ensureAudioExtension,
  removeFilesByPrefix,
  removeFromMirrors,
  resolveFileName,
  safeReaddirPublic,
  sanitizeSlug,
  writeMediaFile
} from '../services/mediaService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

export const mediaRouter = () => {
  const router = Router();

  router.get('/audio', async (_req, res) => {
    const library = await buildAudioLibrary();
    res.json(library);
  });

  router.get('/bot', async (_req, res) => {
    const library = await buildBotLibrary();
    res.json(library);
  });

  router.post('/bot', upload.single('sprite'), async (req, res) => {
    const file = req.file;
    const rawVariant = (req.body?.variant ?? '').toString();
    if (!file) {
      return res.status(400).json({ message: 'Envie um arquivo de imagem válido.' });
    }
    if (!rawVariant) {
      return res.status(400).json({ message: 'Informe qual variação do bot está enviando.' });
    }

    const ext = path.extname(file.originalname ?? '').toLowerCase();
    if (!SUPPORTED_BOT_EXTENSIONS.has(ext)) {
      return res.status(400).json({ message: 'Formato de imagem não suportado. Use PNG ou SVG.' });
    }

    const variant = sanitizeSlug(rawVariant);
    const baseName = variant.startsWith('bot-') ? variant : `bot-${variant}`;
    const targetPath = path.join(BOT_DIR, `${baseName}${ext}`);

    await removeFilesByPrefix(BOT_DIR, `${baseName}.`);
    await writeMediaFile(targetPath, file.buffer);

    const library = await buildBotLibrary();
    res.json(library);
  });

  router.delete('/bot/:variant', async (req, res) => {
    const rawVariant = req.params.variant;
    if (!rawVariant) {
      return res.status(400).json({ message: 'Informe qual sprite deseja remover.' });
    }

    const variant = sanitizeSlug(rawVariant);
    const baseName = variant.startsWith('bot-') ? variant : `bot-${variant}`;
    const files = await safeReaddirPublic(BOT_DIR);
    const target = files.find((file) => path.basename(file).startsWith(baseName));
    if (!target) {
      return res.status(404).json({ message: 'Sprite não encontrado.' });
    }

    try {
      await fs.unlink(target);
      await removeFromMirrors([path.relative(PUBLIC_MEDIA_DIR, target)]);
    } catch {
      return res.status(500).json({ message: 'Não foi possível remover o arquivo.' });
    }

    const library = await buildBotLibrary();
    res.json(library);
  });

  router.post('/audio/transition', upload.single('audio'), async (req, res) => {
    const file = req.file;
    const direction = (req.body?.direction ?? '').toString().toLowerCase();
    if (!file) {
      return res.status(400).json({ message: 'Envie um arquivo de áudio válido.' });
    }
    if (direction !== 'in' && direction !== 'out') {
      return res.status(400).json({ message: 'Informe se o áudio é de entrada (in) ou saída (out).' });
    }

    const ext = ensureAudioExtension(file.originalname ?? '');
    if (!ext) {
      return res.status(400).json({ message: 'Formato de áudio não suportado. Use MP3, WAV, OGG ou M4A.' });
    }

    const transitionDir = path.join(AUDIO_DIR, 'transition');
    const baseName = `transition-${direction}`;
    await removeFilesByPrefix(transitionDir, `${baseName}.`);
    await writeMediaFile(path.join(transitionDir, `${baseName}${ext}`), file.buffer);

    const library = await buildAudioLibrary();
    res.json(library);
  });

  router.delete('/audio/transition/:direction', async (req, res) => {
    const direction = req.params.direction?.toLowerCase();
    if (direction !== 'in' && direction !== 'out') {
      return res.status(400).json({ message: 'Informe se deseja remover o áudio de entrada (in) ou saída (out).' });
    }

    const transitionDir = path.join(AUDIO_DIR, 'transition');
    const baseName = `transition-${direction}`;
    const files = await safeReaddirPublic(transitionDir);
    const target = files.find((file) => path.basename(file).startsWith(baseName));
    if (!target) {
      return res.status(404).json({ message: 'Áudio de transição não encontrado.' });
    }

    try {
      await fs.unlink(target);
      await removeFromMirrors([path.relative(PUBLIC_MEDIA_DIR, target)]);
    } catch {
      return res.status(500).json({ message: 'Não foi possível remover o arquivo.' });
    }

    const library = await buildAudioLibrary();
    res.json(library);
  });

  router.post('/audio/random', upload.array('files', 10), async (req, res) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (!files.length) {
      return res.status(400).json({ message: 'Envie ao menos um arquivo de áudio.' });
    }

    const randomDir = path.join(AUDIO_DIR, 'random');

    for (const file of files) {
      const ext = ensureAudioExtension(file.originalname ?? '');
      if (!ext) {
        continue;
      }
      const slug = sanitizeSlug(path.basename(file.originalname ?? 'audio', ext));
      const uniqueName = `${slug}-${randomUUID()}${ext}`;
      await writeMediaFile(path.join(randomDir, uniqueName), file.buffer);
    }

    const library = await buildAudioLibrary();
    res.json(library);
  });

  router.delete('/audio/random', async (req, res) => {
    const file = req.query.file;
    if (typeof file !== 'string' || !file.trim()) {
      return res.status(400).json({ message: 'Informe qual áudio deseja remover.' });
    }

    const randomDir = path.join(AUDIO_DIR, 'random');
    const fileName = resolveFileName(file);
    if (!fileName) {
      return res.status(400).json({ message: 'Nome de arquivo inválido.' });
    }
    const targetPath = path.join(randomDir, fileName);

    try {
      await fs.unlink(targetPath);
      await removeFromMirrors([path.relative(PUBLIC_MEDIA_DIR, targetPath)]);
    } catch {
      return res.status(404).json({ message: 'Arquivo não encontrado ou já removido.' });
    }

    const library = await buildAudioLibrary();
    res.json(library);
  });

  return router;
};
