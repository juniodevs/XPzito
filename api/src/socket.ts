import { Server as SocketIOServer } from 'socket.io';
import { TimerStore, TimerState } from './timerStore';

export const configureSocket = (io: SocketIOServer, timerStore: TimerStore) => {
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
};
