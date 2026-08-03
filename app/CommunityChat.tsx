import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';
import { getCommunitySocket } from '@/services/communitySocket';

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
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [conversationId]);

  useEffect(() => {
    (async () => {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) setMe(JSON.parse(userJson));
    })();
    loadMessages();
  }, [loadMessages]);

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
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);
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

  if (!conversationId) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-600 text-center mb-4">
          This chat is missing an ID. Open a conversation from Inbox or Group.
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-[#166534] font-semibold">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="bg-[#166534] pt-12 pb-3 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <Image
            source={require('../assets/profile-pic.png')}
            className="w-9 h-9 rounded-full"
          />
          <Text className="text-white font-semibold text-base" numberOfLines={1}>
            {contactName}
          </Text>
        </View>
        <TouchableOpacity
          className="p-2"
          onPress={() =>
            router.push({ pathname: '/ContactProfile', params: { name: contactName } })
          }
        >
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#166534" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 py-3"
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1, justifyContent: 'flex-end' }}
        >
          {messages.length === 0 ? (
            <View className="items-center py-10">
              <Text className="text-gray-500 text-sm">No messages yet. Say hi 👋</Text>
            </View>
          ) : (
            messages.map((msg) => {
              const mine = msg.sender?.id === me?.id;
              return (
                <View
                  key={msg.id}
                  className={`flex-row mb-3 ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <View
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      mine
                        ? 'bg-[#166534]/15 rounded-tr-sm'
                        : 'bg-gray-200 rounded-tl-sm'
                    }`}
                  >
                    {!mine && (
                      <Text className="text-[#166534] text-xs font-semibold mb-1">
                        {msg.sender?.username || 'Farmer'}
                      </Text>
                    )}
                    <Text className="text-gray-800 text-sm">{msg.content}</Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      {formatTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <View
        className="flex-row items-center px-4 py-2 border-t border-gray-200 bg-white"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}
      >
        <TextInput
          className="flex-1 bg-gray-100 rounded-full py-2.5 px-4 text-base"
          placeholder="Message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
          editable={!sending}
        />
        <TouchableOpacity className="ml-2 p-2" onPress={send} disabled={sending || !input.trim()}>
          {sending ? (
            <ActivityIndicator color="#166534" />
          ) : (
            <Ionicons name="send" size={22} color={input.trim() ? '#166534' : '#ccc'} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
