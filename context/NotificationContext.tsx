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
import { authApi } from '@/services/api';
import {
  getCommunitySocket,
  reconnectCommunitySocket,
} from '@/services/communitySocket';
import {
  AppNotification,
  loadNotifications,
  mapServerNotification,
  markAllNotificationsRead,
  markNotificationRead,
  mergeNotificationLists,
  prependNotification,
  saveNotifications,
  seedFeatureNotifications,
  clearNotifications,
} from '@/services/notifications';
import { userDisplayName } from '@/utils/userDisplay';

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  push: (
    item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
      id?: string;
      createdAt?: string;
      read?: boolean;
    },
  ) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  refresh: async () => undefined,
  push: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
  clearAll: async () => undefined,
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const loadGen = useRef(0);

  const applyInbox = useCallback(async (uid: string, gen: number) => {
    const local = await loadNotifications(uid);
    if (gen !== loadGen.current) return;

    let merged = local;
    try {
      const remote = await authApi.getNotifications({ limit: 40 });
      if (gen !== loadGen.current) return;
      const mapped = (remote?.items || [])
        .map(mapServerNotification)
        .filter(Boolean) as AppNotification[];
      merged = mergeNotificationLists(local, mapped);
      await saveNotifications(merged, uid);
    } catch {
      // Local inbox still usable offline / if API unavailable
    }

    if (gen !== loadGen.current) return;
    setNotifications(merged);

    const seeded = await seedFeatureNotifications(uid);
    if (gen !== loadGen.current) return;
    if (seeded) setNotifications(seeded);
  }, []);

  const refresh = useCallback(async () => {
    const uid = userIdRef.current || (await readAuthUserId());
    if (!uid) {
      setNotifications([]);
      return;
    }
    const gen = ++loadGen.current;
    await applyInbox(uid, gen);
  }, [applyInbox]);

  const push = useCallback(
    async (
      item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
        id?: string;
        createdAt?: string;
        read?: boolean;
      },
    ) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const next = await prependNotification(item, uid);
      setNotifications(next);
    },
    [],
  );

  const markRead = useCallback(async (id: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const target = notifications.find((n) => n.id === id);
    const next = await markNotificationRead(id, uid);
    setNotifications(next);
    // Best-effort server sync for persisted notifications
    try {
      const isServer =
        target?.meta?.source === 'server' ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        );
      if (isServer) await authApi.markNotificationRead(id);
    } catch {
      // ignore
    }
  }, [notifications]);

  const markAllRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const next = await markAllNotificationsRead(uid);
    setNotifications(next);
    try {
      await authApi.markAllNotificationsRead();
    } catch {
      // ignore
    }
  }, []);

  const clearAll = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    await clearNotifications(uid);
    setNotifications([]);
    try {
      await authApi.clearAllNotifications();
    } catch {
      // Local clear still applied
    }
  }, []);

  // Watch auth user (provider stays mounted across login)
  useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const id = await readAuthUserId();
      if (!mounted) return;
      if (id === userIdRef.current) return;

      userIdRef.current = id;
      setUserId(id);

      if (!id) {
        loadGen.current += 1;
        setNotifications([]);
        return;
      }

      const gen = ++loadGen.current;
      await applyInbox(id, gen);
      try {
        await reconnectCommunitySocket();
      } catch {
        // socket optional at bootstrap
      }
    };

    syncUser();
    const interval = setInterval(syncUser, 1500);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') syncUser();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      mounted = false;
      clearInterval(interval);
      sub.remove();
    };
  }, [applyInbox]);

  // Live community events → notifications
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let onCreated: ((post: any) => void) | null = null;
    let onCommented: ((comment: any) => void) | null = null;
    let onLiked: ((payload: any) => void) | null = null;

    (async () => {
      try {
        const sock = await getCommunitySocket();
        if (!mounted) return;

        onCreated = async (post: any) => {
          const authorId = post?.author?.id || post?.user?.id;
          if (authorId && userId && authorId === userId) return;
          const authorName = userDisplayName(post?.author || post?.user) || 'A farmer';
          const snippet = String(post?.title || post?.description || '')
            .trim()
            .slice(0, 90);
          await push({
            type: 'community_post',
            title: 'New community post',
            body: `${authorName}: ${snippet || 'Shared an update'}`,
            route: '/(main)/community',
            params: { postId: String(post.id) },
            meta: { dedupeKey: `post-${post.id}`, postId: String(post.id) },
          });
        };

        onCommented = async (comment: any) => {
          const commenterId = comment?.author?.id || comment?.user?.id;
          if (commenterId && userId && commenterId === userId) return;
          if (!comment?.postId) return;
          const name = userDisplayName(comment?.author || comment?.user) || 'Someone';
          const snippet = String(comment?.content || '').trim().slice(0, 80);
          await push({
            type: 'community_comment',
            title: 'New comment',
            body: `${name}: ${snippet || 'Left a comment on a post'}`,
            route: '/(main)/community',
            params: { postId: String(comment.postId) },
            meta: {
              dedupeKey: `comment-${comment.id}`,
              postId: String(comment.postId),
            },
          });
        };

        onLiked = async (payload: any) => {
          if (!payload?.postId) return;
          if (payload.userId && userId && payload.userId === userId) return;
          const name = userDisplayName(payload?.user) || 'Someone';
          await push({
            type: 'community_like',
            title: 'Post liked',
            body: `${name} liked a community post`,
            route: '/(main)/community',
            params: { postId: String(payload.postId) },
            meta: {
              dedupeKey: `like-${payload.postId}-${payload.userId || 'x'}`,
              postId: String(payload.postId),
            },
          });
        };

        sock.on('post:created', onCreated);
        sock.on('post:commented', onCommented);
        sock.on('post:liked', onLiked);
      } catch (error) {
        console.warn('Notification socket unavailable', error);
      }
    })();

    return () => {
      mounted = false;
      getCommunitySocket()
        .then((sock) => {
          if (onCreated) sock.off('post:created', onCreated);
          if (onCommented) sock.off('post:commented', onCommented);
          if (onLiked) sock.off('post:liked', onLiked);
        })
        .catch(() => undefined);
    };
  }, [push, userId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      refresh,
      push,
      markRead,
      markAllRead,
      clearAll,
    }),
    [notifications, unreadCount, refresh, push, markRead, markAllRead, clearAll],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
