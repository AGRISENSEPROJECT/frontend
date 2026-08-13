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
const MAX_ITEMS = 100;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function keyFor(base: string, userId?: string | null) {
  return userId ? `${base}:${userId}` : base;
}

async function resolveUserId(explicit?: string | null): Promise<string | null> {
  if (explicit) return explicit;
  try {
    const userJson = await AsyncStorage.getItem('user');
    if (!userJson) return null;
    const user = JSON.parse(userJson);
    return user?.id || null;
  } catch {
    return null;
  }
}

/** Move legacy unscoped inbox into the user-scoped key once. */
async function migrateUnscopedIfNeeded(userId: string): Promise<void> {
  const scoped = keyFor(STORAGE_KEY, userId);
  const existing = await AsyncStorage.getItem(scoped);
  if (existing) return;

  const legacy = await AsyncStorage.getItem(STORAGE_KEY);
  if (!legacy) return;

  await AsyncStorage.setItem(scoped, legacy);
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function loadNotifications(
  userId?: string | null,
): Promise<AppNotification[]> {
  try {
    const uid = await resolveUserId(userId);
    if (!uid) return [];
    await migrateUnscopedIfNeeded(uid);
    const raw = await AsyncStorage.getItem(keyFor(STORAGE_KEY, uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveNotifications(
  items: AppNotification[],
  userId?: string | null,
): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;
  await AsyncStorage.setItem(
    keyFor(STORAGE_KEY, uid),
    JSON.stringify(items.slice(0, MAX_ITEMS)),
  );
}

export async function prependNotification(
  item: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & {
    id?: string;
    createdAt?: string;
    read?: boolean;
  },
  userId?: string | null,
): Promise<AppNotification[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];

  const current = await loadNotifications(uid);
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

  const dedupeKey = nextItem.meta?.dedupeKey;
  const filtered = current.filter((n) => {
    if (n.id === nextItem.id) return false;
    if (dedupeKey && n.meta?.dedupeKey === dedupeKey) return false;
    return true;
  });

  const next = [nextItem, ...filtered].slice(0, MAX_ITEMS);
  await saveNotifications(next, uid);
  return next;
}

export async function markNotificationRead(
  id: string,
  userId?: string | null,
): Promise<AppNotification[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const current = await loadNotifications(uid);
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  await saveNotifications(next, uid);
  return next;
}

export async function markAllNotificationsRead(
  userId?: string | null,
): Promise<AppNotification[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const current = await loadNotifications(uid);
  const next = current.map((n) => ({ ...n, read: true }));
  await saveNotifications(next, uid);
  return next;
}

export async function removeNotification(
  id: string,
  userId?: string | null,
): Promise<AppNotification[]> {
  const uid = await resolveUserId(userId);
  if (!uid) return [];
  const current = await loadNotifications(uid);
  const next = current.filter((n) => n.id !== id);
  await saveNotifications(next, uid);
  return next;
}

export async function clearNotifications(userId?: string | null): Promise<void> {
  const uid = await resolveUserId(userId);
  if (!uid) return;
  await AsyncStorage.removeItem(keyFor(STORAGE_KEY, uid));
}

/** Track which prediction runs already produced a notification. */
export async function hasSeenPredictionRun(runId: string): Promise<boolean> {
  try {
    const uid = await resolveUserId();
    if (!uid) return false;
    const raw = await AsyncStorage.getItem(keyFor(SEEN_RUNS_KEY, uid));
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids.includes(runId);
  } catch {
    return false;
  }
}

export async function markPredictionRunSeen(runId: string): Promise<void> {
  try {
    const uid = await resolveUserId();
    if (!uid) return;
    const key = keyFor(SEEN_RUNS_KEY, uid);
    const raw = await AsyncStorage.getItem(key);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (ids.includes(runId)) return;
    const next = [runId, ...ids].slice(0, 50);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export async function seedFeatureNotifications(
  userId?: string | null,
): Promise<AppNotification[] | null> {
  const uid = await resolveUserId(userId);
  if (!uid) return null;

  const seedKey = keyFor(FEATURE_SEED_KEY, uid);
  const seeded = await AsyncStorage.getItem(seedKey);
  if (seeded === '1') return null;

  let items = await loadNotifications(uid);

  items = await prependNotification(
    {
      type: 'feature',
      title: 'Community is live',
      body: 'Share advice, like posts, and chat with other farmers.',
      route: '/(main)/community',
      meta: { dedupeKey: 'feature-community' },
    },
    uid,
  );

  items = await prependNotification(
    {
      type: 'feature',
      title: 'Smart recommendations',
      body: 'Run a soil analysis to get crop, fertilizer, and irrigation advice.',
      route: '/recommends',
      meta: { dedupeKey: 'feature-recommends' },
    },
    uid,
  );

  await AsyncStorage.setItem(seedKey, '1');
  return items;
}

/** Map backend notification rows into the local AppNotification shape. */
export function mapServerNotification(row: any): AppNotification | null {
  if (!row?.id) return null;

  const serverType = String(row.type || '');
  let type: NotificationType = 'feature';
  if (serverType.includes('comment') || serverType.includes('reply') || serverType.includes('mention')) {
    type = 'community_comment';
  } else if (serverType.includes('like')) {
    type = 'community_like';
  } else if (serverType.includes('message') || serverType.includes('group')) {
    type = 'community_post';
  } else if (serverType.includes('prediction') || serverType.includes('weather') || serverType.includes('iot')) {
    type = 'recommendation';
  }

  const data = row.data && typeof row.data === 'object' ? row.data : {};
  const postId = data.postId ? String(data.postId) : undefined;
  const conversationId = data.conversationId ? String(data.conversationId) : undefined;

  let route = '/(main)/community';
  let params: Record<string, string> | undefined;
  if (postId) {
    params = { postId };
  } else if (conversationId) {
    route = '/CommunityChat';
    params = { id: conversationId };
  } else if (type === 'recommendation') {
    route = '/recommends';
  }

  return {
    id: String(row.id),
    type,
    title: String(row.title || 'Notification'),
    body: String(row.message || ''),
    createdAt: row.createdAt
      ? new Date(row.createdAt).toISOString()
      : new Date().toISOString(),
    read: !!row.isRead,
    route,
    params,
    meta: { dedupeKey: `server-${row.id}`, source: 'server' },
  };
}

export function mergeNotificationLists(
  local: AppNotification[],
  remote: AppNotification[],
): AppNotification[] {
  const byKey = new Map<string, AppNotification>();
  for (const item of [...remote, ...local]) {
    const key = item.meta?.dedupeKey || item.id;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return Array.from(byKey.values())
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, MAX_ITEMS);
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
