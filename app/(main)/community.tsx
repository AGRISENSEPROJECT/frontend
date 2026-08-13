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
  Share,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
import NotificationBell from '@/components/NotificationBell';
import { colors, radius, shadow, space } from '@/constants/theme';
import { usePresence } from '@/context/PresenceContext';
import { formatPersonName, isDeletedAccount, userDisplayName } from '@/utils/userDisplay';
import { encodeSharedPost } from '@/utils/sharedPost';
import type { CommunityAuthor } from '@/services/api';
import {
  FeedPostSkeleton,
  ConversationSkeleton,
} from '@/components/ui/Skeleton';

const FEED_PAGE_SIZE = 8;
const FEED_CARD_WIDTH = Dimensions.get('window').width - 32;

type CommunityTab = 'Feed' | 'Inbox' | 'Group' | 'Contacts';

const TAB_LABELS: Record<CommunityTab, string> = {
  Feed: 'Feed',
  Inbox: 'Inbox',
  Group: 'Group',
  Contacts: 'Contact',
};

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

type Author = CommunityAuthor;

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
  shareCount?: number;
  likedByMe?: boolean;
  createdAt: string;
};

type Conversation = {
  id: string;
  type: 'direct' | 'group';
  name: string;
  imageUrl?: string | null;
  lastMessage?: { content: string; createdAt: string; sender?: Author | null } | null;
  unreadCount?: number;
  otherMembers?: Author[];
  members?: Author[];
};

const PUBLIC_SHARE_ORIGIN = 'https://agrisense.rw';

function conversationTitle(c: Conversation) {
  if (c.type === 'group') return c.name || 'Group';
  const peer = c.otherMembers?.[0];
  if (isDeletedAccount(peer) || isDeletedAccount({ name: c.name })) return 'Unavailable';
  return formatPersonName(userDisplayName(peer)) || c.name || 'Farmer';
}

