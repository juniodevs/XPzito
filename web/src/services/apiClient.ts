import { API_BASE_URL } from '@/lib/env';

interface ApiError {
  message?: string;
}

export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    },
    ...init
  });

  if (!response.ok) {
    let message = 'Falha ao comunicar com o servidor.';
    try {
      const body = (await response.json()) as ApiError;
      if (body?.message) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
