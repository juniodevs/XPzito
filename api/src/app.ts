import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { TimerStore } from './timerStore';
import { timerRouter } from './routes/timer';
import { mediaRouter } from './routes/media';
import { CLIENT_BUILD_DIR, PUBLIC_DIR } from './config';

export const createApp = (timerStore: TimerStore) => {
  const app = express();

  const corsOptions: cors.CorsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Content-Length'],
    optionsSuccessStatus: 204
  };

  app.use((req, res, next) => {
    const wantsPrivateNetwork = req.headers['access-control-request-private-network'];
    if (wantsPrivateNetwork === 'true') {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use(
    '/media',
    express.static(path.join(PUBLIC_DIR, 'media'), {
      maxAge: 0,
      etag: false,
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    })
  );

  app.use('/api/timer', timerRouter(timerStore));
  app.use('/api/media', mediaRouter());
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

  if (fs.existsSync(CLIENT_BUILD_DIR)) {
    app.use(express.static(CLIENT_BUILD_DIR));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(CLIENT_BUILD_DIR, 'index.html'));
    });
  }

  return app;
};
