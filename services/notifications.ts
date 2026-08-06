import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationType =
  | 'community_post'
  | 'community_comment'
  | 'community_like'
  | 'recommendation'
  | 'feature';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  /** Deep-link target for the related action */
  route: string;
  params?: Record<string, string>;
  meta?: Record<string, string>;
};

const STORAGE_KEY = 'app_notifications_v1';
const SEEN_RUNS_KEY = 'notif_seen_prediction_runs_v1';
const FEATURE_SEED_KEY = 'notif_feature_seed_v1';
const MAX_ITEMS = 40;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function scopedKey(base: string): Promise<string> {
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) return base;
    const user = JSON.parse(userJson);
    return user?.id ? `${base}:${user.id}` : base;
  } catch {
    return base;
  }
}

export async function loadNotifications(): Promise<AppNotification[]> {
  try {
    const key = await scopedKey(STORAGE_KEY);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotifications(items: AppNotification[]): Promise<void> {
  const key = await scopedKey(STORAGE_KEY);
  await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export async function prependNotification(
  item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
): Promise<AppNotification[]> {
  const current = await loadNotifications();
  const nextItem: AppNotification = {
    id: item.id || makeId(item.type),
    type: item.type,
    title: item.title,
    body: item.body,
    createdAt: item.createdAt || new Date().toISOString(),
    read: item.read ?? false,
    route: item.route,
    params: item.params,
    meta: item.meta,
  };

  // Dedupe by id or by type+meta key
  const dedupeKey = nextItem.meta?.dedupeKey;
  const filtered = current.filter((n) => {
    if (n.id === nextItem.id) return false;
    if (dedupeKey && n.meta?.dedupeKey === dedupeKey) return false;
    return true;
  });

  const next = [nextItem, ...filtered].slice(0, MAX_ITEMS);
  await saveNotifications(next);
  return next;
}

export async function markNotificationRead(id: string): Promise<AppNotification[]> {
  const current = await loadNotifications();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveNotifications(next);
  return next;
}

export async function markAllNotificationsRead(): Promise<AppNotification[]> {
  const current = await loadNotifications();
  const next = current.map((n) => ({ ...n, read: true }));
  await saveNotifications(next);
  return next;
}

export async function clearNotifications(): Promise<void> {
  const key = await scopedKey(STORAGE_KEY);
  await AsyncStorage.removeItem(key);
}

/** Track which prediction runs already produced a notification. */
export async function hasSeenPredictionRun(runId: string): Promise<boolean> {
  try {
    const key = await scopedKey(SEEN_RUNS_KEY);
    const raw = await AsyncStorage.getItem(key);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(runId);
  } catch {
    return false;
  }
}

export async function markPredictionRunSeen(runId: string): Promise<void> {
  try {
    const key = await scopedKey(SEEN_RUNS_KEY);
    const raw = await AsyncStorage.getItem(key);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (ids.includes(runId)) return;
    const next = [runId, ...ids].slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function seedFeatureNotifications(): Promise<AppNotification[] | null> {
  const seedKey = await scopedKey(FEATURE_SEED_KEY);
  const seeded = await AsyncStorage.getItem(seedKey);
  if (seeded === '1') return null;

  let items = await loadNotifications();

  items = await prependNotification({
    type: 'feature',
    title: 'Community is live',
    body: 'Share advice, like posts, and chat with other farmers.',
    route: '/(main)/community',
    meta: { dedupeKey: 'feature-community' },
  });

  items = await prependNotification({
    type: 'feature',
    title: 'Smart recommendations',
    body: 'Run a soil analysis to get crop, fertilizer, and irrigation advice.',
    route: '/recommends',
    meta: { dedupeKey: 'feature-recommends' },
  });

  await AsyncStorage.setItem(seedKey, '1');
  return items;
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case 'community_post':
      return 'people-outline';
    case 'community_comment':
      return 'chatbubble-outline';
    case 'community_like':
      return 'thumbs-up-outline';
    case 'recommendation':
      return 'leaf-outline';
    case 'feature':
      return 'sparkles-outline';
    default:
      return 'notifications-outline';
  }
}

export function timeAgoShort(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateString).toLocaleDateString();
}
