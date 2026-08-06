import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '@/config/env';

let socket: Socket | null = null;
let connecting: Promise<Socket> | null = null;

function socketBaseUrl() {
  const raw = ENV.API_URL || '';
  return raw.replace(/\/api\/?$/, '');
}

function waitUntilConnected(sock: Socket, timeoutMs = 8000): Promise<Socket> {
  if (sock.connected) return Promise.resolve(sock);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Community socket connect timeout'));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve(sock);
    };
    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      sock.off('connect', onConnect);
      sock.off('connect_error', onError);
    };

    sock.on('connect', onConnect);
    sock.on('connect_error', onError);
  });
}

export async function getCommunitySocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    if (socket) {
      socket.auth = { token };
      if (!socket.connected) socket.connect();
      return waitUntilConnected(socket);
    }

    socket = io(`${socketBaseUrl()}/community`, {
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
    });

    return waitUntilConnected(socket);
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/** Update auth token and reconnect after login. */
export async function reconnectCommunitySocket(): Promise<Socket | null> {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    disconnectCommunitySocket();
    return null;
  }

  if (socket) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();
    try {
      return await waitUntilConnected(socket);
    } catch {
      return socket;
    }
  }

  try {
    return await getCommunitySocket();
  } catch {
    return null;
  }
}

export function disconnectCommunitySocket() {
  connecting = null;
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
