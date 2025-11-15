import type { AudioLibrary, BotLibrary } from '@/types/media';
import { apiFetch } from './apiClient';

export const mediaService = {
  audioLibrary: () => apiFetch<AudioLibrary>('/api/media/audio'),
  botLibrary: () => apiFetch<BotLibrary>('/api/media/bot')
};
