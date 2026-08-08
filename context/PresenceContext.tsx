import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  disconnectCommunitySocket,
  getCommunitySocket,
  reconnectCommunitySocket,
} from '@/services/communitySocket';
import { authApi } from '@/services/api';

type PresenceContextValue = {
  onlineIds: Set<string>;
  isOnline: (userId?: string | null) => boolean;
  refreshPresence: () => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue>({
  onlineIds: new Set(),
  isOnline: () => false,
  refreshPresence: async () => undefined,
});

async function readAuthUserId(): Promise<string | null> {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    return user?.id || null;
  } catch {
    return null;
  }
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  const applyOnline = useCallback((ids: string[]) => {
    setOnlineIds(new Set(ids.filter(Boolean)));
  }, []);

  const refreshPresence = useCallback(async () => {
    try {
      const data = await authApi.getCommunityPresence();
      const ids = Array.isArray(data?.onlineUserIds) ? data.onlineUserIds : [];
      applyOnline(ids.map(String));
    } catch {
      // Presence is best-effort
    }
  }, [applyOnline]);

  // Keep auth user in sync (login / logout / session restore)
  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const id = await readAuthUserId();
      if (!mounted) return;
      if (id === userIdRef.current) return;
      userIdRef.current = id;
      setUserId(id);
      if (!id) {
        setOnlineIds(new Set());
        disconnectCommunitySocket();
      }
    };

    syncUser();
    const interval = setInterval(syncUser, 2000);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') syncUser();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // Connect socket + seed presence once logged in
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let onPresence: ((payload: { userId?: string; online?: boolean }) => void) | null =
      null;

    (async () => {
      try {
        await reconnectCommunitySocket();
        if (!mounted) return;
        await refreshPresence();

        const sock = await getCommunitySocket();
        if (!mounted) return;

        onPresence = (payload) => {
          const id = payload?.userId ? String(payload.userId) : null;
          if (!id) return;
          setOnlineIds((prev) => {
            const next = new Set(prev);
            if (payload.online) next.add(id);
            else next.delete(id);
            return next;
          });
        };

        sock.on('presence:update', onPresence);
      } catch (error) {
        console.warn('Presence socket unavailable', error);
      }
    })();

    return () => {
      mounted = false;
      getCommunitySocket()
        .then((sock) => {
          if (onPresence) sock.off('presence:update', onPresence);
        })
        .catch(() => undefined);
    };
  }, [userId, refreshPresence]);

  const isOnline = useCallback(
    (id?: string | null) => {
      if (!id) return false;
      return onlineIds.has(id);
    },
    [onlineIds],
  );

  const value = useMemo(
    () => ({ onlineIds, isOnline, refreshPresence }),
    [onlineIds, isOnline, refreshPresence],
  );

  return (
    <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
