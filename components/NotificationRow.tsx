import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import {
  notificationIcon,
  timeAgoShort,
  type AppNotification,
} from '@/services/notifications';

type Props = {
  item: AppNotification;
  onPress: () => void;
  onLongPress?: () => void;
};

export default function NotificationRow({ item, onPress, onLongPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.iconWrap, !item.read && styles.iconWrapUnread]}>
        <Ionicons
          name={notificationIcon(item.type) as any}
          size={18}
          color={colors.forest}
        />
      </View>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.time}>{timeAgoShort(item.createdAt)}</Text>
        </View>
        <Text style={styles.text} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      {!item.read ? <View style={styles.dot} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: colors.cream,
  },
  itemUnread: {
    backgroundColor: colors.brandWash,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: {
    backgroundColor: colors.brandMuted,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  time: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  text: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.unread,
    marginTop: 8,
  },
});
