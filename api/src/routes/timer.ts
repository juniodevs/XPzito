import { Router } from 'express';
import { TimerStore } from '../timerStore';

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

  return router;
};
