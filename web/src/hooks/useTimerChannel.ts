import { useEffect, useMemo, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_PATH } from '@/lib/env';
import type { TimerState } from '@/types/timer';
import { initialTimerState } from '@/types/timer';

let socketInstance: Socket | null = null;

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      autoConnect: true
    });
  }
  return socketInstance;
};

export const useTimerChannel = () => {
  const [state, setState] = useState<TimerState>(initialTimerState);
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    const handleState = (payload: TimerState) => setState(payload);
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('timer:state', handleState);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('timer:state', handleState);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return { socket, state, isConnected };
};
