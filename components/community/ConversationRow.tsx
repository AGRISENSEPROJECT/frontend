import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '@/constants/theme';

type Author = {
  id: string;
  username: string;
  profileImage?: string | null;
};

export type ConversationRowData = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  imageUrl?: string | null;
  lastMessage?: { content: string; createdAt: string; sender?: Author | null } | null;
  unreadCount?: number;
  otherMembers?: Author[];
};

type Props = {
  item: ConversationRowData;
  mode: 'Inbox' | 'Group';
  timeAgo: (date: string) => string;
  onPress: () => void;
  avatar: (uri?: string | null) => any;
  /** Real presence for DM peers (not unread). */
  online?: boolean;
};

export default function ConversationRow({
  item,
  mode,
  timeAgo,
  onPress,
  avatar,
  online = false,
}: Props) {
  const unread = (item.unreadCount || 0) > 0;
  const avatarUri =
    mode === 'Inbox'
      ? item.otherMembers?.[0]?.profileImage
      : item.imageUrl;

  return (
    <TouchableOpacity
      style={[styles.row, unread && styles.rowUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.avatarWrap}>
        {mode === 'Group' && !avatarUri ? (
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={22} color={colors.brand} />
          </View>
        ) : (
          <Image source={avatar(avatarUri)} style={styles.avatar} />
        )}
        {mode === 'Inbox' && online ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessage?.createdAt ? (
            <Text style={[styles.time, unread && styles.timeUnread]}>
              {timeAgo(item.lastMessage.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottomLine}>
          <Text
            style={[styles.preview, unread && styles.previewUnread]}
            numberOfLines={1}
          >
            {item.lastMessage?.content || 'Say hello to get started'}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {(item.unreadCount || 0) > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  rowUnread: {
    backgroundColor: colors.brandWash,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  groupAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nameUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.unread,
    fontWeight: '800',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.textMuted,
  },
  previewUnread: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    backgroundColor: colors.unread,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