export default function Community() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleSidebar } = useSidebar();
  const { isOnline } = usePresence();
  const params = useLocalSearchParams<{ tab?: string; postId?: string }>();

  const [communityTab, setCommunityTab] = useState<CommunityTab>('Feed');
  const [feedQuery, setFeedQuery] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Author[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [sharePostTarget, setSharePostTarget] = useState<Post | null>(null);
  const [shareTargets, setShareTargets] = useState<Conversation[]>([]);
  const [shareBusy, setShareBusy] = useState(false);
  const [feedMenuVisible, setFeedMenuVisible] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([]);
  const [groupConversations, setGroupConversations] = useState<Conversation[]>([]);
  const [inboxLoaded, setInboxLoaded] = useState(false);
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);
  const [conversationsRefreshing, setConversationsRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [managePost, setManagePost] = useState<Post | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
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
    if (minutes < 60) return minutes === 1 ? '1 min' : `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? '1 hour' : `${hours} hours`;
    const days = Math.floor(hours / 24);
    if (days < 7) return days === 1 ? '1 day' : `${days} days`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return weeks === 1 ? '1 week' : `${weeks} weeks`;
    const months = Math.floor(days / 30);
    return months <= 1 ? '1 month' : `${months} months`;
  };

  const formatConversationTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    }
    return timeAgo(dateString);
  };

  const normalizePosts = (payload: any): Post[] => {
    const items = Array.isArray(payload) ? payload : payload?.items || [];
    return items.map((post: any) => ({
      ...post,
      imageUrl: post.imageUrl || post.image_url || null,
      author: post.author || post.user || null,
      likes: (post.likes || post.likedBy || []).map((like: any) => ({
        id: like.id || like.userId || like.user?.id,
        user: like.user || like.author || (like.profileImage || like.firstName ? like : null),
      })),
      comments: (post.comments || []).map((c: any) => ({
        ...c,
        author: c.author || c.user || null,
      })),
      shareCount: Number(post.shareCount) || 0,
      likedByMe:
        post.likedByMe ??
        (post.likes || post.likedBy || []).some(
          (like: any) => (like.user?.id || like.userId || like.id) === userData?.id,
        ),
    }));
  };

  const feedPageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const fetchPosts = useCallback(async (opts?: { reset?: boolean }) => {
    const reset = opts?.reset !== false;
    if (reset) {
      setRefreshing(true);
      setFeedLoading(true);
      feedPageRef.current = 1;
      hasMoreRef.current = true;
    } else {
      if (loadingMoreRef.current || !hasMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    const page = reset ? 1 : feedPageRef.current + 1;
    try {
      const data = await authApi.getPosts({ page, limit: FEED_PAGE_SIZE });
      const items = normalizePosts(data);
      const total = typeof data?.total === 'number' ? data.total : undefined;

      setPosts((prev) => {
        if (reset) return items;
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...items.filter((p) => !seen.has(p.id))];
        if (typeof total === 'number') {
          hasMoreRef.current = merged.length < total && items.length > 0;
        } else {
          hasMoreRef.current = items.length >= FEED_PAGE_SIZE;
        }
        setHasMorePosts(hasMoreRef.current);
        return merged;
      });

      if (reset) {
        if (typeof total === 'number') {
          hasMoreRef.current = items.length < total;
        } else {
          hasMoreRef.current = items.length >= FEED_PAGE_SIZE;
        }
        setHasMorePosts(hasMoreRef.current);
      }

      feedPageRef.current = page;
      setFeedPage(page);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setRefreshing(false);
      setFeedLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userData?.id]);

  const loadMorePosts = useCallback(() => {
    fetchPosts({ reset: false });
  }, [fetchPosts]);

  const onFeedScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const nearBottom =
        layoutMeasurement.height + contentOffset.y >= contentSize.height - 360;
      if (nearBottom) loadMorePosts();
    },
    [loadMorePosts],
  );

  const fetchConversations = useCallback(async (type: 'direct' | 'group') => {
    try {
      const data = await authApi.listConversations(type);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => (b.unreadCount || 0) - (a.unreadCount || 0));
      if (type === 'group') {
        setGroupConversations(list);
        setGroupLoaded(true);
      } else {
        setInboxConversations(list);
        setInboxLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      if (type === 'group') setGroupLoaded(true);
      else setInboxLoaded(true);
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
    if (params.tab === 'groups') setCommunityTab('Group');
    if (params.tab === 'contacts') setCommunityTab('Contacts');
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
      fetchPosts({ reset: true });
      refreshUnreadBadges();
    })();
  }, [fetchPosts, refreshUnreadBadges]);

  const fetchContacts = useCallback(async (q?: string) => {
    setContactsLoading(true);
    try {
      const users = await authApi.searchCommunityUsers(q);
      setContacts(Array.isArray(users) ? users : []);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (communityTab === 'Inbox') fetchConversations('direct');
    if (communityTab === 'Group') fetchConversations('group');
    if (communityTab === 'Contacts') fetchContacts();
  }, [communityTab, fetchConversations, fetchContacts]);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadBadges();
      if (communityTab === 'Inbox') fetchConversations('direct');
      if (communityTab === 'Group') fetchConversations('group');
      if (communityTab === 'Contacts') fetchContacts();
    }, [communityTab, fetchConversations, fetchContacts, refreshUnreadBadges]),
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

  const visiblePostTitle = (post: Post) => {
    const title = post.title?.trim() || '';
    if (!title) return null;
    if (/^(post|untitled|new post)$/i.test(title)) return null;
    if (title === (post.description || '').trim()) return null;
    return title;
  };

  const sharePayload = (post: Post, shareUrl?: string) => {
    const title = visiblePostTitle(post);
    const body = [title, post.description].filter(Boolean).join('\n\n');
    const url = shareUrl || `${PUBLIC_SHARE_ORIGIN}/community?postId=${post.id}`;
    return {
      title: title || 'Farming Community',
      text: body || 'Check this post on Agrisense',
      url,
      message: `${body || 'Check this post on Agrisense'}\n\n${url}`.trim(),
    };
  };

  const applyShareCount = (postId: string, shareCount?: number) => {
    const next = Number(shareCount);
    const useServer = Number.isFinite(next);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, shareCount: useServer ? next : (p.shareCount || 0) + 1 }
          : p,
      ),
    );
    setSelectedPost((prev) =>
      prev && prev.id === postId
        ? {
            ...prev,
            shareCount: useServer ? next : (prev.shareCount || 0) + 1,
          }
        : prev,
    );
  };

  const persistShare = async (postId: string) => {
    try {
      const res = await authApi.sharePost(postId);
      applyShareCount(postId, res?.shareCount);
      return res;
    } catch (error) {
      console.warn('sharePost failed', error);
      applyShareCount(postId);
      return null;
    }
  };

  const openShareSheet = async (post: Post) => {
    setSharePostTarget(post);
    try {
      const [direct, group] = await Promise.all([
        authApi.listConversations('direct'),
        authApi.listConversations('group'),
      ]);
      const list = [
        ...(Array.isArray(direct) ? direct : []),
        ...(Array.isArray(group) ? group : []),
      ];
      setShareTargets(list.slice(0, 12));
    } catch {
      setShareTargets([]);
    }
  };

  const shareViaSystem = async (post: Post) => {
    const payload = sharePayload(post);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
      } else {
        await Share.share({
          title: payload.title,
          message: payload.message,
          url: payload.url,
        });
      }
      const res = await persistShare(post.id);
      setSharePostTarget(null);
      if (!res) {
        setStatusModal({
          visible: true,
          type: 'info',
          title: 'Shared',
          message: 'Shared on this device, but the count may not save until the server is updated.',
        });
      }
    } catch {
      // cancelled
    }
  };

  const copyShareLink = async (post: Post) => {
    try {
      const res = await persistShare(post.id);
      const payload = sharePayload(post, res?.shareUrl);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.url);
      } else {
        await Share.share({ message: payload.url, title: payload.title });
      }
      setSharePostTarget(null);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Copied',
        message: 'Post link copied. Paste it in a chat or message.',
      });
    } catch {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Share failed',
        message: 'Could not copy the post link.',
      });
    }
  };

  const shareToConversation = async (conversation: Conversation) => {
    if (!sharePostTarget) return;
    setShareBusy(true);
    try {
      const author = formatPersonName(userDisplayName(sharePostTarget.author));
      await authApi.sendConversationMessage(
        conversation.id,
        encodeSharedPost({
          postId: sharePostTarget.id,
          title: visiblePostTitle(sharePostTarget),
          snippet: (sharePostTarget.description || '').trim().slice(0, 140),
          author,
        }),
      );
      await persistShare(sharePostTarget.id);
      setSharePostTarget(null);
      router.push({
        pathname: '/CommunityChat',
        params: { id: conversation.id, name: conversationTitle(conversation) },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Share failed',
        message: error?.message || 'Could not send this post to the chat.',
      });
    } finally {
      setShareBusy(false);
    }
  };

  const sharePost = (post: Post) => {
    openShareSheet(post);
  };

  useEffect(() => {
    let mounted = true;
    let onCreated: ((post: any) => void) | null = null;
    let onDeleted: ((payload: { id: string }) => void) | null = null;
    let onLiked: ((payload: any) => void) | null = null;
    let onUnliked: ((payload: any) => void) | null = null;
    let onCommented: ((comment: any) => void) | null = null;
    let onConversationUpdated: (() => void) | null = null;
    let onMessageNew: ((message: any) => void) | null = null;

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
        // Live WhatsApp-style tab badges when a DM/group message arrives
        onMessageNew = (message: any) => {
          if (!message || message.sender?.id === userData?.id) return;
          refreshUnreadBadges();
          if (communityTab === 'Inbox') fetchConversations('direct');
          if (communityTab === 'Group') fetchConversations('group');
        };

        sock.on('post:created', onCreated);
        sock.on('post:deleted', onDeleted);
        sock.on('post:liked', onLiked);
        sock.on('post:unliked', onUnliked);
        sock.on('post:commented', onCommented);
        sock.on('conversation:updated', onConversationUpdated);
        sock.on('message:new', onMessageNew);
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
          if (onMessageNew) sock.off('message:new', onMessageNew);
        })
        .catch(() => undefined);
    };
  }, [communityTab, fetchConversations, refreshUnreadBadges, userData?.id]);

  const handleLikePost = async (postId: string) => {
    try {
      const result = await authApi.likePost(postId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const liked = !!result.liked;
          const already = p.likes.some((like) => like.user?.id === userData?.id);
          return {
            ...p,
            likedByMe: liked,
            likeCount: result.likeCount ?? Math.max(0, (p.likeCount ?? p.likes.length) + (liked ? (already ? 0 : 1) : already ? -1 : 0)),
            likes: liked
              ? already
                ? p.likes
                : [...p.likes, { id: `me-${userData?.id}`, user: userData }]
              : p.likes.filter((like) => like.user?.id !== userData?.id),
          };
        }),
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCommentPost = async () => {
    if (!selectedPost || !commentContent.trim()) return;
    setLoading(true);
    try {
      if (editingCommentId) {
        const updated = await authApi.updateComment(
          editingCommentId,
          commentContent.trim(),
        );
        const patchComments = (comments: Post['comments']) =>
          comments.map((c) =>
            c.id === editingCommentId
              ? { ...c, content: updated.content || commentContent.trim() }
              : c,
          );
        setSelectedPost((prev) =>
          prev ? { ...prev, comments: patchComments(prev.comments) } : prev,
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPost.id
              ? { ...p, comments: patchComments(p.comments) }
              : p,
          ),
        );
        setEditingCommentId(null);
        setCommentContent('');
      } else {
        const comment = await authApi.commentPost(
          selectedPost.id,
          commentContent.trim(),
        );
        setCommentContent('');
        setSelectedPost((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.some((c) => c.id === comment.id)
                  ? prev.comments
                  : [...prev.comments, comment],
                commentCount: (prev.commentCount || prev.comments.length) + 1,
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
                  commentCount: (p.commentCount || p.comments.length) + 1,
                }
              : p,
          ),
        );
      }
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: editingCommentId ? 'Edit Failed' : 'Comment Failed',
        message: error.message || 'Could not save comment',
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditComment = (comment: {
    id: string;
    content: string;
  }) => {
    setEditingCommentId(comment.id);
    setCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setCommentContent('');
  };

  const deleteOwnComment = (commentId: string) => {
    if (!selectedPost) return;
    const run = async () => {
      try {
        await authApi.deleteComment(commentId);
        const strip = (comments: Post['comments']) =>
          comments.filter((c) => c.id !== commentId);
        setSelectedPost((prev) =>
          prev
            ? {
                ...prev,
                comments: strip(prev.comments),
                commentCount: Math.max(
                  0,
                  (prev.commentCount || prev.comments.length) - 1,
                ),
              }
            : prev,
        );
        setPosts((prev) =>
          prev.map((p) =>
            p.id === selectedPost.id
              ? {
                  ...p,
                  comments: strip(p.comments),
                  commentCount: Math.max(
                    0,
                    (p.commentCount || p.comments.length) - 1,
                  ),
                }
              : p,
          ),
        );
        if (editingCommentId === commentId) cancelEditComment();
      } catch (error: any) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Delete failed',
          message: error.message || 'Could not delete comment',
        });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Delete this comment?')) {
        run();
      }
      return;
    }
    Alert.alert('Delete comment?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
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

  const isFeed = communityTab === 'Feed';
  const isContacts = communityTab === 'Contacts';
  const messagesUnread = inboxUnread + groupUnread;
  const headerActionLabel =
    communityTab === 'Feed'
      ? 'New post'
      : communityTab === 'Group'
        ? 'New group'
        : communityTab === 'Contacts'
          ? 'Add contact'
          : 'New message';

  const visiblePosts = feedQuery.trim()
    ? posts.filter((p) => {
        const q = feedQuery.trim().toLowerCase();
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          userDisplayName(p.author).toLowerCase().includes(q)
        );
      })
    : posts;

  const activeContacts = contacts.filter((u) => !isDeletedAccount(u));
  const visibleContacts = contactQuery.trim()
    ? activeContacts.filter((u) => {
        const q = contactQuery.trim().toLowerCase();
        return (
          userDisplayName(u).toLowerCase().includes(q) ||
          (u.phoneNumber || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
        );
      })
    : activeContacts;

  const conversations =
    communityTab === 'Group' ? groupConversations : inboxConversations;
  const conversationsLoading =
    communityTab === 'Group' ? !groupLoaded : !inboxLoaded;
  const activeConversations = conversations.filter((c) => {
    if (c.type === 'group') return true;
    return !isDeletedAccount(c.otherMembers?.[0]) && !isDeletedAccount({ name: c.name });
  });
  const activeShareTargets = shareTargets.filter((c) => {
    if (c.type === 'group') return true;
    return !isDeletedAccount(c.otherMembers?.[0]) && !isDeletedAccount({ name: c.name });
  });

  const groupedContacts = visibleContacts.reduce<Record<string, Author[]>>((acc, user) => {
    const letter = (userDisplayName(user)[0] || '#').toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    (acc[key] ||= []).push(user);
    return acc;
  }, {});
  const contactSections = Object.keys(groupedContacts).sort();

  const searchNeedle = chatSearchQuery.trim().toLowerCase();
  const searchedConversations = searchNeedle
    ? activeConversations.filter(
        (c) =>
          c.name.toLowerCase().includes(searchNeedle) ||
          (c.lastMessage?.content || '').toLowerCase().includes(searchNeedle),
      )
    : activeConversations;

  return (
    <View style={styles.container}>
      {isFeed ? (
        <View style={styles.headerLight}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={toggleSidebar}
              style={styles.headerIconBtn}
              accessibilityLabel="Open menu"
              hitSlop={10}
            >
              <Ionicons name="menu" size={26} color="#111" />
            </TouchableOpacity>
            <Text style={styles.feedTitle}>Farming Community</Text>
            <TouchableOpacity
              onPress={() => setFeedMenuVisible(true)}
              style={styles.moreCircle}
              accessibilityLabel="More options"
              hitSlop={10}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#111" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search.."
              placeholderTextColor="#8A8A8A"
              value={feedQuery}
              onChangeText={setFeedQuery}
              returnKeyType="search"
            />
            <Ionicons name="search" size={18} color="#222" />
          </View>
        </View>
      ) : isContacts ? (
        <View style={styles.headerLight}>
          <View style={styles.contactHeaderRow}>
            <Text style={styles.contactTitle}>Contact</Text>
            <TouchableOpacity
              onPress={() => {
                setNewChatVisible(true);
                searchUsers('');
              }}
              hitSlop={8}
              accessibilityLabel="Add contact"
            >
              <Text style={styles.addContactText}>Add contact</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, phone number..."
              placeholderTextColor="#8A8A8A"
              value={contactQuery}
              onChangeText={setContactQuery}
              returnKeyType="search"
            />
            <Ionicons name="search" size={18} color="#222" />
          </View>
        </View>
      ) : (
        <View style={styles.headerLight}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => setCommunityTab('Feed')}
              style={styles.headerIconBtn}
              accessibilityLabel="Back to feed"
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={24} color="#111" />
            </TouchableOpacity>
            <View style={styles.pillToggle}>
              {(['Inbox', 'Group'] as const).map((tab) => {
                const active = communityTab === tab;
                const badge = tab === 'Inbox' ? inboxUnread : groupUnread;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.pillOption, active && styles.pillOptionActive]}
                    onPress={() => setCommunityTab(tab)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={
                      badge > 0 ? `${TAB_LABELS[tab]}, ${badge} unread` : TAB_LABELS[tab]
                    }
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {TAB_LABELS[tab]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.headerRightIcons}>
              <TouchableOpacity
                onPress={() => {
                  setChatSearchOpen(true);
                  setChatSearchQuery('');
                  searchUsers('');
                }}
                style={styles.headerIconBtn}
                accessibilityLabel="Search chats"
                hitSlop={8}
              >
                <Ionicons name="search" size={22} color="#111" />
              </TouchableOpacity>
              <NotificationBell color="#111" size={22} />
            </View>
          </View>
        </View>
      )}

      {communityTab === 'Feed' && (
        <ScrollView
          ref={feedScrollRef}
          style={styles.postsList}
          contentContainerStyle={{ paddingBottom: 12 }}
          onScroll={onFeedScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && posts.length > 0}
              onRefresh={() => fetchPosts({ reset: true })}
              colors={[colors.forest]}
              tintColor={colors.forest}
            />
          }
        >
          {feedLoading && posts.length === 0 ? (
            <View style={{ paddingBottom: 16 }}>
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </View>
          ) : visiblePosts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="images-outline" size={36} color={colors.forest} />
              </View>
              <Text style={styles.emptyStateTitle}>
                {feedQuery.trim() ? 'No matching posts' : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                {feedQuery.trim()
                  ? 'Try a different search.'
                  : 'Share the first photo update from your farm.'}
              </Text>
            </View>
          ) : (
            visiblePosts.map((post) => {
              const liked =
                post.likedByMe ||
                post.likes.some((like) => like.user?.id === userData?.id);
              const isHighlighted = highlightPostId === post.id;
              const isMine = post.author?.id === userData?.id;
              const likeCount = post.likeCount ?? post.likes.length;
              const commentCount = post.commentCount ?? post.comments.length;
              const shareCount = post.shareCount || 0;
              const captionTitle = visiblePostTitle(post);
              const seenLikerIds = new Set<string>();
              const uniqueLikers = post.likes
                .map((like) => like.user)
                .filter((u): u is Author => {
                  if (!u?.id || seenLikerIds.has(u.id)) return false;
                  seenLikerIds.add(u.id);
                  return true;
                });
              const likerSlots = Math.min(3, Math.max(uniqueLikers.length, likeCount > 0 ? Math.min(likeCount, 3) : 0));
              const likers = Array.from({ length: likerSlots }, (_, i) => uniqueLikers[i] || null);
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
                      style={styles.authorInfo}
                      activeOpacity={0.85}
                      onPress={() => openPostDetail(post)}
                    >
                      <Image
                        source={avatar(post.author?.profileImage)}
                        style={styles.profilePic}
                      />
                      <View style={styles.authorMeta}>
                        <Text style={styles.authorName} numberOfLines={1}>
                          {formatPersonName(userDisplayName(post.author))}
                        </Text>
                        <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      hitSlop={14}
                      onPress={() => (isMine ? setManagePost(post) : sharePost(post))}
                      accessibilityLabel={isMine ? 'Manage post' : 'Share post'}
                      style={styles.moreBtn}
                    >
                      <Ionicons name="ellipsis-horizontal" size={20} color={colors.forest} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => openPostDetail(post)}
                    style={styles.captionBlock}
                  >
                    {captionTitle ? (
                      <Text style={styles.postTitle} numberOfLines={2}>
                        {captionTitle}
                      </Text>
                    ) : null}
                    <Text style={styles.postContent} numberOfLines={5}>
                      {post.description || captionTitle}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.95} onPress={() => openPostDetail(post)}>
                    <View style={styles.postCoverWrap}>
                      <Image
                        source={postCoverSource(post)}
                        style={styles.postCover}
                        resizeMode="cover"
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.statsRow}>
                    <View style={styles.likerCluster}>
                      {likers.map((user, index) => (
                        <Image
                          key={user?.id || `liker-${index}`}
                          source={avatar(user?.profileImage)}
                          style={[
                            styles.likerAvatar,
                            { marginLeft: index === 0 ? 0 : -8, zIndex: 3 - index },
                          ]}
                        />
                      ))}
                      <Text style={styles.likeCountText}>{likeCount}</Text>
                    </View>
                    <Text style={styles.statMeta}>
                      {commentCount} comment{commentCount === 1 ? '' : 's'}
                      {'  •  '}
                      {shareCount} share{shareCount === 1 ? '' : 's'}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleLikePost(post.id)}
                      accessibilityLabel={liked ? 'Unlike post' : 'Like post'}
                    >
                      <Ionicons
                        name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={18}
                        color={colors.forest}
                      />
                      <Text style={styles.actionText}>like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openPostDetail(post)}
                      accessibilityLabel="View comments"
                    >
                      <Ionicons name="chatbox-outline" size={18} color={colors.forest} />
                      <Text style={styles.actionText}>comment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => sharePost(post)}
                      accessibilityLabel="Share post"
                    >
                      <Ionicons name="arrow-redo-outline" size={18} color={colors.forest} />
                      <Text style={styles.actionText}>share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
          {loadingMore ? (
            <View style={{ paddingVertical: 18, alignItems: 'center' }}>
              <ActivityIndicator color={colors.forest} />
            </View>
          ) : null}
          {!feedLoading && !loadingMore && visiblePosts.length > 0 && !hasMorePosts ? (
            <Text style={styles.endOfFeed}>You’re all caught up</Text>
          ) : null}
        </ScrollView>
      )}

      {(communityTab === 'Inbox' || communityTab === 'Group') && (
        <ScrollView
          style={styles.postsList}
          contentContainerStyle={
            activeConversations.length === 0 ? styles.conversationListEmpty : undefined
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
          {conversationsLoading && activeConversations.length === 0 ? (
            <View>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </View>
          ) : activeConversations.length === 0 ? (
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
                  ? 'Start a chat with another farmer from the + button below.'
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
              {activeConversations.map((item) => (
                <ConversationRow
                  key={item.id}
                  item={item}
                  mode={communityTab as 'Inbox' | 'Group'}
                  timeAgo={formatConversationTime}
                  avatar={avatar}
                  online={
                    communityTab === 'Inbox'
                      ? isOnline(item.otherMembers?.[0]?.id)
                      : false
                  }
                  onPress={() => {
                    const unread = Number(item.unreadCount) || 0;
                    if (unread > 0) {
                      const zero = (prev: Conversation[]) =>
                        prev.map((c) =>
                          c.id === item.id ? { ...c, unreadCount: 0 } : c,
                        );
                      if (communityTab === 'Inbox') setInboxConversations(zero);
                      else setGroupConversations(zero);
                      if (communityTab === 'Inbox') {
                        setInboxUnread((n) => Math.max(0, n - unread));
                      } else {
                        setGroupUnread((n) => Math.max(0, n - unread));
                      }
                    }
                    router.push({
                      pathname: '/CommunityChat',
                      params: { id: item.id, name: conversationTitle(item) },
                    });
                  }}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {communityTab === 'Contacts' && (
        <ScrollView
          style={styles.postsList}
          contentContainerStyle={
            visibleContacts.length === 0 ? styles.conversationListEmpty : { paddingBottom: 8 }
          }
          refreshControl={
            <RefreshControl
              refreshing={contactsLoading && contacts.length > 0}
              onRefresh={() => fetchContacts()}
              colors={[colors.forest]}
              tintColor={colors.forest}
            />
          }
        >
          {contactsLoading && contacts.length === 0 ? (
            <View>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </View>
          ) : visibleContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="person-outline" size={36} color={colors.forest} />
              </View>
              <Text style={styles.emptyStateTitle}>
                {contactQuery.trim() ? 'No contacts found' : 'No contacts yet'}
              </Text>
              <Text style={styles.emptyStateText}>
                Add a farmer to start a conversation.
              </Text>
            </View>
          ) : (
            contactSections.map((letter) => (
              <View key={letter}>
                <Text style={styles.sectionLetter}>{letter}</Text>
                {groupedContacts[letter].map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.contactRow}
                    onPress={() => openDirectChat(user.id)}
                    activeOpacity={0.75}
                  >
                    <Image source={avatar(user.profileImage)} style={styles.contactAvatar} />
                    <View style={styles.contactMeta}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {userDisplayName(user)}
                      </Text>
                      <Text style={styles.contactSub} numberOfLines={1}>
                        {user.phoneNumber || user.email || 'Farmer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.fabWrap} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.fab}
            onPress={onHeaderPrimaryAction}
            accessibilityLabel={headerActionLabel}
            activeOpacity={0.88}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.dockBar}>
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => setCommunityTab('Feed')}
            accessibilityLabel="Home feed"
            accessibilityState={{ selected: isFeed }}
          >
            <Ionicons
              name={isFeed ? 'home' : 'home-outline'}
              size={24}
              color={colors.forest}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() => setCommunityTab('Contacts')}
            accessibilityLabel="Contacts"
            accessibilityState={{ selected: isContacts }}
          >
            <Ionicons
              name={isContacts ? 'person' : 'person-outline'}
              size={24}
              color={colors.forest}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dockItem}
            onPress={() =>
              setCommunityTab(communityTab === 'Group' ? 'Group' : 'Inbox')
            }
            accessibilityLabel="Messages"
            accessibilityState={{ selected: !isFeed && !isContacts }}
          >
            <View>
              <Ionicons
                name={!isFeed && !isContacts ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={24}
                color={colors.forest}
              />
              {messagesUnread > 0 ? (
                <View style={styles.dockBadge}>
                  <Text style={styles.dockBadgeText}>
                    {messagesUnread > 99 ? '99+' : messagesUnread}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={chatSearchOpen} animationType="fade" transparent>
        <View style={styles.searchOverlay}>
          <View style={styles.searchSheet}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search.."
                placeholderTextColor="#8A8A8A"
                value={chatSearchQuery}
                onChangeText={(text) => {
                  setChatSearchQuery(text);
                  searchUsers(text);
                }}
                autoFocus
                returnKeyType="search"
              />
              <Ionicons name="search" size={18} color="#222" />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {searchedConversations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.searchResultRow}
                  onPress={() => {
                    setChatSearchOpen(false);
                    router.push({
                      pathname: '/CommunityChat',
                      params: { id: item.id, name: item.name },
                    });
                  }}
                >
                  <Ionicons name="search" size={16} color="#555" />
                  <Text style={styles.searchResultText} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {userResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.searchResultRow}
                  onPress={() => {
                    setChatSearchOpen(false);
                    openDirectChat(u.id);
                  }}
                >
                  <Ionicons name="search" size={16} color="#555" />
                  <Text style={styles.searchResultText} numberOfLines={1}>
                    {userDisplayName(u)}
                  </Text>
                </TouchableOpacity>
              ))}
              {searchedConversations.length === 0 && userResults.length === 0 ? (
                <Text style={styles.searchEmpty}>No matches</Text>
              ) : null}
            </ScrollView>
            <TouchableOpacity
              style={styles.searchClose}
              onPress={() => setChatSearchOpen(false)}
            >
              <Text style={styles.searchCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                        {userDisplayName(selectedPost.author)}
                      </Text>
                      <Text style={styles.timeAgo}>{timeAgo(selectedPost.createdAt)}</Text>
                    </View>
                  </View>
                  <Image
                    source={postCoverSource(selectedPost)}
                    style={styles.postDetailCover}
                    resizeMode="cover"
                  />
                  {!!visiblePostTitle(selectedPost) && (
                    <Text style={styles.postDetailTitle}>{visiblePostTitle(selectedPost)}</Text>
                  )}
                  <Text style={styles.postDetailText}>{selectedPost.description}</Text>
                  <View style={styles.engagementStats}>
                    <Text style={styles.statText}>
                      {selectedPost.likeCount ?? selectedPost.likes.length} Likes
                    </Text>
                    <Text style={styles.statText}>
                      {selectedPost.commentCount ?? selectedPost.comments.length} Comments
                      {'  •  '}
                      {selectedPost.shareCount || 0} Shares
                    </Text>
                  </View>
                </View>
              )}
              <Text style={styles.commentsSectionLabel}>Comments</Text>
              {selectedPost?.comments?.length ? (
                selectedPost.comments.map((c) => {
                  const mine =
                    (c.author?.id || c.user?.id) === userData?.id;
                  return (
                  <View key={c.id} style={styles.commentItem}>
                    <Image
                      source={avatar(c.author?.profileImage || c.user?.profileImage)}
                      style={styles.commentProfilePic}
                    />
                    <View style={styles.commentContentContainer}>
                      <View style={styles.commentTopRow}>
                        <Text style={styles.commentAuthor}>
                          {userDisplayName(c.author || c.user)}
                        </Text>
                        {mine ? (
                          <View style={styles.commentActions}>
                            <TouchableOpacity
                              onPress={() => startEditComment(c)}
                              hitSlop={8}
                              accessibilityLabel="Edit comment"
                            >
                              <Ionicons name="create-outline" size={16} color="#166534" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => deleteOwnComment(c.id)}
                              hitSlop={8}
                              accessibilityLabel="Delete comment"
                            >
                              <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.commentText}>{c.content}</Text>
                    </View>
                  </View>
                  );
                })
              ) : (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first!</Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.commentInputContainer}>
              {editingCommentId ? (
                <TouchableOpacity onPress={cancelEditComment} style={styles.editCancelChip}>
                  <Text style={styles.editCancelText}>Cancel edit</Text>
                </TouchableOpacity>
              ) : null}
              <TextInput
                style={styles.commentInput}
                placeholder={editingCommentId ? 'Edit your comment...' : 'Add a comment...'}
                placeholderTextColor="#999"
                value={commentContent}
                onChangeText={setCommentContent}
              />
              <TouchableOpacity
                onPress={handleCommentPost}
                disabled={loading || !commentContent.trim()}
              >
                <Ionicons
                  name={editingCommentId ? 'checkmark-circle' : 'send'}
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
                placeholder="Search farmers..."
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
                      <Text style={styles.authorName}>{userDisplayName(u)}</Text>
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
                      <Text style={[styles.authorName, { flex: 1 }]}>{userDisplayName(u)}</Text>
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

      <Modal
        visible={feedMenuVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.manageOverlay}
          activeOpacity={1}
          onPress={() => setFeedMenuVisible(false)}
        >
          <TouchableOpacity style={styles.shareSheet} activeOpacity={1} onPress={() => undefined}>
            <Text style={styles.manageTitle}>Community</Text>
            <TouchableOpacity
              style={styles.manageAction}
              onPress={() => {
                setFeedMenuVisible(false);
                openCreatePost();
              }}
            >
              <Ionicons name="camera-outline" size={20} color={colors.forest} />
              <Text style={styles.manageActionText}>New post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manageAction, styles.manageCancel]}
              onPress={() => setFeedMenuVisible(false)}
            >
              <Text style={styles.manageCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={!!sharePostTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setSharePostTarget(null)}
      >
        <TouchableOpacity
          style={styles.manageOverlay}
          activeOpacity={1}
          onPress={() => setSharePostTarget(null)}
        >
          <TouchableOpacity style={styles.shareSheet} activeOpacity={1} onPress={() => undefined}>
            <Text style={styles.manageTitle}>Share post</Text>
            <Text style={styles.shareHint} numberOfLines={2}>
              Send it to a farmer, copy the link, or share outside Agrisense.
            </Text>

            {shareBusy ? (
              <ActivityIndicator color={colors.forest} style={{ marginVertical: 12 }} />
            ) : null}

            {activeShareTargets.length > 0 ? (
              <ScrollView style={styles.shareChatList} keyboardShouldPersistTaps="handled">
                {activeShareTargets.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.shareChatRow}
                    disabled={shareBusy}
                    onPress={() => shareToConversation(item)}
                  >
                    <Image
                      source={avatar(
                        item.type === 'group'
                          ? item.imageUrl
                          : item.otherMembers?.[0]?.profileImage,
                      )}
                      style={styles.shareChatAvatar}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.shareChatName} numberOfLines={1}>
                        {conversationTitle(item)}
                      </Text>
                      <Text style={styles.shareChatMeta} numberOfLines={1}>
                        {item.type === 'group' ? 'Group' : 'Inbox'}
                      </Text>
                    </View>
                    <Ionicons name="send-outline" size={18} color={colors.forest} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.shareEmpty}>No chats yet — copy the link or share another way.</Text>
            )}

            <TouchableOpacity
              style={styles.manageAction}
              onPress={() => sharePostTarget && copyShareLink(sharePostTarget)}
            >
              <Ionicons name="copy-outline" size={20} color={colors.forest} />
              <Text style={styles.manageActionText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.manageAction}
              onPress={() => sharePostTarget && shareViaSystem(sharePostTarget)}
            >
              <Ionicons name="share-outline" size={20} color={colors.forest} />
              <Text style={styles.manageActionText}>Share via…</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.manageAction, styles.manageCancel]}
              onPress={() => setSharePostTarget(null)}
            >
              <Text style={styles.manageCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.cream },
  headerLight: {
    backgroundColor: colors.cream,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: 6,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
  },
  moreCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.searchFill,
    marginHorizontal: space.lg,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    minHeight: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D0D0C4',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 10,
  },
  contactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  contactTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  addContactText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: radius.full,
    padding: 4,
    ...shadow.card,
  },
  pillOption: {
    minWidth: 78,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  pillOptionActive: {
    backgroundColor: colors.forest,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  pillTextActive: {
    color: '#fff',
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postsList: { flex: 1 },
  conversationListEmpty: { flexGrow: 1 },
  postCard: {
    backgroundColor: colors.cream,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  postCardHighlight: {
    backgroundColor: colors.brandWash,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  authorMeta: { flex: 1, minWidth: 0, justifyContent: 'center' },
  profilePic: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E8DC' },
  authorName: { fontWeight: '700', fontSize: 16, color: colors.forest, letterSpacing: 0.1 },
  timeAgo: { color: '#2A2A2A', fontSize: 13, fontWeight: '400', marginTop: 2 },
  moreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 21,
    color: '#222',
  },
  captionBlock: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  postCoverWrap: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.border,
    position: 'relative',
  },
  postCover: {
    width: '100%',
    height: FEED_CARD_WIDTH * 0.72,
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
  shareSheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: '78%',
  },
  shareHint: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  shareChatList: {
    maxHeight: 220,
    marginBottom: 8,
  },
  shareChatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4DC',
  },
  shareChatAvatar: { width: 40, height: 40, borderRadius: 20 },
  shareChatName: { fontSize: 15, fontWeight: '700', color: '#111' },
  shareChatMeta: { fontSize: 12, fontWeight: '500', color: '#777', marginTop: 1 },
  shareEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 12,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 8,
  },
  likerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.cream,
  },
  likeCountText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  statMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#D8D8D0',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36 },
  actionText: { color: colors.forest, fontSize: 14, fontWeight: '600' },
  actionTextActive: { color: colors.forest, fontWeight: '700' },
  messageList: {
    backgroundColor: colors.cream,
    paddingBottom: 8,
  },
  sectionLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E4E4DC',
  },
  contactAvatar: { width: 48, height: 48, borderRadius: 24 },
  contactMeta: { flex: 1, minWidth: 0 },
  contactName: { fontSize: 16, fontWeight: '700', color: '#111' },
  contactSub: { fontSize: 13, fontWeight: '500', color: '#666', marginTop: 2 },
  dock: {
    backgroundColor: colors.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D8D8D0',
    paddingTop: 22,
    position: 'relative',
  },
  fabWrap: {
    position: 'absolute',
    top: -22,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.float,
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    minHeight: 48,
  },
  dockItem: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingTop: 72,
    paddingHorizontal: 16,
  },
  searchSheet: {
    backgroundColor: colors.searchFill,
    borderRadius: 22,
    padding: 14,
    maxHeight: '72%',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  searchResultText: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  searchEmpty: {
    textAlign: 'center',
    color: '#777',
    paddingVertical: 20,
    fontWeight: '600',
  },
  searchClose: {
    alignSelf: 'center',
    paddingTop: 8,
  },
  searchCloseText: {
    color: colors.forest,
    fontWeight: '800',
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
    backgroundColor: colors.mint,
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
    backgroundColor: colors.forest,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: radius.full,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  endOfFeed: {
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
    paddingVertical: 18,
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
  commentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  commentAuthor: { fontWeight: 'bold', fontSize: 13, flex: 1 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  commentText: { fontSize: 14, color: '#333' },
  editCancelChip: {
    position: 'absolute',
    top: -28,
    left: 12,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  editCancelText: { color: '#166534', fontWeight: '700', fontSize: 12 },
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
