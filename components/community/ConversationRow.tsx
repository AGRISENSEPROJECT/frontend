import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/constants/theme';
import type { CommunityAuthor } from '@/services/api';
import { formatPersonName, isDeletedAccount, userDisplayName } from '@/utils/userDisplay';
import { sharedPostPreview } from '@/utils/sharedPost';

type Author = CommunityAuthor;

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
  const peer = item.otherMembers?.[0];
  const displayName =
    mode === 'Group'
      ? item.name || 'Group'
      : isDeletedAccount(peer) || isDeletedAccount({ name: item.name })
        ? 'Unavailable'
        : formatPersonName(userDisplayName(peer)) || item.name || 'Farmer';
  const preview =
    sharedPostPreview(item.lastMessage?.content) ||
    item.lastMessage?.content ||
    'Say hello to get started';
  const avatarUri =
    mode === 'Inbox'
      ? peer?.profileImage
      : item.imageUrl;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.avatarWrap}>
        {mode === 'Group' && !avatarUri ? (
          <View style={styles.groupAvatar}>
            <Ionicons name="people" size={22} color={colors.forest} />
          </View>
        ) : (
          <Image source={avatar(avatarUri)} style={styles.avatar} />
        )}
        {mode === 'Inbox' && online ? <View style={styles.onlineDot} /> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.topLine}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {displayName}
          </Text>
          {item.lastMessage?.createdAt ? (
            <Text style={styles.time}>
              {timeAgo(item.lastMessage.createdAt)}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottomLine}>
          <Text
            style={[styles.preview, unread && styles.previewUnread]}
            numberOfLines={1}
          >
            {preview}
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.cream,
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    borderColor: colors.cream,
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
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  nameUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8A8A8A',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#4A4A4A',
  },
  previewUnread: {
    color: '#222',
    fontWeight: '600',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
