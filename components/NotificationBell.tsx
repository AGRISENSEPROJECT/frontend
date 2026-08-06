import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useNotifications } from '@/context/NotificationContext';
import { notificationIcon, timeAgoShort } from '@/services/notifications';

type Props = {
  color?: string;
  size?: number;
};

export default function NotificationBell({ color = '#fff', size = 24 }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);

  const handlePressItem = async (id: string, route: string, params?: Record<string, string>) => {
    await markRead(id);
    setOpen(false);
    // Slight delay so modal closes cleanly before navigation
    setTimeout(() => {
      if (params && Object.keys(params).length > 0) {
        router.push({ pathname: route as any, params });
      } else {
        router.push(route as any);
      }
    }, 120);
  };

  return (
    <>
      <TouchableOpacity onPress={handleOpen} hitSlop={10} style={styles.bellWrap} accessibilityLabel="Notifications">
        <Ionicons name="notifications-outline" size={size} color={color} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <View style={styles.sheetActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={() => markAllRead()} hitSlop={8}>
                    <Text style={styles.markAll}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="notifications-outline" size={28} color="#0B4D26" />
                  </View>
                  <Text style={styles.emptyTitle}>You're all caught up</Text>
                  <Text style={styles.emptyBody}>
                    Community posts, comments, and new recommendations will show up here.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.item, !item.read && styles.itemUnread]}
                    activeOpacity={0.85}
                    onPress={() => handlePressItem(item.id, item.route, item.params)}
                  >
                    <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
                      <Ionicons
                        name={notificationIcon(item.type) as any}
                        size={18}
                        color="#0B4D26"
                      />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>{timeAgoShort(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.itemText} numberOfLines={2}>
                        {item.body}
                      </Text>
                    </View>
                    {!item.read && <View style={styles.dot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellWrap: {
    position: 'relative',
    padding: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#0B4D26',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 14,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 18,
    maxHeight: '72%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B4D26',
  },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  markAll: {
    color: '#166534',
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    paddingVertical: 6,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptyBody: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: '#F0FDF4',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: '#DCFCE7',
  },
  itemBody: {
    flex: 1,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  itemText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginTop: 6,
  },
});
