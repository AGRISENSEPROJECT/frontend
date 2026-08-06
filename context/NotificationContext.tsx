import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCommunitySocket } from '@/services/communitySocket';
import {
  AppNotification,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  prependNotification,
  seedFeatureNotifications,
} from '@/services/notifications';

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
};

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  refresh: async () => undefined,
  push: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const items = await loadNotifications();
    setNotifications(items);
  }, []);

  const push = useCallback(
    async (
      item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
        id?: string;
        createdAt?: string;
        read?: boolean;
      },
    ) => {
      const next = await prependNotification(item);
      setNotifications(next);
    },
    [],
  );

  const markRead = useCallback(async (id: string) => {
    const next = await markNotificationRead(id);
    setNotifications(next);
  }, []);

  const markAllRead = useCallback(async () => {
    const next = await markAllNotificationsRead();
    setNotifications(next);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setUserId(user?.id || null);
        }
      } catch {
        // ignore
      }
      await refresh();
      const seeded = await seedFeatureNotifications();
      if (seeded) setNotifications(seeded);
    })();
  }, [refresh]);

  // Re-load per-user inbox once auth user is known
  useEffect(() => {
    if (!userId) return;
    (async () => {
      await refresh();
      const seeded = await seedFeatureNotifications();
      if (seeded) setNotifications(seeded);
    })();
  }, [userId, refresh]);

  // Live community events → notifications
  useEffect(() => {
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
          const authorName = post?.author?.username || post?.user?.username || 'A farmer';
          const snippet = String(post?.description || '').trim().slice(0, 90);
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
          const name = comment?.author?.username || comment?.user?.username || 'Someone';
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
          const name = payload?.user?.username || 'Someone';
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
    () => ({ notifications, unreadCount, refresh, push, markRead, markAllRead }),
    [notifications, unreadCount, refresh, push, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
