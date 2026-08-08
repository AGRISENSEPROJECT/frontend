import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, type CommunityAuthor } from '@/services/api';
import { getCommunitySocket } from '@/services/communitySocket';
import { colors, radius, space } from '@/constants/theme';
import { ChatBubbleSkeleton } from '@/components/ui/Skeleton';
import { userDisplayName } from '@/utils/userDisplay';

type Author = CommunityAuthor;
type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  conversationId?: string;
  sender?: Author | null;
  deletedAt?: string | null;
  editedAt?: string | null;
};

export default function CommunityChat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; name?: string }>();
  const conversationId = params.id as string | undefined;
  const contactName = (params.name as string) || 'Chat';
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [headerName, setHeaderName] = useState(contactName);
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);
  const [conversationType, setConversationType] = useState<'direct' | 'group'>('direct');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [members, setMembers] = useState<Author[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const sockRef = useRef<any>(null);
  const meIdRef = useRef<string | null>(null);
  const membersRef = useRef<Author[]>([]);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [data, convo] = await Promise.all([
        authApi.getConversationMessages(conversationId, {
          page: 1,
          limit: 80,
        }),
        authApi.getConversation(conversationId).catch(() => null),
      ]);
      setMessages(data?.items || []);
      if (convo) {
        setHeaderName(convo.name || contactName);
        setConversationType(convo.type === 'group' ? 'group' : 'direct');
        const avatar =
          convo.type === 'group'
            ? convo.imageUrl || null
            : convo.otherMembers?.[0]?.profileImage || null;
        setHeaderAvatar(avatar);
        if (Array.isArray(convo.members)) {
          setMembers(convo.members);
          membersRef.current = convo.members;
        }
      }
      await authApi.markConversationRead(conversationId);
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [conversationId, contactName]);

  useEffect(() => {
    (async () => {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setMe(user);
        meIdRef.current = user?.id || null;
      }
    })();
    loadMessages();
  }, [loadMessages]);

  // Samsung / Android: keep composer above the keyboard (Expo Go often won't resize alone).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onShow = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardOffset(e.endCoordinates?.height || 0);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    });
    const onHide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    let sock: any;
    let onNew: ((message: ChatMessage) => void) | null = null;
    let onUpdated: ((message: ChatMessage) => void) | null = null;
    let onDeleted: ((payload: { id: string; conversationId: string }) => void) | null = null;
    let onTypingStart: ((payload: { conversationId: string; userId: string }) => void) | null = null;
    let onTypingStop: ((payload: { conversationId: string; userId: string }) => void) | null = null;

    (async () => {
      try {
        sock = await getCommunitySocket();
        sockRef.current = sock;
        sock.emit('conversation:join', { conversationId });

        onNew = (message: ChatMessage) => {
          if (message.conversationId !== conversationId) return;
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === message.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = { ...next[idx], ...message };
              return next;
            }
            return [...prev, message];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
          authApi.markConversationRead(conversationId).catch(() => undefined);
        };

        onUpdated = (message: ChatMessage) => {
          if (message.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
          );
        };

        onDeleted = (payload) => {
          if (payload.conversationId !== conversationId) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.id
                ? { ...m, deletedAt: new Date().toISOString(), content: '[deleted]' }
                : m,
            ),
          );
        };

        onTypingStart = (payload) => {
          if (payload.conversationId !== conversationId) return;
          if (!payload.userId || payload.userId === meIdRef.current) return;
          const member = membersRef.current.find((m) => m.id === payload.userId);
          const name = userDisplayName(member) || 'Someone';
          setTypingUsers((prev) =>
            prev.some((u) => u.id === payload.userId)
              ? prev
              : [...prev, { id: payload.userId, name }],
          );
        };

        onTypingStop = (payload) => {
          if (payload.conversationId !== conversationId) return;
          setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
        };

        sock.on('message:new', onNew);
        sock.on('message:updated', onUpdated);
        sock.on('message:deleted', onDeleted);
        sock.on('typing:start', onTypingStart);
        sock.on('typing:stop', onTypingStop);
      } catch (error) {
        console.warn('Chat socket unavailable', error);
      }
    })();

    return () => {
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      if (isTypingRef.current && sock) {
        sock.emit('typing:stop', { conversationId });
        isTypingRef.current = false;
      }
      if (sock) {
        sock.emit('conversation:leave', { conversationId });
        if (onNew) sock.off('message:new', onNew);
        if (onUpdated) sock.off('message:updated', onUpdated);
        if (onDeleted) sock.off('message:deleted', onDeleted);
        if (onTypingStart) sock.off('typing:start', onTypingStart);
        if (onTypingStop) sock.off('typing:stop', onTypingStop);
      }
      sockRef.current = null;
    };
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTypingRef.current) return;
    isTypingRef.current = false;
    if (typingStopTimer.current) {
      clearTimeout(typingStopTimer.current);
      typingStopTimer.current = null;
    }
    sockRef.current?.emit('typing:stop', { conversationId });
  }, [conversationId]);

  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sockRef.current?.emit('typing:start', { conversationId });
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => stopTyping(), 1800);
  }, [conversationId, stopTyping]);

  const typingLabel = (() => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0].name} is typing…`;
    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing…`;
    }
    return 'Several people are typing…';
  })();

  const cancelEdit = () => {
    setEditingMessageId(null);
    setInput('');
  };

  const send = async () => {
    if (!conversationId || !input.trim() || sending) return;
    const content = input.trim();
    stopTyping();
    setSending(true);
    try {
      if (editingMessageId) {
        const updated = await authApi.updateConversationMessage(editingMessageId, content);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId
              ? {
                  ...m,
                  content: updated.content || content,
                  editedAt: updated.editedAt || new Date().toISOString(),
                }
              : m,
          ),
        );
        setEditingMessageId(null);
        setInput('');
      } else {
        setInput('');
        const message = await authApi.sendConversationMessage(conversationId, content);
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        );
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
      }
    } catch (error) {
      console.error('Send failed', error);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const startEdit = (message: ChatMessage) => {
    if (message.deletedAt) return;
    setEditingMessageId(message.id);
    setInput(message.content);
  };

  const deleteMessage = (message: ChatMessage) => {
    const run = async () => {
      try {
        await authApi.deleteConversationMessage(message.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, deletedAt: new Date().toISOString(), content: '[deleted]' }
              : m,
          ),
        );
        if (editingMessageId === message.id) cancelEdit();
      } catch (error) {
        console.error('Delete message failed', error);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this message?')) run();
      return;
    }
    Alert.alert('Delete message?', 'This cannot be undone for others.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  const openMessageActions = (message: ChatMessage) => {
    if (message.sender?.id !== me?.id || message.deletedAt) return;
    if (Platform.OS === 'web') {
      const choice = window.prompt('Type "edit" or "delete"', 'edit');
      if (choice?.toLowerCase() === 'edit') startEdit(message);
      if (choice?.toLowerCase() === 'delete') deleteMessage(message);
      return;
    }
    Alert.alert('Message', undefined, [
      { text: 'Edit', onPress: () => startEdit(message) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(message) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const formatTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const formatDayDivider = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const shouldShowDayDivider = (index: number) => {
    if (index === 0) return true;
    const prev = new Date(messages[index - 1].createdAt).toDateString();
    const curr = new Date(messages[index].createdAt).toDateString();
    return prev !== curr;
  };

  if (!conversationId) {
    return (
      <View style={styles.missingWrap}>
        <View style={styles.missingIcon}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color={colors.brand} />
        </View>
        <Text style={styles.missingTitle}>Conversation unavailable</Text>
        <Text style={styles.missingBody}>
          Open a chat from Messages or Groups to continue.
        </Text>
        <TouchableOpacity style={styles.missingBtn} onPress={() => router.back()}>
          <Text style={styles.missingBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const composerBottomPad =
    keyboardOffset > 0 ? 8 : Math.max(insets.bottom, 10);

  const openInfo = () => {
    if (!conversationId) return;
    router.push({
      pathname: '/ContactProfile',
      params: { conversationId, name: headerName },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View
        style={[
          styles.chatBody,
          Platform.OS === 'android' && keyboardOffset > 0
            ? { paddingBottom: keyboardOffset }
            : null,
        ]}
      >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIcon} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textOnBrand} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.85}
          onPress={openInfo}
        >
          {conversationType === 'group' && !headerAvatar ? (
            <View style={[styles.headerAvatar, styles.headerGroupAvatar]}>
              <Ionicons name="people" size={20} color={colors.brand} />
            </View>
          ) : (
            <Image
              source={
                headerAvatar
                  ? { uri: headerAvatar }
                  : require('../assets/profile-pic.png')
              }
              style={styles.headerAvatar}
            />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerName}
            </Text>
            <Text style={[styles.headerSub, typingLabel ? styles.headerTyping : null]} numberOfLines={1}>
              {typingLabel ||
                (conversationType === 'group' ? 'Tap for group info' : 'Tap for info')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerIcon} onPress={openInfo} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textOnBrand} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ChatBubbleSkeleton />
          <ChatBubbleSkeleton mine />
          <ChatBubbleSkeleton />
          <ChatBubbleSkeleton mine />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIcon}>
                <Ionicons name="leaf-outline" size={28} color={colors.brand} />
              </View>
              <Text style={styles.emptyChatTitle}>Start the conversation</Text>
              <Text style={styles.emptyChatBody}>
                Say hello and share farm tips with {headerName}.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const mine = item.sender?.id === me?.id;
            const showDivider = shouldShowDayDivider(index);
            return (
              <View>
                {showDivider && (
                  <View style={styles.dayPillWrap}>
                    <View style={styles.dayPill}>
                      <Text style={styles.dayPillText}>{formatDayDivider(item.createdAt)}</Text>
                    </View>
                  </View>
                )}
                <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
                  {!mine && (
                    <Image
                      source={
                        item.sender?.profileImage
                          ? { uri: item.sender.profileImage }
                          : require('../assets/profile-pic.png')
                      }
                      style={styles.bubbleAvatar}
                    />
                  )}
                  <Pressable
                    onLongPress={() => openMessageActions(item)}
                    delayLongPress={280}
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
                  >
                    {!mine && (
                      <Text style={styles.senderName}>
                        {userDisplayName(item.sender)}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.bubbleText,
                        mine && styles.bubbleTextMine,
                        item.deletedAt && styles.bubbleDeleted,
                      ]}
                    >
                      {item.deletedAt ? 'This message was deleted' : item.content}
                    </Text>
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                      {item.editedAt && !item.deletedAt ? 'edited · ' : ''}
                      {formatTime(item.createdAt)}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
        {typingLabel ? (
          <Text style={styles.typingBar}>{typingLabel}</Text>
        ) : null}
        {editingMessageId ? (
          <View style={styles.editingBar}>
            <Ionicons name="create-outline" size={16} color={colors.brandMid} />
            <Text style={styles.editingText}>Editing message</Text>
            <TouchableOpacity onPress={cancelEdit} hitSlop={8}>
              <Text style={styles.editingCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.composerInner}>
          <TextInput
            style={styles.input}
            placeholder={editingMessageId ? 'Edit message...' : 'Message...'}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (text.trim() && !editingMessageId) notifyTyping();
              else stopTyping();
            }}
            editable={!sending}
            multiline
            maxLength={2000}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending || !input.trim()}
            accessibilityLabel={editingMessageId ? 'Save edit' : 'Send message'}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons
                name={editingMessageId ? 'checkmark' : 'send'}
                size={18}
                color="#fff"
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EFEAE2',
  },
  chatBody: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: '#fff',
  },
  headerGroupAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerName: {
    color: colors.textOnBrand,
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerTyping: {
    color: '#BBF7D0',
    fontStyle: 'italic',
  },
  loading: {
    flex: 1,
    paddingTop: 24,
    justifyContent: 'flex-start',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.lg,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  dayPillWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dayPill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  dayPillText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowTheirs: {
    justifyContent: 'flex-start',
    gap: 6,
  },
  bubbleAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleMine: {
    backgroundColor: colors.brand,
    borderBottomRightRadius: 5,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 5,
  },
  senderName: {
    color: colors.brandMid,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  bubbleDeleted: {
    fontStyle: 'italic',
    opacity: 0.8,
  },
  bubbleTextMine: {
    color: colors.textOnBrand,
  },
  bubbleTime: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 28,
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyChatTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyChatBody: {
    marginTop: 6,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  composer: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  typingBar: {
    color: colors.brandMid,
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  editingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  editingText: {
    flex: 1,
    color: colors.brandMid,
    fontWeight: '700',
    fontSize: 13,
  },
  editingCancel: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 13,
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#A7C4B0',
  },
  missingWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  missingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  missingBody: {
    marginTop: 6,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  missingBtn: {
    marginTop: 18,
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  missingBtnText: {
    color: '#fff',
    fontWeight: '800',
  },
});
