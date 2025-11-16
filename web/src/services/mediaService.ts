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

const apiBase = API_BASE_URL.replace(/\/$/, '');

const normalizeAudioLibrary = (library: AudioLibrary): AudioLibrary => ({
  transitions: {
    in: normalizeUrl(library.transitions.in),
    out: normalizeUrl(library.transitions.out)
  },
  random: library.random.map((item) => normalizeUrl(item))
});

const normalizeBotLibrary = (library: BotLibrary): BotLibrary => ({
  sprites: library.sprites.map((sprite) => ({
    ...sprite,
    url: normalizeUrl(sprite.url)
  }))
});

const sendRequest = async <T>(endpoint: string, init: RequestInit): Promise<T> => {
  const response = await fetch(`${apiBase}${endpoint}`, init);
  if (!response.ok) {
    let message = 'Falha ao salvar arquivos.';
    try {
      const payload = await response.json();
      if (typeof payload?.message === 'string') {
        message = payload.message;
      }
    } catch {
      const fallback = await response.text();
      if (fallback) {
        message = fallback;
      }
    }
    throw new Error(message);
  }
  return response.json();
};

const uploadFormData = async <T>(endpoint: string, formData: FormData): Promise<T> =>
  sendRequest<T>(endpoint, {
    method: 'POST',
    body: formData
  });

export const mediaService = {
  audioLibrary: async () => {
    const library = await apiFetch<AudioLibrary>('/api/media/audio');
    return normalizeAudioLibrary(library);
  },
  botLibrary: async () => {
    const library = await apiFetch<BotLibrary>('/api/media/bot');
    return normalizeBotLibrary(library);
  },
  uploadSprite: async (variant: string, file: File) => {
    const formData = new FormData();
    formData.append('variant', variant);
    formData.append('sprite', file);
    const library = await uploadFormData<BotLibrary>('/api/media/bot', formData);
    return normalizeBotLibrary(library);
  },
  uploadTransition: async (direction: 'in' | 'out', file: File) => {
    const formData = new FormData();
    formData.append('direction', direction);
    formData.append('audio', file);
    const library = await uploadFormData<AudioLibrary>('/api/media/audio/transition', formData);
    return normalizeAudioLibrary(library);
  },
  uploadRandomAudios: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const library = await uploadFormData<AudioLibrary>('/api/media/audio/random', formData);
    return normalizeAudioLibrary(library);
  },
  deleteSprite: async (variant: string) => {
    const library = await sendRequest<BotLibrary>(`/api/media/bot/${encodeURIComponent(variant)}`, {
      method: 'DELETE'
    });
    return normalizeBotLibrary(library);
  },
  deleteTransition: async (direction: 'in' | 'out') => {
    const library = await sendRequest<AudioLibrary>(`/api/media/audio/transition/${direction}`, {
      method: 'DELETE'
    });
    return normalizeAudioLibrary(library);
  },
  deleteRandomAudio: async (fileName: string) => {
    const library = await sendRequest<AudioLibrary>(`/api/media/audio/random?file=${encodeURIComponent(fileName)}`, {
      method: 'DELETE'
    });
    return normalizeAudioLibrary(library);
  }
};
