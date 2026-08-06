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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';
import { getCommunitySocket } from '@/services/communitySocket';
import { colors, radius, space } from '@/constants/theme';

type Author = { id: string; username: string; profileImage?: string | null };
type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  conversationId?: string;
  sender?: Author | null;
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
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.getConversationMessages(conversationId, {
        page: 1,
        limit: 80,
      });
      setMessages(data?.items || []);
      await authApi.markConversationRead(conversationId);
    } catch (error) {
      console.error('Failed to load messages', error);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
    }
  }, [conversationId]);

  useEffect(() => {
    (async () => {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) setMe(JSON.parse(userJson));
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
    (async () => {
      try {
        sock = await getCommunitySocket();
        sock.emit('conversation:join', { conversationId });
        sock.on('message:new', (message: ChatMessage) => {
          if (message.conversationId !== conversationId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
          authApi.markConversationRead(conversationId).catch(() => undefined);
        });
      } catch (error) {
        console.warn('Chat socket unavailable', error);
      }
    })();

    return () => {
      if (sock) {
        sock.emit('conversation:leave', { conversationId });
        sock.off('message:new');
      }
    };
  }, [conversationId]);

  const send = async () => {
    if (!conversationId || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const message = await authApi.sendConversationMessage(conversationId, content);
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 40);
    } catch (error) {
      console.error('Send failed', error);
      setInput(content);
    } finally {
      setSending(false);
    }
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
          onPress={() =>
            router.push({ pathname: '/ContactProfile', params: { name: contactName } })
          }
        >
          <Image source={require('../assets/profile-pic.png')} style={styles.headerAvatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {contactName}
            </Text>
            <Text style={styles.headerSub}>Tap for info</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            router.push({ pathname: '/ContactProfile', params: { name: contactName } })
          }
          hitSlop={8}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textOnBrand} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
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
                Say hello and share farm tips with {contactName}.
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
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {!mine && (
                      <Text style={styles.senderName}>
                        {item.sender?.username || 'Farmer'}
                      </Text>
                    )}
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.composer, { paddingBottom: composerBottomPad }]}>
        <View style={styles.composerInner}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            editable={!sending}
            multiline
            maxLength={2000}
            textAlignVertical="center"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending || !input.trim()}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
