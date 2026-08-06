import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import { colors, radius, shadow, space } from '@/constants/theme';

type Author = {
  id: string;
  username: string;
  email?: string;
  profileImage?: string | null;
};

type ConversationDetail = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  imageUrl?: string | null;
  createdById?: string | null;
  otherMembers?: Author[];
  members?: Author[];
};

export default function ContactProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    conversationId?: string;
    name?: string;
  }>();

  const conversationId = params.conversationId as string | undefined;
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });

  const load = useCallback(async () => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) setMeId(JSON.parse(userJson)?.id || null);
      const data = await authApi.getConversation(conversationId);
      setConversation(data);
      setGroupName(data?.name || '');
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Could not load',
        message: error?.message || 'Failed to load conversation info.',
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const isGroup = conversation?.type === 'group';
  const other = conversation?.otherMembers?.[0];
  const displayName =
    conversation?.name || (params.name as string) || (isGroup ? 'Group' : 'Farmer');
  const avatarUri = isGroup ? conversation?.imageUrl : other?.profileImage;
  const canManageGroup = isGroup && !!meId && conversation?.createdById === meId;

  const avatarSource = avatarUri
    ? { uri: avatarUri }
    : require('../assets/profile-pic.png');

  const saveGroupName = async () => {
    if (!conversationId || !groupName.trim()) return;
    setSaving(true);
    try {
      const updated = await authApi.renameGroupConversation(
        conversationId,
        groupName.trim(),
      );
      setConversation(updated);
      setEditingName(false);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Updated',
        message: 'Group name saved.',
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Rename failed',
        message: error?.message || 'Could not rename the group.',
      });
    } finally {
      setSaving(false);
    }
  };

  const pickGroupImage = async () => {
    if (!conversationId || !canManageGroup) return;
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setStatusModal({
            visible: true,
            type: 'info',
            title: 'Permission needed',
            message: 'Allow photo access to set a group picture.',
          });
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setSaving(true);
      const updated = await authApi.uploadGroupImage(
        conversationId,
        result.assets[0].uri,
      );
      setConversation(updated);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Updated',
        message: 'Group photo saved.',
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Upload failed',
        message: error?.message || 'Could not update group photo.',
      });
    } finally {
      setSaving(false);
    }
  };

  const leave = async () => {
    if (!conversationId) return;
    try {
      await authApi.leaveConversation(conversationId);
      router.replace({
        pathname: '/(main)/community',
        params: { tab: isGroup ? 'groups' : 'messages' },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Leave failed',
        message: error?.message || 'Could not leave this chat.',
      });
    }
  };

  const confirmLeave = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Leave this conversation?')) {
        leave();
      }
      return;
    }
    Alert.alert('Leave conversation?', 'You will stop receiving messages here.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isGroup ? 'Group info' : 'Contact info'}
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : !conversationId ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No conversation selected.</Text>
          <TouchableOpacity style={styles.primaryAction} onPress={() => router.back()}>
            <Text style={styles.primaryActionText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 28) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <TouchableOpacity
              disabled={!canManageGroup}
              onPress={pickGroupImage}
              activeOpacity={canManageGroup ? 0.85 : 1}
            >
              <Image source={avatarSource} style={styles.avatar} />
              {canManageGroup ? (
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              ) : null}
            </TouchableOpacity>

            {editingName && canManageGroup ? (
              <View style={styles.renameRow}>
                <TextInput
                  style={styles.renameInput}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Group name"
                  placeholderTextColor={colors.textMuted}
                  maxLength={80}
                />
                <TouchableOpacity
                  style={styles.saveNameBtn}
                  onPress={saveGroupName}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveNameText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName}</Text>
                {canManageGroup ? (
                  <TouchableOpacity
                    onPress={() => {
                      setGroupName(displayName);
                      setEditingName(true);
                    }}
                    hitSlop={10}
                    accessibilityLabel="Edit group name"
                  >
                    <Ionicons name="create-outline" size={20} color={colors.brandMid} />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            <Text style={styles.subtitle}>
              {isGroup
                ? `${conversation?.members?.length || 0} members`
                : other?.email || 'Agrisense farmer'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => router.back()}
            activeOpacity={0.88}
          >
            <Ionicons name="chatbubble" size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Message</Text>
          </TouchableOpacity>

          {!isGroup && other ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Username</Text>
              <Text style={styles.cardValue}>{other.username}</Text>
              {other.email ? (
                <>
                  <Text style={[styles.cardLabel, { marginTop: 12 }]}>Email</Text>
                  <Text style={styles.cardValue}>{other.email}</Text>
                </>
              ) : null}
            </View>
          ) : null}

          {isGroup ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Members</Text>
              {(conversation?.members || []).map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <Image
                    source={
                      m.profileImage
                        ? { uri: m.profileImage }
                        : require('../assets/profile-pic.png')
                    }
                    style={styles.memberAvatar}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.username}
                      {m.id === meId ? ' (you)' : ''}
                    </Text>
                    {m.id === conversation?.createdById ? (
                      <Text style={styles.memberMeta}>Group creator</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity style={styles.dangerBtn} onPress={confirmLeave}>
            <Ionicons name="exit-outline" size={18} color={colors.danger} />
            <Text style={styles.dangerText}>
              {isGroup ? 'Leave group' : 'Leave chat'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((s) => ({ ...s, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: space.md,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: colors.textMuted, fontWeight: '600', marginBottom: 16 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xl },
  hero: { alignItems: 'center', marginBottom: space.xl },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.border,
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandMid,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  displayName: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  renameInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  saveNameBtn: {
    backgroundColor: colors.brandMid,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  saveNameText: { color: '#fff', fontWeight: '800' },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brandMid,
    borderRadius: radius.full,
    paddingVertical: 14,
    marginBottom: space.lg,
    paddingHorizontal: 20,
  },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20 },
  memberName: { fontSize: 15, fontWeight: '700', color: colors.text },
  memberMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandMid,
    marginTop: 2,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  dangerText: { color: colors.danger, fontWeight: '800', fontSize: 15 },
});
