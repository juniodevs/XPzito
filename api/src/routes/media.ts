import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';

const API_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_MEDIA_DIR = path.join(API_ROOT, 'public', 'media');
const MEDIA_MIRROR_DIRS = (() => {
  const distMediaDir = path.join(API_ROOT, 'dist', 'public', 'media');
  return distMediaDir === PUBLIC_MEDIA_DIR ? [] : [distMediaDir];
})();
const AUDIO_DIR = path.join(PUBLIC_MEDIA_DIR, 'audio');
const BOT_DIR = path.join(PUBLIC_MEDIA_DIR, 'bot');
const TRANSITION_DIR = path.join(AUDIO_DIR, 'transition');
const RANDOM_DIR = path.join(AUDIO_DIR, 'random');
const SUPPORTED_BOT_EXTENSIONS = new Set(['.svg', '.png']);
const SUPPORTED_AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const stripUrlArtifacts = (value: string) => value.split(/[?#]/)[0];

const toFileNameCandidate = (raw: string) => {
  let value = raw.trim();
  if (!value) {
    return '';
  }

  try {
    const asUrl = new URL(value);
    value = asUrl.pathname;
  } catch {
    // Not a full URL, keep original string.
  }

  try {
    value = decodeURIComponent(value);
  } catch {
    // Ignore bad encodings and keep raw value.
  }

  const withoutArtifacts = stripUrlArtifacts(value);
  const normalized = withoutArtifacts.replace(/\\/g, '/');
  const segments = normalized.split('/');
  return segments.pop() ?? '';
};

const ensureSafeFileName = (candidate: string) => {
  if (!candidate) {
    return '';
  }
  if (candidate.includes('..') || /[\\/]/.test(candidate)) {
    return '';
  }
  return candidate;
};

const resolveFileName = (raw: string) => ensureSafeFileName(toFileNameCandidate(raw));

const asMediaPath = (absoluteFilePath: string) => {
  const relative = path.relative(PUBLIC_MEDIA_DIR, absoluteFilePath).replace(/\\/g, '/');
  return relative.startsWith('/') ? relative : `/${relative}`;
};

const toMediaUrl = (file?: string) => {
  if (!file) {
    return '';
  }
  return `/media${asMediaPath(file)}`;
};

const toVersionedMediaUrl = async (file?: string) => {
  const url = toMediaUrl(file);
  if (!file || !url) {
    return '';
  }
  try {
    const stats = await fs.stat(file);
    const version = Math.max(1, Math.round(stats.mtimeMs)).toString(36);
    return `${url}?v=${version}`;
  } catch {
    return url;
  }
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const ensureMediaStructure = (() => {
  let ready: Promise<void> | null = null;
  const prepare = async () => {
    await Promise.all([ensureDir(BOT_DIR), ensureDir(AUDIO_DIR), ensureDir(TRANSITION_DIR), ensureDir(RANDOM_DIR)]);
  };
  return () => {
    if (!ready) {
      ready = prepare();
    }
    return ready;
  };
})();

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

const fileExists = async (target: string) => {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    return false;
  }
};

const mirrorRelativeFiles = async (relativePaths: string[]) => {
  if (!relativePaths.length || !MEDIA_MIRROR_DIRS.length) {
    return;
  }

  await Promise.all(
    MEDIA_MIRROR_DIRS.map(async (mirrorRoot) => {
      await Promise.all(
        relativePaths.map(async (relativePath) => {
          const source = path.join(PUBLIC_MEDIA_DIR, relativePath);
          const target = path.join(mirrorRoot, relativePath);
          try {
            await fs.mkdir(path.dirname(target), { recursive: true });
            await fs.copyFile(source, target);
          } catch {
            // Ignore copy errors to avoid blocking uploads.
          }
        })
      );
    })
  );
};

const removeFromMirrors = async (relativePaths: string[]) => {
  if (!relativePaths.length || !MEDIA_MIRROR_DIRS.length) {
    return;
  }

  await Promise.all(
    MEDIA_MIRROR_DIRS.map(async (mirrorRoot) => {
      await Promise.all(
        relativePaths.map(async (relativePath) => {
          const target = path.join(mirrorRoot, relativePath);
          try {
            await fs.unlink(target);
          } catch {
            // Ignore unlink errors in mirrors.
          }
        })
      );
    })
  );
};

const writeMediaFile = async (targetPath: string, contents: Buffer) => {
  await fs.writeFile(targetPath, contents);
  const relativePath = path.relative(PUBLIC_MEDIA_DIR, targetPath);
  await mirrorRelativeFiles([relativePath]);
};

const removeFilesByPrefix = async (dir: string, prefix: string) => {
  await ensureDir(dir);
  const files = await safeReaddir(dir);
  const removed: string[] = [];
  await Promise.all(
    files
      .filter((file) => path.basename(file).startsWith(prefix))
      .map(async (file) => {
        try {
          await fs.unlink(file);
          removed.push(path.relative(PUBLIC_MEDIA_DIR, file));
        } catch (error) {
          // Ignore unlink errors to avoid blocking new uploads.
        }
      })
  );
  if (removed.length) {
    await removeFromMirrors(removed);
  }
};

const findFirstWithPrefix = async (dir: string, prefix: string) => {
  await ensureDir(dir);
  const files = await safeReaddir(dir);
  return files.find((file) => path.basename(file).startsWith(prefix));
};

const buildAudioLibrary = async () => {
  await ensureMediaStructure();
  const transitionIn = await findFirstWithPrefix(TRANSITION_DIR, 'transition-in');
  const transitionOut = await findFirstWithPrefix(TRANSITION_DIR, 'transition-out');
  const randomFiles = await safeReaddir(RANDOM_DIR);

  const [transitionInUrl, transitionOutUrl] = await Promise.all([
    toVersionedMediaUrl(transitionIn),
    toVersionedMediaUrl(transitionOut)
  ]);

  const random = await Promise.all(
    randomFiles
      .sort((a, b) => a.localeCompare(b))
      .map((file) => toVersionedMediaUrl(file))
  );

  return {
    transitions: {
      in: transitionInUrl,
      out: transitionOutUrl
    },
    random
  };
};

const buildBotLibrary = async () => {
  const botFiles = (await safeReaddir(BOT_DIR)).filter((file) => SUPPORTED_BOT_EXTENSIONS.has(path.extname(file).toLowerCase()));
  const sprites = await Promise.all(
    botFiles
      .sort((a, b) => a.localeCompare(b))
      .map(async (file) => ({
        name: path.basename(file, path.extname(file)),
        url: await toVersionedMediaUrl(file)
      }))
  );

  return { sprites };
};

const sanitizeSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'bot';

const ensureAudioExtension = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return ext && SUPPORTED_AUDIO_EXTENSIONS.has(ext) ? ext : '';
};

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

    await ensureDir(BOT_DIR);
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
    const files = await safeReaddir(BOT_DIR);
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
    await ensureDir(transitionDir);
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
    const files = await safeReaddir(transitionDir);
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
    await ensureDir(randomDir);

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
