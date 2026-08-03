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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSidebar } from '../../context/SidebarContext';
import { authApi } from '@/services/api';
import { getCommunitySocket } from '@/services/communitySocket';
import StatusModal from '@/components/ui/StatusModal';

type Author = {
  id: string;
  username: string;
  profileImage?: string | null;
};

type Post = {
  id: string;
  description: string;
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
  const { toggleSidebar } = useSidebar();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [communityTab, setCommunityTab] = useState<'Feed' | 'Inbox' | 'Group'>('Feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [postDescription, setPostDescription] = useState('');

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
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    if (params.tab === 'messages') setCommunityTab('Inbox');
  }, [params.tab]);

  useEffect(() => {
    (async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) setUserData(JSON.parse(userJson));
      } catch {}
      fetchPosts();
    })();
  }, [fetchPosts]);

  useEffect(() => {
    if (communityTab === 'Inbox') fetchConversations('direct');
    if (communityTab === 'Group') fetchConversations('group');
  }, [communityTab, fetchConversations]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const sock = await getCommunitySocket();
        if (!mounted) return;

        sock.on('post:created', (post: any) => {
          setPosts((prev) => {
            const normalized = normalizePosts([post])[0];
            if (prev.some((p) => p.id === normalized.id)) return prev;
            return [normalized, ...prev];
          });
        });
        sock.on('post:deleted', ({ id }: { id: string }) => {
          setPosts((prev) => prev.filter((p) => p.id !== id));
        });
        sock.on('post:liked', (payload: any) => {
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
        });
        sock.on('post:unliked', (payload: any) => {
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
        });
        sock.on('post:commented', (comment: any) => {
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
        });
        sock.on('conversation:updated', () => {
          if (communityTab === 'Inbox') fetchConversations('direct');
          if (communityTab === 'Group') fetchConversations('group');
        });
      } catch (error) {
        console.warn('Community socket unavailable', error);
      }
    })();

    return () => {
      mounted = false;
      // Keep the shared socket alive for CommunityChat; only detach feed listeners.
      getCommunitySocket()
        .then((sock) => {
          sock.off('post:created');
          sock.off('post:deleted');
          sock.off('post:liked');
          sock.off('post:unliked');
          sock.off('post:commented');
          sock.off('conversation:updated');
        })
        .catch(() => undefined);
    };
  }, [communityTab, fetchConversations, userData?.id]);

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

  const handleCreatePost = async () => {
    if (!postDescription.trim()) {
      setStatusModal({
        visible: true,
        type: 'info',
        title: 'Required',
        message: 'Write something to share with the community.',
      });
      return;
    }
    setLoading(true);
    try {
      const post = await authApi.createPost({ description: postDescription.trim() });
      const normalized = normalizePosts([post])[0];
      setPosts((prev) => (prev.some((p) => p.id === normalized.id) ? prev : [normalized, ...prev]));
      setCreateModalVisible(false);
      setPostDescription('');
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Posted',
        message: 'Your update is live in the feed.',
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Failed',
        message: error.message || 'Could not create post',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = (post: Post) => {
    if (post.author?.id !== userData?.id) return;
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.deletePost(post.id);
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
          } catch (error: any) {
            setStatusModal({
              visible: true,
              type: 'error',
              title: 'Delete failed',
              message: error.message || 'Could not delete post',
            });
          }
        },
      },
    ]);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Farming Community</Text>
          <TouchableOpacity
            onPress={() => {
              if (communityTab === 'Group') {
                setNewGroupVisible(true);
                searchUsers('');
              } else {
                setNewChatVisible(true);
                searchUsers('');
              }
            }}
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.communityTabs}>
          {(['Feed', 'Inbox', 'Group'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.communityTab, communityTab === tab && styles.communityTabActive]}
              onPress={() => setCommunityTab(tab)}
            >
              <Text
                style={[
                  styles.communityTabText,
                  communityTab === tab && styles.communityTabTextActive,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {communityTab === 'Feed' && (
        <TouchableOpacity
          style={styles.addPostCard}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.9}
        >
          <Image source={avatar(userData?.profileImage)} style={styles.composerAvatar} />
          <View style={styles.composerPill}>
            <Text style={styles.composerPlaceholder}>Share an update or ask for advice...</Text>
          </View>
          <Ionicons name="create-outline" size={22} color="#166534" />
        </TouchableOpacity>
      )}

      {communityTab === 'Feed' && (
        <ScrollView
          style={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing && posts.length > 0}
              onRefresh={fetchPosts}
              colors={['#166534']}
            />
          }
        >
          {refreshing && posts.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#166534" />
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>No posts yet. Be the first to share!</Text>
            </View>
          ) : (
            posts.map((post) => {
              const liked =
                post.likedByMe ||
                post.likes.some((like) => like.user?.id === userData?.id);
              return (
                <View key={post.id} style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.authorInfo}>
                      <Image
                        source={avatar(post.author?.profileImage)}
                        style={styles.profilePic}
                      />
                      <View>
                        <Text style={styles.authorName}>
                          {post.author?.username || 'Farmer'}
                        </Text>
                        <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
                      </View>
                    </View>
                    {post.author?.id === userData?.id && (
                      <TouchableOpacity onPress={() => handleDeletePost(post)}>
                        <Ionicons name="trash-outline" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.postContent}>{post.description}</Text>

                  <View style={styles.engagementStats}>
                    <Text style={styles.statText}>
                      {post.likeCount ?? post.likes.length} Likes
                    </Text>
                    <Text style={styles.statText}>
                      {post.commentCount ?? post.comments.length} Comments
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleLikePost(post.id)}
                    >
                      <Ionicons
                        name={liked ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={20}
                        color={liked ? '#166534' : '#666'}
                      />
                      <Text style={[styles.actionText, liked && styles.actionTextActive]}>
                        Like
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setSelectedPost(post);
                        setCommentModalVisible(true);
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={20} color="#666" />
                      <Text style={styles.actionText}>Comment</Text>
                    </TouchableOpacity>
                    {post.author?.id && post.author.id !== userData?.id && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openDirectChat(post.author!.id)}
                      >
                        <Ionicons name="paper-plane-outline" size={20} color="#666" />
                        <Text style={styles.actionText}>Message</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {(communityTab === 'Inbox' || communityTab === 'Group') && (
        <ScrollView
          style={styles.postsList}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() =>
                fetchConversations(communityTab === 'Inbox' ? 'direct' : 'group')
              }
              colors={['#166534']}
            />
          }
        >
          <View style={styles.messageList}>
            {conversations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name={communityTab === 'Inbox' ? 'chatbubbles-outline' : 'people-outline'}
                  size={52}
                  color="#ccc"
                />
                <Text style={styles.emptyStateText}>
                  {communityTab === 'Inbox'
                    ? 'No direct chats yet. Tap ✎ to message a farmer.'
                    : 'No groups yet. Tap ✎ to create one.'}
                </Text>
              </View>
            ) : (
              conversations.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.messageItem}
                  onPress={() =>
                    router.push({
                      pathname: '/CommunityChat',
                      params: { id: item.id, name: item.name },
                    })
                  }
                >
                  <Image
                    source={avatar(
                      communityTab === 'Inbox'
                        ? item.otherMembers?.[0]?.profileImage
                        : null,
                    )}
                    style={styles.messageAvatar}
                  />
                  <View style={styles.messageContent}>
                    <Text style={styles.messageName}>{item.name}</Text>
                    <Text style={styles.messagePreview} numberOfLines={1}>
                      {item.lastMessage?.content || 'Say hello to get started'}
                    </Text>
                    {item.lastMessage?.createdAt && (
                      <Text style={styles.messageTime}>{timeAgo(item.lastMessage.createdAt)}</Text>
                    )}
                  </View>
                  {(item.unreadCount || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Create post */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.addPostSubtitleModal}>
                Text-only for now — share advice, harvest updates, or questions.
              </Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Write your post..."
                placeholderTextColor="#999"
                multiline
                value={postDescription}
                onChangeText={setPostDescription}
              />
              <TouchableOpacity
                style={[styles.postBtn, loading && styles.postBtnDisabled]}
                onPress={handleCreatePost}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.postBtnText}>Post</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Comments */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
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
                  <Text style={styles.emptyCommentsText}>No comments yet.</Text>
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
                    <Image source={avatar(u.profileImage)} style={styles.profilePic} />
                    <Text style={styles.authorName}>{u.username}</Text>
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
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: {
    backgroundColor: '#0B4D26',
    paddingBottom: 14,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  communityTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  communityTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  communityTabActive: { backgroundColor: '#fff' },
  communityTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  communityTabTextActive: { color: '#0B4D26' },
  addPostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  composerAvatar: { width: 36, height: 36, borderRadius: 18 },
  composerPill: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  composerPlaceholder: { color: '#6B7280', fontSize: 13 },
  postsList: { flex: 1 },
  postCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profilePic: { width: 36, height: 36, borderRadius: 18 },
  authorName: { fontWeight: '600', fontSize: 14 },
  timeAgo: { color: '#666', fontSize: 12 },
  postContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 14,
    lineHeight: 20,
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
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionText: { color: '#666', fontSize: 14 },
  actionTextActive: { color: '#166534', fontWeight: '700' },
  messageList: { padding: 16, gap: 10 },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  messageAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  messageContent: { flex: 1 },
  messageName: { fontWeight: '600', fontSize: 15, color: '#333', marginBottom: 2 },
  messagePreview: { fontSize: 13, color: '#666', marginBottom: 2 },
  messageTime: { fontSize: 12, color: '#999' },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#166534',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 24 },
  emptyStateText: { marginTop: 10, color: '#999', fontSize: 15, textAlign: 'center', lineHeight: 22 },
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
  descriptionInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  postBtn: {
    backgroundColor: '#166534',
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
    borderColor: '#E5E7EB',
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
});
