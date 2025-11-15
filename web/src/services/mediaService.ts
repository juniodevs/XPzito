import type { AudioLibrary, BotLibrary } from '@/types/media';
import { API_BASE_URL } from '@/lib/env';
import { apiFetch } from './apiClient';

const normalizeUrl = (url: string) => {
  if (!url) {
    return url;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
};

export const mediaService = {
  audioLibrary: async () => {
    const library = await apiFetch<AudioLibrary>('/api/media/audio');
    return {
      transitions: {
        in: normalizeUrl(library.transitions.in),
        out: normalizeUrl(library.transitions.out)
      },
      random: library.random.map((item) => normalizeUrl(item))
    } satisfies AudioLibrary;
  },
  botLibrary: async () => {
    const library = await apiFetch<BotLibrary>('/api/media/bot');
    return {
      sprites: library.sprites.map((sprite) => ({
        ...sprite,
        url: normalizeUrl(sprite.url)
      }))
    } satisfies BotLibrary;
  }
};
