import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '@/config/env';

let socket: Socket | null = null;

function socketBaseUrl() {
  const raw = ENV.API_URL || '';
  return raw.replace(/\/api\/?$/, '');
}

export async function getCommunitySocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io(`${socketBaseUrl()}/community`, {
    transports: ['websocket'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 8,
  });

  return socket;
}

export function disconnectCommunitySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
