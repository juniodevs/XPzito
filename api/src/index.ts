import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { TimerStore } from './timerStore';
import { createApp } from './app';
import { configureSocket } from './socket';
import { HOST, PORT } from './config';

const timerStore = new TimerStore();
const app = createApp(timerStore);
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

configureSocket(io, timerStore);

server.listen(PORT, HOST, () => {
  console.log(`[api] listening on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
});
