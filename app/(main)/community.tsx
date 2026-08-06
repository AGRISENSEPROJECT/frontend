import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSidebar } from '../../context/SidebarContext';
import { authApi } from '@/services/api';
import { getCommunitySocket } from '@/services/communitySocket';
import StatusModal from '@/components/ui/StatusModal';
import ConversationRow from '@/components/community/ConversationRow';
import { colors, radius, shadow, space } from '@/constants/theme';
import { usePresence } from '@/context/PresenceContext';

const TAB_LABELS: Record<'Feed' | 'Inbox' | 'Group', string> = {
  Feed: 'Feed',
  Inbox: 'Messages',
  Group: 'Groups',
};

const FEED_CARD_WIDTH = Dimensions.get('window').width - 32;

/** Farm-themed placeholders until a post has a real cover image */
const POST_PLACEHOLDERS = [
  require('../../assets/latest-update.png'),
  require('../../assets/farm-illustration.png'),
  require('../../assets/crop-image.png'),
  require('../../assets/soil-detection-image.png'),
  require('../../assets/login-illustration.png'),
];

function placeholderForPost(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return POST_PLACEHOLDERS[hash % POST_PLACEHOLDERS.length];
}

function postCoverSource(post: { id: string; imageUrl?: string | null }) {
  if (post.imageUrl) return { uri: post.imageUrl };
  return placeholderForPost(post.id || 'x');
}

type Author = {
  id: string;
  username: string;
  profileImage?: string | null;
  online?: boolean;
};

type Post = {
  id: string;
  title?: string | null;
  description: string;
  imageUrl?: string | null;
  author: Author | null;
  likes: { id: string; user?: Author | null }[];
  comments: { id: string; content: string; author?: Author | null; user?: Author | null; createdAt?: string }[];
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  createdAt: string;
};

type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  lastMessage?: { content: string; createdAt: string; sender?: Author | null } | null;
  unreadCount?: number;
  otherMembers?: Author[];
  members?: Author[];
};

