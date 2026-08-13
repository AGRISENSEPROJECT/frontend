import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, radius, space } from '@/constants/theme';
import { useNotifications } from '@/context/NotificationContext';
import NotificationRow from '@/components/NotificationRow';
import { ConversationSkeleton } from '@/components/ui/Skeleton';
import type { AppNotification } from '@/services/notifications';

type Filter = 'all' | 'unread';

export default function Notifications() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    remove,
    clearAll,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loaded, setLoaded] = useState(notifications.length > 0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await refresh();
        if (active) setLoaded(true);
      })();
      return () => {
        active = false;
      };
    }, [refresh]),
  );

  const visible = useMemo(
    () =>
      filter === 'unread'
        ? notifications.filter((item) => !item.read)
        : notifications,
    [filter, notifications],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const openItem = async (item: AppNotification) => {
    await markRead(item.id);
    if (item.params && Object.keys(item.params).length > 0) {
      router.push({ pathname: item.route as any, params: item.params });
    } else {
      router.push(item.route as any);
    }
  };

  const confirmRemove = (item: AppNotification) => {
    Alert.alert('Remove notification', `Remove “${item.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => remove(item.id),
      },
    ]);
  };

  const confirmClear = () => {
    setMenuVisible(false);
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear notifications',
      'This removes every notification from your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => clearAll(),
        },
      ],
    );
  };

  const onMarkAll = async () => {
    setMenuVisible(false);
    await markAllRead();
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.textOnBrand} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSub}>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : notifications.length > 0
                ? 'You are all caught up'
                : 'No notifications yet'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.headerBtn}
          hitSlop={8}
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textOnBrand} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.filters}>
          {(['all', 'unread'] as const).map((tab) => {
            const active = filter === tab;
            const label = tab === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!loaded ? (
          <View>
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationRow
                item={item}
                onPress={() => openItem(item)}
                onLongPress={() => confirmRemove(item)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.forest]}
                tintColor={colors.forest}
              />
            }
            contentContainerStyle={
              visible.length === 0 ? styles.emptyWrap : styles.listContent
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="notifications-outline" size={28} color={colors.forest} />
                </View>
                <Text style={styles.emptyTitle}>
                  {filter === 'unread' ? 'No unread notifications' : "You're all caught up"}
                </Text>
                <Text style={styles.emptyBody}>
                  {filter === 'unread'
                    ? 'New community activity and recommendations will land here.'
                    : 'Community posts, comments, and new recommendations will show up here.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {unreadCount > 0 ? (
              <TouchableOpacity style={styles.menuRow} onPress={onMarkAll}>
                <Ionicons name="checkmark-done-outline" size={20} color={colors.forest} />
                <Text style={styles.menuRowText}>Mark all as read</Text>
              </TouchableOpacity>
            ) : null}
            {notifications.length > 0 ? (
              <TouchableOpacity style={styles.menuRow} onPress={confirmClear}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.menuRowText, { color: colors.danger }]}>
                  Clear all
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.menuRow, styles.menuCancel]}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={[styles.menuRowText, { color: colors.textMuted, textAlign: 'center', width: '100%' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    backgroundColor: colors.forest,
    paddingHorizontal: space.md,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 4,
  },
  headerTitle: {
    color: colors.textOnBrand,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  body: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.searchFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.forest,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  filterTextActive: {
    color: colors.textOnBrand,
  },
  listContent: {
    paddingBottom: 28,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E4E4DC',
    marginLeft: 68,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyBody: {
    marginTop: 6,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4DC',
  },
  menuCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
  },
  menuRowText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
});
