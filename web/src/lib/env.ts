const devDefault = 'http://localhost:4000';

export const API_BASE_URL = ((): string => {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return devDefault;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
})();

export const SOCKET_PATH = (import.meta.env.VITE_SOCKET_PATH as string | undefined) ?? '/socket.io';
