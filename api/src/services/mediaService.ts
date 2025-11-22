import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  PUBLIC_MEDIA_DIR,
  MEDIA_MIRROR_DIRS,
  AUDIO_DIR,
  BOT_DIR,
  TRANSITION_DIR,
  RANDOM_DIR,
  SUPPORTED_BOT_EXTENSIONS,
  SUPPORTED_AUDIO_EXTENSIONS
} from '../config';

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

export const resolveFileName = (raw: string) => ensureSafeFileName(toFileNameCandidate(raw));

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
    await Promise.all([
      ensureDir(BOT_DIR),
      ensureDir(AUDIO_DIR),
      ensureDir(TRANSITION_DIR),
      ensureDir(RANDOM_DIR)
    ]);
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

export const removeFromMirrors = async (relativePaths: string[]) => {
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

export const writeMediaFile = async (targetPath: string, contents: Buffer) => {
  await fs.writeFile(targetPath, contents);
  const relativePath = path.relative(PUBLIC_MEDIA_DIR, targetPath);
  await mirrorRelativeFiles([relativePath]);
};

export const removeFilesByPrefix = async (dir: string, prefix: string) => {
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

export const buildAudioLibrary = async () => {
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

export const buildBotLibrary = async () => {
  const botFiles = (await safeReaddir(BOT_DIR)).filter((file) =>
    SUPPORTED_BOT_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
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

export const sanitizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'bot';

export const ensureAudioExtension = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();
  return ext && SUPPORTED_AUDIO_EXTENSIONS.has(ext) ? ext : '';
};

export const safeReaddirPublic = safeReaddir;
