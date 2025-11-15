export const entranceAnimationOptions = [
  { value: 'slide-up', label: 'Subir suave' },
  { value: 'pop-bounce', label: 'Pulso elástico' }
] as const;

export type ViewerEntranceAnimation = (typeof entranceAnimationOptions)[number]['value'];

export const exitAnimationOptions = [
  { value: 'slide-down', label: 'Deslizar para baixo' },
  { value: 'spin-fall', label: 'Salto com giros' }
] as const;

export type ViewerExitAnimation = (typeof exitAnimationOptions)[number]['value'];

export interface ViewerPreferences {
  entranceAnimation: ViewerEntranceAnimation;
  exitAnimation: ViewerExitAnimation;
  exitDelayMs: number;
}

export type ViewerPreferencesPayload = Partial<ViewerPreferences>;

export const defaultViewerPreferences: ViewerPreferences = {
  entranceAnimation: 'slide-up',
  exitAnimation: 'slide-down',
  exitDelayMs: 4000
};
