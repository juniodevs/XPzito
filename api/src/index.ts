import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { TimerStore, TimerState } from './timerStore';
import { timerRouter } from './routes/timer';
import { mediaRouter } from './routes/media';

const PORT = Number(process.env.PORT ?? 4000);
const isCompiled = __dirname.includes(`${path.sep}dist${path.sep}`);
const WORKSPACE_ROOT = isCompiled
  ? path.resolve(__dirname, '../../..')
  : path.resolve(__dirname, '../..');
const CLIENT_BUILD_DIR = path.join(WORKSPACE_ROOT, 'web', 'dist');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*'
  }
});
const timerStore = new TimerStore();

app.use(cors());
app.use(express.json());
app.use('/media', express.static(path.join(PUBLIC_DIR, 'media'), { maxAge: '1d' }));

app.use('/api/timer', timerRouter(timerStore));
app.use('/api/media', mediaRouter());
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

io.on('connection', (socket) => {
  const emitState = (state: TimerState) => socket.emit('timer:state', state);
  const emitTrigger = () => socket.emit('timer:trigger');

  emitState(timerStore.getState());

  timerStore.on('timer:update', emitState);
  timerStore.on('timer:trigger', emitTrigger);

  socket.on('disconnect', () => {
    timerStore.off('timer:update', emitState);
    timerStore.off('timer:trigger', emitTrigger);
  });

  socket.on('timer:ack-trigger', () => timerStore.acknowledgeTrigger());
  socket.on('timer:test', () => {
    io.emit('timer:preview');
  });
});

if (fs.existsSync(CLIENT_BUILD_DIR)) {
  app.use(express.static(CLIENT_BUILD_DIR));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_BUILD_DIR, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
