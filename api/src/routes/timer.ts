import { Router } from 'express';
import {
  TimerStore,
  entranceAnimations,
  exitAnimations,
  type ViewerPreferences
} from '../timerStore';

export const timerRouter = (store: TimerStore) => {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(store.getState());
  });

  router.post('/start', (req, res) => {
    const { durationSeconds } = req.body ?? {};
    const parsed = Number(durationSeconds);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({
        message: 'durationSeconds deve ser um número maior que zero'
      });
    }

    store.start(parsed);
    res.status(201).json(store.getState());
  });

  router.post('/cancel', (_req, res) => {
    store.cancel();
    res.json(store.getState());
  });

  router.post('/ack-trigger', (_req, res) => {
    store.acknowledgeTrigger();
    res.json(store.getState());
  });

  router.post('/viewer-preferences', (req, res) => {
    const { entranceAnimation, exitAnimation, exitDelayMs } = req.body ?? {};
    const payload: Partial<ViewerPreferences> = {};

    if (entranceAnimation !== undefined) {
      if (!entranceAnimations.includes(entranceAnimation)) {
        return res.status(400).json({ message: 'entranceAnimation inválido' });
      }
      payload.entranceAnimation = entranceAnimation;
    }

    if (exitAnimation !== undefined) {
      if (!exitAnimations.includes(exitAnimation)) {
        return res.status(400).json({ message: 'exitAnimation inválido' });
      }
      payload.exitAnimation = exitAnimation;
    }

    if (exitDelayMs !== undefined) {
      const parsedDelay = Number(exitDelayMs);
      if (!Number.isFinite(parsedDelay) || parsedDelay < 0) {
        return res.status(400).json({ message: 'exitDelayMs deve ser um número positivo' });
      }
      payload.exitDelayMs = Math.round(parsedDelay);
    }

    store.updateViewerPreferences(payload);
    res.json(store.getState());
  });

  return router;
};
