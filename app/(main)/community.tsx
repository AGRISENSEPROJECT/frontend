import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, StyleSheet, Modal, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSidebar } from '../../context/SidebarContext';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';

interface Post {
    id: string;
    description: string;
    imageUrl?: string;
    author: {
        id: string;
        username: string;
        profileImage?: string;
    };
    likes: string[];
    comments: any[];
    createdAt: string;
}

export default function Community() {
    const router = useRouter();
    const { toggleSidebar } = useSidebar();
    const [loading, setLoading] = useState(false);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [commentModalVisible, setCommentModalVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [postDescription, setPostDescription] = useState('');
    const [postImage, setPostImage] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });

    const [posts, setPosts] = useState<Post[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [communityTab, setCommunityTab] = useState<'Feed' | 'Inbox' | 'Group'>('Feed');
    const params = useLocalSearchParams<{ tab?: string }>();

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

    useEffect(() => {
        if (params.tab === 'messages') setCommunityTab('Inbox');
    }, [params.tab]);

    useEffect(() => {
        loadUserData();
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setRefreshing(true);
        try {
            const data = await authApi.getPosts();
            setPosts(data);
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const loadUserData = async () => {
        try {
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                setUserData(JSON.parse(userJson));
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    const handleLikePost = async (postId: string) => {
        try {
            await authApi.likePost(postId);
            // Optimistically update or just refresh
            fetchPosts();
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleCommentPost = async () => {
        if (!selectedPost || !commentContent.trim()) return;

        setLoading(true);
        try {
            await authApi.commentPost(selectedPost.id, commentContent);
            setCommentContent('');
            // Refresh posts to show new comment
            await fetchPosts();
            // Update selected post to show new comment in modal
            const updatedPost = posts.find(p => p.id === selectedPost.id);
            if (updatedPost) setSelectedPost(updatedPost);
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

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets[0].uri) {
            setPostImage(result.assets[0].uri);
        }
    };

    const handleCreatePost = async () => {
        if (!postDescription.trim()) {
            setStatusModal({
                visible: true,
                type: 'info',
                title: 'Required',
                message: 'Please enter a description for your post.',
            });
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            let imageUrl = '';
            if (postImage) {
                // If you have an image upload endpoint that returns a URL
                // For now, let's assume we just send the description
                // or you might need to upload the image first
                const uploadResult = await authApi.uploadProfileImage(postImage, token);
                imageUrl = uploadResult.profileImage;
            }

            await authApi.createPost({
                description: postDescription,
                imageUrl: imageUrl || undefined
            });

            setStatusModal({
                visible: true,
                type: 'success',
                title: 'Success',
                message: 'Post created successfully!',
            });

            setCreateModalVisible(false);
            setPostDescription('');
            setPostImage(null);
            fetchPosts(); // Refresh the feed
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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={toggleSidebar}>
                        <Ionicons name="menu" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Farming Community</Text>
                    <TouchableOpacity>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={18} color="#0B4D26" />
                        <TextInput
                            placeholder="Search the community.."
                            style={styles.searchInput}
                            placeholderTextColor="#4B5563"
                        />
                    </View>
                </View>

                {/* Tabs: Feed | Inbox | Group */}
                <View style={styles.communityTabs}>
                    {(['Feed', 'Inbox', 'Group'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.communityTab, communityTab === tab && styles.communityTabActive]}
                            onPress={() => setCommunityTab(tab)}
                        >
                            <Text style={[styles.communityTabText, communityTab === tab && styles.communityTabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Composer - only on Feed */}
            {communityTab === 'Feed' && (
            <TouchableOpacity
                style={styles.addPostCard}
                onPress={() => setCreateModalVisible(true)}
                activeOpacity={0.9}
            >
                <Image
                    source={userData?.profileImage ? { uri: userData.profileImage } : require('../../assets/profile-pic.png')}
                    style={styles.composerAvatar}
                />
                <View style={styles.composerPill}>
                    <Text style={styles.composerPlaceholder}>Share an update or ask for advice...</Text>
                </View>
                <Ionicons name="image-outline" size={22} color="#166534" />
            </TouchableOpacity>
            )}

            {/* Content by tab */}
            {communityTab === 'Feed' && (
            <ScrollView
                style={styles.postsList}
                refreshControl={
                    <RefreshControl refreshing={refreshing && posts.length > 0} onRefresh={fetchPosts} colors={['#166534']} />
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
                ) : posts.map((post) => (
                    <View key={post.id} style={styles.postCard}>
                        {/* Post Header */}
                        <View style={styles.postHeader}>
                            <View style={styles.authorInfo}>
                                <Image
                                    source={post.author.profileImage ? { uri: post.author.profileImage } : require('../../assets/profile-pic.png')}
                                    style={styles.profilePic}
                                />
                                <View>
                                    <Text style={styles.authorName}>{post.author.username}</Text>
                                    <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
                                </View>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Post Content */}
                        <Text style={styles.postContent}>{post.description}</Text>

                        {/* Post Image */}
                        {post.imageUrl && (
                            <Image
                                source={{ uri: post.imageUrl }}
                                style={styles.postImage}
                            />
                        )}

                        {/* Engagement Stats */}
                        <View style={styles.engagementStats}>
                            <Text style={styles.statText}>{post.likes.length} Likes</Text>
                            <View style={styles.rightStats}>
                                <Text style={styles.statText}>{post.comments.length} Comments</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={styles.actionButton}
                                onPress={() => handleLikePost(post.id)}
                            >
                                <Ionicons 
                                    name={post.likes.some(like => (like as any).user?.id === userData?.id) ? "thumbs-up" : "thumbs-up-outline"} 
                                    size={20} 
                                    color={post.likes.some(like => (like as any).user?.id === userData?.id) ? "#166534" : "#666"} 
                                />
                                <Text style={[
                                    styles.actionText,
                                    post.likes.some(like => (like as any).user?.id === userData?.id) && { color: "#166534", fontWeight: 'bold' }
                                ]}>Like</Text>
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
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="share-social-outline" size={20} color="#666" />
                                <Text style={styles.actionText}>Share</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>
            )}

            {communityTab === 'Inbox' && (
                <ScrollView style={styles.postsList}>
                    <View style={styles.messageList}>
                        {['Crams Farmers', 'Chance Regine', 'Farm Co-op'].map((name, i) => (
                            <TouchableOpacity key={i} style={styles.messageItem} onPress={() => router.push({ pathname: '/CommunityChat', params: { name } })}>
                                <Image source={require('../../assets/profile-pic.png')} style={styles.messageAvatar} />
                                <View style={styles.messageContent}>
                                    <Text style={styles.messageName}>{name}</Text>
                                    <Text style={styles.messagePreview} numberOfLines={1}>Hey, I've been noticing some yellowing on my maize leaves lately. Any idea what might...</Text>
                                    <Text style={styles.messageTime}>{i === 0 ? '9:00 am' : i === 1 ? '2 min' : 'Yesterday'}</Text>
                                </View>
                                {i === 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>1</Text></View>}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {communityTab === 'Group' && (
                <ScrollView style={styles.postsList}>
                    <View style={styles.messageList}>
                        {['Crams Farmers', 'East Region Growers', 'Seed Exchange'].map((name, i) => (
                            <TouchableOpacity key={i} style={styles.messageItem} onPress={() => router.push({ pathname: '/CommunityChat', params: { name } })}>
                                <Image source={require('../../assets/profile-pic.png')} style={styles.messageAvatar} />
                                <View style={styles.messageContent}>
                                    <Text style={styles.messageName}>{name}</Text>
                                    <Text style={styles.messagePreview} numberOfLines={1}>Hey, I've been noticing some yellowing on my maize leaves lately. Any idea what might...</Text>
                                    <Text style={styles.messageTime}>{i === 0 ? '9:00 am' : '2 min'}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* Create Post Modal */}
            <Modal
                visible={createModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Post</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.addPostSubtitleModal}>Share updates or seek advice from the farming community.</Text>
                            <Text style={styles.inputLabel}>Your message</Text>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Write your post..."
                                placeholderTextColor="#999"
                                multiline
                                value={postDescription}
                                onChangeText={setPostDescription}
                            />
                            <Text style={styles.inputLabel}>Upload Image (Optional)</Text>
                            <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImage}>
                                <Ionicons name="document-attach-outline" size={22} color="#166534" />
                                <Text style={styles.addImageText}>Choose File</Text>
                            </TouchableOpacity>
                            <Text style={styles.fileChosenText}>{postImage ? '1 File Chosen' : 'No File Chosen'}</Text>
                            <TouchableOpacity
                                style={[styles.postBtn, loading && styles.postBtnDisabled]}
                                onPress={handleCreatePost}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Post</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.backToCommunity}>
                                <Text style={styles.backToCommunityText}>Back To Community</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Comment Modal */}
            <Modal
                visible={commentModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCommentModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Comments</Text>
                            <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalBody}>
                            {selectedPost?.comments?.length ? selectedPost.comments.map((c: any, i: number) => (
                                <View key={i} style={styles.commentItem}>
                                    <Image source={c.user?.profileImage ? { uri: c.user.profileImage } : require('../../assets/profile-pic.png')} style={styles.commentProfilePic} />
                                    <View style={styles.commentContentContainer}>
                                        <Text style={styles.commentAuthor}>{c.user?.username}</Text>
                                        <Text style={styles.commentText}>{c.content}</Text>
                                    </View>
                                </View>
                            )) : (
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
                            <TouchableOpacity onPress={handleCommentPost} disabled={loading || !commentContent.trim()}>
                                <Ionicons name="send" size={22} color={commentContent.trim() ? '#166534' : '#ccc'} />
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
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6'
    },
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
        paddingVertical: 14
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff'
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 4
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        gap: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        padding: 0
    },
    communityTabs: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 8,
    },
    communityTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)'
    },
    communityTabActive: {
        backgroundColor: '#fff'
    },
    communityTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.85)'
    },
    communityTabTextActive: {
        color: '#0B4D26'
    },
    messageList: {
        padding: 16,
        gap: 10
    },
    messageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
    },
    messageAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12
    },
    messageContent: {
        flex: 1
    },
    messageName: {
        fontWeight: '600',
        fontSize: 15,
        color: '#333',
        marginBottom: 2
    },
    messagePreview: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2
    },
    messageTime: {
        fontSize: 12,
        color: '#999'
    },
    unreadBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#166534',
        alignItems: 'center',
        justifyContent: 'center'
    },
    unreadBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600'
    },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    composerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18
    },
    composerPill: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingVertical: 9,
        paddingHorizontal: 14
    },
    composerPlaceholder: {
        color: '#6B7280',
        fontSize: 13
    },
    addPostSubtitleModal: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8
    },
    fileChosenText: {
        fontSize: 13,
        color: '#666',
        marginTop: 4,
        marginBottom: 20
    },
    backToCommunity: {
        alignSelf: 'center',
        marginTop: 8,
        marginBottom: 24
    },
    backToCommunityText: {
        fontSize: 14,
        color: '#166534',
        fontWeight: '600'
    },
    postsList: {
        flex: 1
    },
    postCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    profilePic: {
        width: 36,
        height: 36,
        borderRadius: 18
    },
    authorName: {
        fontWeight: '600',
        fontSize: 14
    },
    timeAgo: {
        color: '#666',
        fontSize: 12
    },
    postContent: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        fontSize: 14,
        lineHeight: 20
    },
    postImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover'
    },
    engagementStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    rightStats: {
        flexDirection: 'row',
        gap: 16
    },
    statText: {
        color: '#666',
        fontSize: 13
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    actionText: {
        color: '#666',
        fontSize: 14
    },
    createPostQuick: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        marginBottom: 8,
        gap: 12
    },
    quickProfilePic: {
        width: 40,
        height: 40,
        borderRadius: 20
    },
    quickInput: {
        flex: 1,
        height: 40,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        justifyContent: 'center',
        paddingHorizontal: 16
    },
    quickInputText: {
        color: '#666',
        fontSize: 14
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '90%',
        paddingBottom: 20
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    postBtn: {
        backgroundColor: '#166534',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20
    },
    postBtnDisabled: {
        opacity: 0.5
    },
    postBtnText: {
        color: 'white',
        fontWeight: 'bold'
    },
    modalBody: {
        padding: 16
    },
    modalUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20
    },
    modalProfilePic: {
        width: 45,
        height: 45,
        borderRadius: 22.5
    },
    modalUsername: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    descriptionInput: {
        fontSize: 18,
        color: '#333',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 20
    },
    selectedImageContainer: {
        position: 'relative',
        marginBottom: 20
    },
    selectedImage: {
        width: '100%',
        height: 250,
        borderRadius: 12
    },
    removeImageBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 12
    },
    addImageBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        borderStyle: 'dashed'
    },
    addImageText: {
        color: '#166534',
        fontWeight: '600'
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100
    },
    emptyStateText: {
        marginTop: 10,
        color: '#999',
        fontSize: 16
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 10
    },
    commentProfilePic: {
        width: 32,
        height: 32,
        borderRadius: 16
    },
    commentContentContainer: {
        flex: 1
    },
    commentBubble: {
        backgroundColor: '#f0f2f5',
        padding: 10,
        borderRadius: 15,
        flex: 1
    },
    commentAuthor: {
        fontWeight: 'bold',
        fontSize: 13,
        marginBottom: 2
    },
    commentText: {
        fontSize: 14,
        color: '#333'
    },
    commentTime: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
        marginLeft: 5
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        gap: 10
    },
    commentInput: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        maxHeight: 100
    },
    emptyComments: {
        alignItems: 'center',
        paddingVertical: 40
    },
    emptyCommentsText: {
        color: '#999',
        fontSize: 14
    }
});
