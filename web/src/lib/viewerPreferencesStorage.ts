import { defaultViewerPreferences, type ViewerPreferences } from '@/types/viewer';

const STORAGE_KEY = 'xpzito.viewer.preferences';

const normalizePreferences = (prefs?: Partial<ViewerPreferences>): ViewerPreferences => ({
  entranceAnimation: prefs?.entranceAnimation ?? defaultViewerPreferences.entranceAnimation,
  exitAnimation: prefs?.exitAnimation ?? defaultViewerPreferences.exitAnimation,
  exitDelayMs:
    typeof prefs?.exitDelayMs === 'number' && Number.isFinite(prefs.exitDelayMs) && prefs.exitDelayMs >= 0
      ? prefs.exitDelayMs
      : defaultViewerPreferences.exitDelayMs
});

export const loadViewerPreferences = (): ViewerPreferences | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ViewerPreferences>;
    return normalizePreferences(parsed);
  } catch (error) {
    console.warn('[viewerPrefs] Falha ao carregar preferências persistidas', error);
    return null;
  }
};

export const saveViewerPreferences = (prefs: ViewerPreferences) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const normalized = normalizePreferences(prefs);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('[viewerPrefs] Falha ao salvar preferências persistidas', error);
  }
};

export const resolveViewerPreferences = (
  ...sources: Array<Partial<ViewerPreferences> | null | undefined>
): ViewerPreferences => {
  const merged = sources.reduce<Partial<ViewerPreferences>>((acc, source) => {
    if (!source) {
      return acc;
    }
    return { ...acc, ...source };
  }, {});
  return normalizePreferences(merged);
};
