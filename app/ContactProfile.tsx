import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { authApi, type CommunityAuthor } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import { colors, radius, shadow, space } from '@/constants/theme';
import { ProfileSkeleton } from '@/components/ui/Skeleton';
import { userDisplayName } from '@/utils/userDisplay';

type Author = CommunityAuthor;

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<Author[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const canManageGroup =
    isGroup &&
    !!meId &&
    (!conversation?.createdById || conversation.createdById === meId);

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

      setUploadingPhoto(true);
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
      setUploadingPhoto(false);
    }
  };

  const existingMemberIds = new Set((conversation?.members || []).map((m) => m.id));

  const searchUsers = (q: string) => {
    setUserQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const users = await authApi.searchCommunityUsers(q);
        const list = Array.isArray(users) ? users : [];
        setUserResults(list.filter((u: Author) => u.id && !existingMemberIds.has(u.id)));
      } catch {
        setUserResults([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
  };

  const openAddMembers = () => {
    setSelectedMemberIds([]);
    setUserQuery('');
    setUserResults([]);
    setAddMembersVisible(true);
    searchUsers('');
  };

  const toggleCandidate = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const submitAddMembers = async () => {
    if (!conversationId || selectedMemberIds.length === 0) return;
    setAddingMembers(true);
    try {
      const updated = await authApi.addGroupMembers(conversationId, selectedMemberIds);
      setConversation(updated);
      setAddMembersVisible(false);
      setSelectedMemberIds([]);
      setUserQuery('');
      setUserResults([]);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Members added',
        message: 'New farmers were added to this group.',
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Could not add members',
        message: error?.message || 'Only the group creator can add members.',
      });
    } finally {
      setAddingMembers(false);
    }
  };

  const removeMember = async (member: Author) => {
    if (!conversationId || !canManageGroup || member.id === meId) return;
    setRemovingMemberId(member.id);
    try {
      const updated = await authApi.removeGroupMembers(conversationId, [member.id]);
      setConversation(updated);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Member removed',
        message: `${userDisplayName(member)} was removed from the group.`,
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Could not remove member',
        message: error?.message || 'Only the group creator can remove members.',
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const confirmRemoveMember = (member: Author) => {
    if (!canManageGroup || member.id === meId) return;
    const label = userDisplayName(member);
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Remove ${label} from this group?`)
      ) {
        removeMember(member);
      }
      return;
    }
    Alert.alert(`Remove ${label}?`, 'They will no longer see this group chat.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMember(member) },
    ]);
  };

  const leave = async () => {
    if (!conversationId) return;
    try {
      await authApi.leaveConversation(conversationId);
      router.replace({
        pathname: '/(main)/community',
        params: { tab: 'groups' },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Leave failed',
        message: error?.message || 'Could not leave this group.',
      });
    }
  };

  const blockUser = async () => {
    if (!other?.id) return;
    try {
      await authApi.blockUser(other.id);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'User blocked',
        message: `${userDisplayName(other)} has been blocked.`,
      });
      setTimeout(() => {
        router.replace({
          pathname: '/(main)/community',
          params: { tab: 'messages' },
        });
      }, 600);
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Block failed',
        message: error?.message || 'Could not block this user.',
      });
    }
  };

  const confirmLeave = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Leave this group?')) {
        leave();
      }
      return;
    }
    Alert.alert('Leave group?', 'You will stop receiving messages from this group.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: leave },
    ]);
  };

  const confirmBlock = () => {
    if (!other?.id) return;
    const label = userDisplayName(other);
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Block ${label}? They won’t be able to message you.`)
      ) {
        blockUser();
      }
      return;
    }
    Alert.alert(
      `Block ${label}?`,
      'They won’t be able to message you or see your profile in chats.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: blockUser },
      ],
    );
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
        <View style={[styles.content, { paddingTop: 8 }]}>
          <ProfileSkeleton />
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
              disabled={!canManageGroup || uploadingPhoto}
              onPress={pickGroupImage}
              activeOpacity={canManageGroup ? 0.85 : 1}
            >
              <Image source={avatarSource} style={styles.avatar} />
              {uploadingPhoto ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.avatarOverlayText}>Uploading…</Text>
                </View>
              ) : canManageGroup ? (
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
              <Text style={styles.cardLabel}>Name</Text>
              <Text style={styles.cardValue}>{userDisplayName(other)}</Text>
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members</Text>
                {canManageGroup ? (
                  <TouchableOpacity onPress={openAddMembers} hitSlop={8} style={styles.addMembersBtn}>
                    <Ionicons name="person-add-outline" size={16} color={colors.brand} />
                    <Text style={styles.addMembersText}>Add</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
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
                      {userDisplayName(m)}
                      {m.id === meId ? ' (you)' : ''}
                    </Text>
                    {m.id === conversation?.createdById ? (
                      <Text style={styles.memberMeta}>Group creator</Text>
                    ) : null}
                  </View>
                  {canManageGroup && m.id !== meId ? (
                    <TouchableOpacity
                      onPress={() => confirmRemoveMember(m)}
                      disabled={removingMemberId === m.id}
                      hitSlop={8}
                      style={styles.removeMemberBtn}
                      accessibilityLabel={`Remove ${userDisplayName(m)}`}
                    >
                      {removingMemberId === m.id ? (
                        <ActivityIndicator size="small" color={colors.danger} />
                      ) : (
                        <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={isGroup ? confirmLeave : confirmBlock}
          >
            <Ionicons
              name={isGroup ? 'exit-outline' : 'ban-outline'}
              size={18}
              color={colors.danger}
            />
            <Text style={styles.dangerText}>
              {isGroup ? 'Leave group' : 'Block user'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={addMembersVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add members</Text>
              <TouchableOpacity
                onPress={() => setAddMembersVisible(false)}
                hitSlop={8}
                disabled={addingMembers}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search farmers..."
              placeholderTextColor={colors.textMuted}
              value={userQuery}
              onChangeText={searchUsers}
              autoCapitalize="none"
            />
            {searchingUsers ? (
              <ActivityIndicator color={colors.brand} style={{ marginVertical: 12 }} />
            ) : null}
            <ScrollView style={{ maxHeight: 280 }}>
              {userResults.length === 0 && !searchingUsers ? (
                <Text style={styles.emptySearch}>No farmers found.</Text>
              ) : (
                userResults.map((u) => {
                  const selected = selectedMemberIds.includes(u.id);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userRow}
                      onPress={() => toggleCandidate(u.id)}
                    >
                      <Image
                        source={
                          u.profileImage
                            ? { uri: u.profileImage }
                            : require('../assets/profile-pic.png')
                        }
                        style={styles.memberAvatar}
                      />
                      <Text style={[styles.memberName, { flex: 1 }]} numberOfLines={1}>
                        {userDisplayName(u)}
                      </Text>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={colors.brand}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.primaryAction,
                { marginBottom: 0, marginTop: 12 },
                (addingMembers || selectedMemberIds.length === 0) && { opacity: 0.6 },
              ]}
              onPress={submitAddMembers}
              disabled={addingMembers || selectedMemberIds.length === 0}
            >
              {addingMembers ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryActionText}>
                  Add {selectedMemberIds.length || ''} member
                  {selectedMemberIds.length === 1 ? '' : 's'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 56,
    backgroundColor: 'rgba(11, 77, 38, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  avatarOverlayText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  addMembersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.brandSoft,
  },
  addMembersText: {
    color: colors.brand,
    fontWeight: '800',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: space.lg,
    paddingBottom: space.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  searchInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: space.sm,
  },
  emptySearch: {
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
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
  removeMemberBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