export default function Community() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleSidebar } = useSidebar();
  const { isOnline } = usePresence();
  const params = useLocalSearchParams<{ tab?: string; postId?: string }>();

  const [communityTab, setCommunityTab] = useState<'Feed' | 'Inbox' | 'Group'>('Feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [conversationsRefreshing, setConversationsRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [managePost, setManagePost] = useState<Post | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postImageUri, setPostImageUri] = useState<string | null>(null);
  const [highlightPostId, setHighlightPostId] = useState<string | null>(null);

  const [newChatVisible, setNewChatVisible] = useState(false);
  const [newGroupVisible, setNewGroupVisible] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<Author[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error' as 'error' | 'success' | 'info',
    title: '',
    message: '',
  });

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedScrollRef = useRef<ScrollView>(null);
  const postOffsets = useRef<Record<string, number>>({});
  const openedPostId = useRef<string | null>(null);

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  };

  const normalizePosts = (payload: any): Post[] => {
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    return items.map((post: any) => ({
      ...post,
      imageUrl: post.imageUrl || post.image_url || null,
      author: post.author || post.user || null,
      likes: post.likes || [],
      comments: (post.comments || []).map((c: any) => ({
        ...c,
        author: c.author || c.user || null,
      })),
      likedByMe:
        post.likedByMe ??
        (post.likes || []).some((like: any) => like.user?.id === userData?.id),
    }));
  };

  const fetchPosts = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await authApi.getPosts({ page: 1, limit: 50 });
      setPosts(normalizePosts(data));
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userData?.id]);

  const fetchConversations = useCallback(async (type?: 'direct' | 'group') => {
    try {
      const data = await authApi.listConversations(type);
      const list = Array.isArray(data) ? data : [];
      // Unread conversations float to the top — WhatsApp-style
      list.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
      setConversations(list);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    }
  }, []);

  const refreshUnreadBadges = useCallback(async () => {
    try {
      const [direct, group] = await Promise.all([
        authApi.listConversations('direct'),
        authApi.listConversations('group'),
      ]);
      const sum = (items: any[]) =>
        (Array.isArray(items) ? items : []).reduce(
          (acc, c) => acc + (Number(c.unreadCount) || 0),
          0,
        );
      setInboxUnread(sum(direct));
      setGroupUnread(sum(group));
    } catch {
      // ignore badge refresh failures
    }
  }, []);

  useEffect(() => {
    if (params.tab === 'messages') setCommunityTab('Inbox');
  }, [params.tab]);

  const openPostDetail = useCallback((post: Post) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    setHighlightPostId(post.id);
  }, []);

  // Deep-link from dashboard notifications / latest update cards
  useEffect(() => {
    const targetId = typeof params.postId === 'string' ? params.postId : null;
    if (!targetId || posts.length === 0) return;
    if (openedPostId.current === targetId) return;

    const post = posts.find((p) => p.id === targetId);
    if (!post) return;

    openedPostId.current = targetId;
    setCommunityTab('Feed');
    setHighlightPostId(targetId);
    openPostDetail(post);

    const offset = postOffsets.current[targetId];
    if (typeof offset === 'number') {
      setTimeout(() => {
        feedScrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
      }, 250);
    }
  }, [params.postId, posts, openPostDetail]);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) setUserData(JSON.parse(userJson));
      } catch {}
      fetchPosts();
      refreshUnreadBadges();
    })();
  }, [fetchPosts, refreshUnreadBadges]);

  useEffect(() => {
    if (communityTab === 'Inbox') fetchConversations('direct');
    if (communityTab === 'Group') fetchConversations('group');
  }, [communityTab, fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadBadges();
      if (communityTab === 'Inbox') fetchConversations('direct');
      if (communityTab === 'Group') fetchConversations('group');
    }, [communityTab, fetchConversations, refreshUnreadBadges]),
  );

  const refreshConversations = useCallback(async () => {
    setConversationsRefreshing(true);
    try {
      await fetchConversations(communityTab === 'Inbox' ? 'direct' : 'group');
      await refreshUnreadBadges();
    } finally {
      setConversationsRefreshing(false);
    }
  }, [communityTab, fetchConversations, refreshUnreadBadges]);

  const onHeaderPrimaryAction = () => {
    if (communityTab === 'Feed') {
      openCreatePost();
      return;
    }
    if (communityTab === 'Group') {
      setNewGroupVisible(true);
      searchUsers('');
      return;
    }
    setNewChatVisible(true);
    searchUsers('');
  };

  useEffect(() => {
    let mounted = true;
    let onCreated: ((post: any) => void) | null = null;
    let onDeleted: ((payload: { id: string }) => void) | null = null;
    let onLiked: ((payload: any) => void) | null = null;
    let onUnliked: ((payload: any) => void) | null = null;
    let onCommented: ((comment: any) => void) | null = null;
    let onConversationUpdated: (() => void) | null = null;

    (async () => {
      try {
        const sock = await getCommunitySocket();
        if (!mounted) return;

        onCreated = (post: any) => {
          setPosts((prev) => {
            const normalized = normalizePosts([post])[0];
            if (prev.some((p) => p.id === normalized.id)) return prev;
            return [normalized, ...prev];
          });
        };
        onDeleted = ({ id }: { id: string }) => {
          setPosts((prev) => prev.filter((p) => p.id !== id));
        };
        onLiked = (payload: any) => {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== payload.postId) return p;
              const already = p.likes.some((l) => l.user?.id === payload.userId);
              return {
                ...p,
                likeCount: payload.likeCount ?? p.likes.length + (already ? 0 : 1),
                likedByMe: payload.userId === userData?.id ? true : p.likedByMe,
                likes: already
                  ? p.likes
                  : [...p.likes, { id: `tmp-${payload.userId}`, user: payload.user }],
              };
            }),
          );
        };
        onUnliked = (payload: any) => {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== payload.postId) return p;
              return {
                ...p,
                likeCount: payload.likeCount ?? Math.max(0, p.likes.length - 1),
                likedByMe: payload.userId === userData?.id ? false : p.likedByMe,
                likes: p.likes.filter((l) => l.user?.id !== payload.userId),
              };
            }),
          );
        };
        onCommented = (comment: any) => {
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== comment.postId) return p;
              if (p.comments.some((c) => c.id === comment.id)) return p;
              return {
                ...p,
                comments: [...p.comments, comment],
                commentCount: (p.commentCount || p.comments.length) + 1,
              };
            }),
          );
          setSelectedPost((prev) => {
            if (!prev || prev.id !== comment.postId) return prev;
            if (prev.comments.some((c) => c.id === comment.id)) return prev;
            return { ...prev, comments: [...prev.comments, comment] };
          });
        };
        onConversationUpdated = () => {
          if (communityTab === 'Inbox') fetchConversations('direct');
          if (communityTab === 'Group') fetchConversations('group');
          refreshUnreadBadges();
        };

        sock.on('post:created', onCreated);
        sock.on('post:deleted', onDeleted);
        sock.on('post:liked', onLiked);
        sock.on('post:unliked', onUnliked);
        sock.on('post:commented', onCommented);
        sock.on('conversation:updated', onConversationUpdated);
      } catch (error) {
        console.warn('Community socket unavailable', error);
      }
    })();

    return () => {
      mounted = false;
      // Keep the shared socket alive; only detach this screen's listeners.
      getCommunitySocket()
        .then((sock) => {
          if (onCreated) sock.off('post:created', onCreated);
          if (onDeleted) sock.off('post:deleted', onDeleted);
          if (onLiked) sock.off('post:liked', onLiked);
          if (onUnliked) sock.off('post:unliked', onUnliked);
          if (onCommented) sock.off('post:commented', onCommented);
          if (onConversationUpdated) sock.off('conversation:updated', onConversationUpdated);
        })
        .catch(() => undefined);
    };
  }, [communityTab, fetchConversations, refreshUnreadBadges, userData?.id]);

  const handleLikePost = async (postId: string) => {
    try {
      const result = await authApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: !!result.liked,
                likeCount: result.likeCount ?? p.likeCount,
              }
            : p,
        ),
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCommentPost = async () => {
    if (!selectedPost || !commentContent.trim()) return;
    setLoading(true);
    try {
      const comment = await authApi.commentPost(selectedPost.id, commentContent.trim());
      setCommentContent('');
      setSelectedPost((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments.some((c) => c.id === comment.id)
                ? prev.comments
                : [...prev.comments, comment],
            }
          : prev,
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? {
                ...p,
                comments: p.comments.some((c) => c.id === comment.id)
                  ? p.comments
                  : [...p.comments, comment],
              }
            : p,
        ),
      );
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Comment Failed',
        message: error.message || 'Could not add comment',
      });
    } finally {
      setLoading(false);
    }
  };

  const pickPostImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setStatusModal({
            visible: true,
            type: 'info',
            title: 'Permission needed',
            message: 'Allow photo access to add a cover image to your post.',
          });
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS !== 'web',
        aspect: [4, 5],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPostImageUri(result.assets[0].uri);
      }
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Picker failed',
        message: error?.message || 'Could not open the image picker.',
      });
    }
  };

  const closeComposer = () => {
    setCreateModalVisible(false);
    setEditingPostId(null);
    setPostDescription('');
    setPostTitle('');
    setPostImageUri(null);
  };

  const openCreatePost = () => {
    setEditingPostId(null);
    setPostDescription('');
    setPostTitle('');
    setPostImageUri(null);
    setCreateModalVisible(true);
  };

  const openEditPost = (post: Post) => {
    setManagePost(null);
    setCommentModalVisible(false);
    setEditingPostId(post.id);
    setPostTitle(post.title || '');
    setPostDescription(post.description || '');
    setPostImageUri(post.imageUrl || null);
    setCreateModalVisible(true);
  };

  const confirmDeletePost = async (post: Post) => {
    const runDelete = async () => {
      try {
        await authApi.deletePost(post.id);
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
        setManagePost(null);
        if (selectedPost?.id === post.id) {
          setCommentModalVisible(false);
          setSelectedPost(null);
        }
        setStatusModal({
          visible: true,
          type: 'success',
          title: 'Deleted',
          message: 'Your post was removed.',
        });
      } catch (error: any) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Delete failed',
          message: error.message || 'Could not delete post',
        });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this post? This cannot be undone.')) {
        await runDelete();
      }
      return;
    }

    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  };

  const handleSavePost = async () => {
    if (!postTitle.trim()) {
      setStatusModal({
        visible: true,
        type: 'info',
        title: 'Title required',
        message: 'Add a short title — this is what appears on the dashboard.',
      });
      return;
    }
    if (!postDescription.trim()) {
      setStatusModal({
        visible: true,
        type: 'info',
        title: 'Required',
        message: 'Write something to share with the community.',
      });
      return;
    }

    const isEditing = !!editingPostId;
    if (!isEditing && !postImageUri) {
      setStatusModal({
        visible: true,
        type: 'info',
        title: 'Cover image required',
        message:
          'Add one image that represents this post. It will appear in Latest Update on the dashboard.',
      });
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        const isRemoteImage =
          !!postImageUri &&
          (postImageUri.startsWith('http://') || postImageUri.startsWith('https://'));
        const updated = await authApi.updatePost(editingPostId!, {
          title: postTitle.trim(),
          description: postDescription.trim(),
          imageUri: isRemoteImage ? null : postImageUri,
        });
        const normalized = normalizePosts([updated])[0];
        setPosts((prev) => prev.map((p) => (p.id === normalized.id ? normalized : p)));
        if (selectedPost?.id === normalized.id) {
          setSelectedPost(normalized);
        }
        closeComposer();
        setStatusModal({
          visible: true,
          type: 'success',
          title: 'Updated',
          message: 'Your post was updated.',
        });
      } else {
        const post = await authApi.createPost({
          title: postTitle.trim(),
          description: postDescription.trim(),
          imageUri: postImageUri!,
        });
        const normalized = normalizePosts([post])[0];
        setPosts((prev) =>
          prev.some((p) => p.id === normalized.id) ? prev : [normalized, ...prev],
        );
        closeComposer();
        setStatusModal({
          visible: true,
          type: 'success',
          title: 'Posted',
          message: 'Your update is live in the feed.',
        });
      }
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Failed',
        message: error.message || (isEditing ? 'Could not update post' : 'Could not create post'),
      });
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = (q: string) => {
    setUserQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const users = await authApi.searchCommunityUsers(q);
        setUserResults(Array.isArray(users) ? users : []);
      } catch {
        setUserResults([]);
      }
    }, 250);
  };

  const openDirectChat = async (userId: string) => {
    setLoading(true);
    try {
      const conversation = await authApi.createDirectConversation(userId);
      setNewChatVisible(false);
      setUserQuery('');
      setUserResults([]);
      router.push({
        pathname: '/CommunityChat',
        params: { id: conversation.id, name: conversation.name },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Chat failed',
        message: error.message || 'Could not start chat',
      });
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) {
      setStatusModal({
        visible: true,
        type: 'info',
        title: 'Almost there',
        message: 'Give the group a name and pick at least one member.',
      });
      return;
    }
    setLoading(true);
    try {
      const conversation = await authApi.createGroupConversation(
        groupName.trim(),
        selectedMemberIds,
      );
      setNewGroupVisible(false);
      setGroupName('');
      setSelectedMemberIds([]);
      setUserQuery('');
      setUserResults([]);
      router.push({
        pathname: '/CommunityChat',
        params: { id: conversation.id, name: conversation.name },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Group failed',
        message: error.message || 'Could not create group',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const avatar = (uri?: string | null) =>
    uri ? { uri } : require('../../assets/profile-pic.png');

  const headerActionIcon =
    communityTab === 'Feed'
      ? 'camera-outline'
      : communityTab === 'Group'
        ? 'people-outline'
        : 'create-outline';
  const headerActionLabel =
    communityTab === 'Feed'
      ? 'New post'
      : communityTab === 'Group'
        ? 'New group'
        : 'New message';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={toggleSidebar}
            style={styles.headerIconBtn}
            accessibilityLabel="Open menu"
            hitSlop={10}
          >
            <Ionicons name="menu" size={24} color={colors.textOnBrand} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerEyebrow}>Agrisense</Text>
            <Text style={styles.headerTitle}>Community</Text>
          </View>
          <TouchableOpacity
            onPress={onHeaderPrimaryAction}
            style={styles.headerIconBtn}
            accessibilityLabel={headerActionLabel}
            hitSlop={10}
          >
            <Ionicons name={headerActionIcon as any} size={22} color={colors.textOnBrand} />
          </TouchableOpacity>
        </View>

        <View style={styles.communityTabs}>
          {(['Feed', 'Inbox', 'Group'] as const).map((tab) => {
            const active = communityTab === tab;
            const badge =
              tab === 'Inbox' ? inboxUnread : tab === 'Group' ? groupUnread : 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.communityTab, active && styles.communityTabActive]}
                onPress={() => setCommunityTab(tab)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={
                  badge > 0 ? `${TAB_LABELS[tab]}, ${badge} unread` : TAB_LABELS[tab]
                }
              >
                <Text
                  style={[
                    styles.communityTabText,
                    active && styles.communityTabTextActive,
                  ]}
                >
                  {TAB_LABELS[tab]}
                </Text>
                {badge > 0 ? (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {communityTab === 'Feed' && (
        <TouchableOpacity
          style={styles.addPostCard}
          onPress={openCreatePost}
          activeOpacity={0.88}
          accessibilityLabel="Create a new post"
        >
          <Image source={avatar(userData?.profileImage)} style={styles.composerAvatar} />
          <View style={styles.composerPill}>
            <Text style={styles.composerPlaceholder}>Share a photo from the farm…</Text>
          </View>
          <View style={styles.composerCamera}>
            <Ionicons name="camera" size={18} color={colors.brandMid} />
          </View>
        </TouchableOpacity>
      )}

      {communityTab === 'Feed' && (
        <ScrollView
          ref={feedScrollRef}
          style={styles.postsList}
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && posts.length > 0}
              onRefresh={fetchPosts}
              colors={[colors.brandMid]}
              tintColor={colors.brandMid}
            />
          }
        >
          {refreshing && posts.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.brandMid} />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="images-outline" size={36} color={colors.brandMid} />
              </View>
              <Text style={styles.emptyStateTitle}>Nothing here yet</Text>
              <Text style={styles.emptyStateText}>
                Share the first photo update from your farm.
              </Text>
            </View>
          ) : (
            posts.map((post) => {
              const liked =
                post.likedByMe ||
                post.likes.some((like) => like.user?.id === userData?.id);
              const isHighlighted = highlightPostId === post.id;
              const hasRealImage = !!post.imageUrl;
              const isMine = post.author?.id === userData?.id;
              return (
                <View
                  key={post.id}
                  onLayout={(e) => {
                    postOffsets.current[post.id] = e.nativeEvent.layout.y;
                  }}
                  style={[styles.postCard, isHighlighted && styles.postCardHighlight]}
                >
                  <View style={styles.postHeader}>
                    <TouchableOpacity
                      style={[styles.authorInfo, { flex: 1 }]}
                      activeOpacity={0.85}
                      onPress={() => openPostDetail(post)}
                    >
                      <Image
                        source={avatar(post.author?.profileImage)}
                        style={styles.profilePic}
                      />
                      <View style={styles.authorMeta}>
                        <Text style={styles.authorName}>
                          {post.author?.username || 'Farmer'}
                        </Text>
                        <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                    {isMine ? (
                      <TouchableOpacity
                        hitSlop={14}
                        onPress={() => setManagePost(post)}
                        accessibilityLabel="Manage post"
                        style={styles.moreBtn}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity activeOpacity={0.95} onPress={() => openPostDetail(post)}>
                    <View style={styles.postCoverWrap}>
                      <Image
                        source={postCoverSource(post)}
                        style={styles.postCover}
                        resizeMode="cover"
                      />
                      {!hasRealImage && (
                        <View style={styles.placeholderBadge}>
                          <Ionicons name="image-outline" size={12} color="#fff" />
                          <Text style={styles.placeholderBadgeText}>Preview</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleLikePost(post.id)}
                      accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
                    >
                      <Ionicons
                        name={liked ? 'heart' : 'heart-outline'}
                        size={24}
                        color={liked ? colors.danger : colors.text}
                      />
                      <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
                        {post.likeCount ?? post.likes.length}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openPostDetail(post)}
                      accessibilityLabel="View comments"
                    >
                      <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
                      <Text style={styles.actionText}>
                        {post.commentCount ?? post.comments.length}
                      </Text>
                    </TouchableOpacity>
                    {isMine ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => setManagePost(post)}
                        accessibilityLabel="Edit post"
                      >
                        <Ionicons name="create-outline" size={22} color={colors.brandMid} />
                        <Text style={[styles.actionText, { color: colors.brandMid }]}>Edit</Text>
                      </TouchableOpacity>
                    ) : post.author?.id ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openDirectChat(post.author!.id)}
                        accessibilityLabel="Message author"
                      >
                        <Ionicons name="paper-plane-outline" size={22} color={colors.text} />
                        <Text style={styles.actionText}>Message</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openPostDetail(post)}
                    style={styles.captionBlock}
                  >
                    {!!post.title && (
                      <Text style={styles.postTitle} numberOfLines={2}>
                        {post.title}
                      </Text>
                    )}
                    <Text style={styles.postContent} numberOfLines={3}>
                      <Text style={styles.captionAuthor}>
                        {post.author?.username || 'Farmer'}{' '}
                      </Text>
                      {post.description}
                    </Text>
                    {(post.description?.length || 0) > 120 && (
                      <Text style={styles.readMore}>Read more</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {(communityTab === 'Inbox' || communityTab === 'Group') && (
        <ScrollView
          style={styles.postsList}
          contentContainerStyle={
            conversations.length === 0 ? styles.conversationListEmpty : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={conversationsRefreshing}
              onRefresh={refreshConversations}
              colors={[colors.brandMid]}
              tintColor={colors.brandMid}
            />
          }
        >
          {conversations.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={communityTab === 'Inbox' ? 'chatbubbles-outline' : 'people-outline'}
                  size={36}
                  color={colors.brandMid}
                />
              </View>
              <Text style={styles.emptyStateTitle}>
                {communityTab === 'Inbox' ? 'No messages yet' : 'No groups yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {communityTab === 'Inbox'
                  ? 'Start a chat with another farmer from the + button above.'
                  : 'Create a group to coordinate with your community.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={onHeaderPrimaryAction}
                activeOpacity={0.88}
              >
                <Ionicons
                  name={communityTab === 'Inbox' ? 'create-outline' : 'people-outline'}
                  size={18}
                  color="#fff"
                />
                <Text style={styles.emptyCtaText}>
                  {communityTab === 'Inbox' ? 'New message' : 'New group'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.messageList}>
              {conversations.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  mode={communityTab as 'Inbox' | 'Group'}
                  timeAgo={timeAgo}
                  avatar={avatar}
                  online={
                    communityTab === 'Inbox'
                      ? isOnline(item.otherMembers?.[0]?.id)
                      : false
                  }
                  onPress={() => {
                    const unread = Number(item.unreadCount) || 0;
                    if (unread > 0) {
                      setConversations((prev) =>
                        prev.map((c) =>
                          c.id === item.id ? { ...c, unreadCount: 0 } : c,
                        ),
                      );
                      if (communityTab === 'Inbox') {
                        setInboxUnread((n) => Math.max(0, n - unread));
                      } else {
                        setGroupUnread((n) => Math.max(0, n - unread));
                      }
                    }
                    router.push({
                      pathname: '/CommunityChat',
                      params: { id: item.id, name: item.name },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create post */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPostId ? 'Edit Post' : 'New Post'}
              </Text>
              <TouchableOpacity onPress={closeComposer}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.addPostSubtitleModal}>
                {editingPostId
                  ? 'Update your title, photo, or description.'
                  : 'Photo-first posts: cover image + short title (shown on the dashboard) + description.'}
              </Text>

              {postImageUri ? (
                <View style={styles.postImagePreviewWrap}>
                  <Image source={{ uri: postImageUri }} style={styles.postImagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setPostImageUri(null)}
                  >
                    <Ionicons name="close-circle" size={26} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.changeImageBtn} onPress={pickPostImage}>
                    <Text style={styles.changeImageText}>Change image</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickImageBtn} onPress={pickPostImage}>
                  <View style={styles.pickImageIconCircle}>
                    <Ionicons name="camera" size={28} color="#166534" />
                  </View>
                  <Text style={styles.pickImageText}>
                    {editingPostId ? 'Add / replace cover image' : 'Upload cover image'}
                  </Text>
                  <Text style={styles.pickImageHint}>
                    {Platform.OS === 'web' ? 'Click to choose a photo' : 'Tap to choose from gallery'}
                  </Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={styles.titleInput}
                placeholder="Short title (e.g. Tomato tips this week)"
                placeholderTextColor="#999"
                value={postTitle}
                onChangeText={setPostTitle}
                maxLength={120}
              />
              <TextInput
                style={styles.descriptionInput}
                placeholder="Write the full description..."
                placeholderTextColor="#999"
                multiline
                value={postDescription}
                onChangeText={setPostDescription}
              />
              <TouchableOpacity
                style={[styles.postBtn, loading && styles.postBtnDisabled]}
                onPress={handleSavePost}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postBtnText}>
                    {editingPostId ? 'Save changes' : 'Share post'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Post detail + Comments */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {selectedPost?.author?.id === userData?.id && (
                  <TouchableOpacity onPress={() => setManagePost(selectedPost)}>
                    <Ionicons name="ellipsis-horizontal" size={22} color="#333" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView style={styles.modalBody}>
              {selectedPost && (
                <View style={styles.postDetailBlock}>
                  <View style={styles.authorInfo}>
                    <Image
                      source={avatar(selectedPost.author?.profileImage)}
                      style={styles.profilePic}
                    />
                    <View>
                      <Text style={styles.authorName}>
                        {selectedPost.author?.username || 'Farmer'}
                      </Text>
                      <Text style={styles.timeAgo}>{timeAgo(selectedPost.createdAt)}</Text>
                    </View>
                  </View>
                  <Image
                    source={postCoverSource(selectedPost)}
                    style={styles.postDetailCover}
                    resizeMode="cover"
                  />
                  {!!selectedPost.title && (
                    <Text style={styles.postDetailTitle}>{selectedPost.title}</Text>
                  )}
                  <Text style={styles.postDetailText}>{selectedPost.description}</Text>
                  <View style={styles.engagementStats}>
                    <Text style={styles.statText}>
                      {selectedPost.likeCount ?? selectedPost.likes.length} Likes
                    </Text>
                    <Text style={styles.statText}>
                      {selectedPost.commentCount ?? selectedPost.comments.length} Comments
                    </Text>
                  </View>
                </View>
              )}
              <Text style={styles.commentsSectionLabel}>Comments</Text>
              {selectedPost?.comments?.length ? (
                selectedPost.comments.map((c) => (
                  <View key={c.id} style={styles.commentItem}>
                    <Image
                      source={avatar(c.author?.profileImage || c.user?.profileImage)}
                      style={styles.commentProfilePic}
                    />
                    <View style={styles.commentContentContainer}>
                      <Text style={styles.commentAuthor}>
                        {c.author?.username || c.user?.username || 'Farmer'}
                      </Text>
                      <Text style={styles.commentText}>{c.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor="#999"
                value={commentContent}
                onChangeText={setCommentContent}
              />
              <TouchableOpacity
                onPress={handleCommentPost}
                disabled={loading || !commentContent.trim()}
              >
                <Ionicons
                  name="send"
                  size={22}
                  color={commentContent.trim() ? '#166534' : '#ccc'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New DM */}
      <Modal visible={newChatVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Message a farmer</Text>
              <TouchableOpacity onPress={() => setNewChatVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.searchInputModal}
                placeholder="Search username..."
                value={userQuery}
                onChangeText={searchUsers}
                placeholderTextColor="#999"
              />
              <ScrollView>
                {userResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.userRow}
                    onPress={() => openDirectChat(u.id)}
                  >
                    <View style={styles.userAvatarWrap}>
                      <Image source={avatar(u.profileImage)} style={styles.profilePic} />
                      {isOnline(u.id) || (u as any).online ? (
                        <View style={styles.userOnlineDot} />
                      ) : null}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.authorName}>{u.username}</Text>
                      <Text style={styles.userPresenceText}>
                        {isOnline(u.id) || (u as any).online ? 'Active now' : 'Offline'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* New group */}
      <Modal visible={newGroupVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create group</Text>
              <TouchableOpacity onPress={() => setNewGroupVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <TextInput
                style={styles.searchInputModal}
                placeholder="Group name"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor="#999"
              />
              <TextInput
                style={styles.searchInputModal}
                placeholder="Search members..."
                value={userQuery}
                onChangeText={searchUsers}
                placeholderTextColor="#999"
              />
              <ScrollView style={{ maxHeight: 280 }}>
                {userResults.map((u) => {
                  const selected = selectedMemberIds.includes(u.id);
                  return (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userRow}
                      onPress={() => toggleMember(u.id)}
                    >
                      <Image source={avatar(u.profileImage)} style={styles.profilePic} />
                      <Text style={[styles.authorName, { flex: 1 }]}>{u.username}</Text>
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color="#166534"
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={[styles.postBtn, loading && styles.postBtnDisabled]}
                onPress={createGroup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postBtnText}>Create group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manage own post: Edit / Delete */}
      <Modal visible={!!managePost} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.manageOverlay}
          activeOpacity={1}
          onPress={() => setManagePost(null)}
        >
          <View
            style={styles.manageSheet}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.manageTitle}>Manage post</Text>
            <TouchableOpacity
              style={styles.manageAction}
              onPress={() => managePost && openEditPost(managePost)}
            >
              <Ionicons name="create-outline" size={20} color="#166534" />
              <Text style={styles.manageActionText}>Edit post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageAction}
              onPress={() => managePost && confirmDeletePost(managePost)}
            >
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={[styles.manageActionText, { color: '#DC2626' }]}>
                Delete post
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manageAction, styles.manageCancel]}
              onPress={() => setManagePost(null)}
            >
              <Text style={styles.manageCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.brand,
    paddingBottom: 14,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textOnBrand },
  communityTabs: {
    flexDirection: 'row',
    paddingHorizontal: space.lg,
    paddingTop: 6,
    gap: 8,
  },
  communityTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  communityTabActive: { backgroundColor: '#fff' },
  communityTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
  },
  communityTabTextActive: { color: colors.brand },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.unread,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.brand,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  addPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    marginHorizontal: space.lg,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow.card,
  },
  composerAvatar: { width: 40, height: 40, borderRadius: 20 },
  composerPill: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  composerPlaceholder: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  composerCamera: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postsList: { flex: 1 },
  conversationListEmpty: { flexGrow: 1 },
  postCard: {
    backgroundColor: colors.surface,
    marginHorizontal: space.lg,
    marginTop: 12,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  postCardHighlight: {
    borderColor: colors.brandMuted,
    backgroundColor: colors.brandWash,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorMeta: { gap: 2 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },
  authorName: { fontWeight: '700', fontSize: 15, color: colors.text },
  timeAgo: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  moreBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
  },
  captionBlock: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  captionAuthor: {
    fontWeight: '800',
    color: colors.text,
  },
  postCoverWrap: {
    width: '100%',
    backgroundColor: colors.border,
    position: 'relative',
  },
  postCover: {
    width: '100%',
    height: FEED_CARD_WIDTH * 1.15,
    backgroundColor: colors.border,
  },
  placeholderBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  placeholderBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  postDetailCover: {
    width: '100%',
    aspectRatio: 4 / 5,
    minHeight: 220,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  pickImageBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.brandMid,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    marginBottom: 16,
    backgroundColor: colors.brandWash,
  },
  pickImageIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  pickImageText: {
    color: colors.brandMid,
    fontWeight: '800',
    fontSize: 15,
  },
  pickImageHint: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  postImagePreviewWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  postImagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
  },
  changeImageBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.brandWash,
  },
  changeImageText: {
    color: colors.brandMid,
    fontWeight: '600',
    fontSize: 13,
  },
  manageOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  manageSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  manageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  manageActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brandMid,
  },
  manageCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 4,
  },
  manageCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
  },
  readMore: {
    marginTop: 4,
    color: colors.brandMid,
    fontWeight: '700',
    fontSize: 13,
  },
  postDetailBlock: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  postDetailText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '500',
  },
  commentsSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  engagementStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statText: { color: '#666', fontSize: 13 },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  actionTextActive: { color: colors.brandMid, fontWeight: '700' },
  actionTextLiked: { color: colors.danger, fontWeight: '800' },
  messageList: {
    backgroundColor: colors.surface,
    marginTop: 8,
    paddingBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 72,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
  },
  emptyCta: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brandMid,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  addPostSubtitleModal: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  titleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  postDetailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  postBtn: {
    backgroundColor: colors.brandMid,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: 'white', fontWeight: 'bold' },
  commentItem: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  commentProfilePic: { width: 32, height: 32, borderRadius: 16 },
  commentContentContainer: { flex: 1 },
  commentAuthor: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { fontSize: 14, color: '#333' },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },
  emptyComments: { alignItems: 'center', paddingVertical: 40 },
  emptyCommentsText: { color: '#999', fontSize: 14 },
  searchInputModal: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userAvatarWrap: {
    position: 'relative',
  },
  userOnlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userPresenceText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20 },
  userName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
});
