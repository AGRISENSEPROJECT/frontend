import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSidebar } from '../context/SidebarContext';

interface Post {
    id: string;
    author: string;
    timeAgo: string;
    content: string;
    image: any;
    comments: number;
    shares: number;
    likes: number;
}

export default function Community() {
    const { toggleSidebar } = useSidebar();
    const [refreshing, setRefreshing] = useState(false);
    const [posts, setPosts] = useState([
        {
            id: '1',
            author: 'Kayitare Andrew',
            timeAgo: '1 hour',
            content: 'Attention farmers! ⚠️ My crops were recently affected by [pest name]. It caused [specific damage], like [effects on crops]. Be vigilant and take preventive measures like [solution/treatment]. Let\'s share tips to fight this together 💪🌱',
            image: require('../../assets/crop-image.png'),
            comments: 128,
            shares: 64,
            likes: 480
        },
        {
            id: '2',
            author: 'Kayitare Andrew',
            timeAgo: '1 hour',
            content: 'Attention farmers! ⚠️ My crops were recently affected by [pest name]. It caused [specific damage], like [effects on crops]. Be vigilant and take preventive measures like [solution/treatment]. Let\'s share tips to fight this together 💪🌱',
            image: require('../../assets/crop-image.png'),
            comments: 128,
            shares: 64,
            likes: 480
        },
        // Add more posts for scrolling
        {
            id: '3',
            author: 'Kayitare Andrew',
            timeAgo: '2 hours',
            content: 'Attention farmers! ⚠️ My crops were recently affected by [pest name]. It caused [specific damage], like [effects on crops]. Be vigilant and take preventive measures like [solution/treatment]. Let\'s share tips to fight this together 💪🌱',
            image: require('../../assets/crop-image.png'),
            comments: 128,
            shares: 64,
            likes: 480
        },
        {
            id: '4',
            author: 'Kayitare Andrew',
            timeAgo: '3 hours',
            content: 'Attention farmers! ⚠️ My crops were recently affected by [pest name]. It caused [specific damage], like [effects on crops]. Be vigilant and take preventive measures like [solution/treatment]. Let\'s share tips to fight this together 💪🌱',
            image: require('../../assets/crop-image.png'),
            comments: 128,
            shares: 64,
            likes: 480
        }
    ]);

    const onRefresh = () => {
        setRefreshing(true);
        // Simulate fetching new data
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={toggleSidebar}>
                        <Ionicons name="menu" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Farming Community</Text>
                    <TouchableOpacity>
                        <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <TextInput
                            placeholder="Search.."
                            style={styles.searchInput}
                            placeholderTextColor="#666"
                        />
                        <TouchableOpacity>
                            <Ionicons name="search" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Posts List */}
            <ScrollView style={styles.postsList}>
                {posts.map((post) => (
                    <View key={post.id} style={styles.postCard}>
                        {/* Post Header */}
                        <View style={styles.postHeader}>
                            <View style={styles.authorInfo}>
                                <Image
                                    source={require('../../assets/profile-pic.png')}
                                    style={styles.profilePic}
                                />
                                <View>
                                    <Text style={styles.authorName}>{post.author}</Text>
                                    <Text style={styles.timeAgo}>{post.timeAgo}</Text>
                                </View>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Post Content */}
                        <Text style={styles.postContent}>{post.content}</Text>

                        {/* Post Image */}
                        <Image
                            source={post.image}
                            style={styles.postImage}
                        />

                        {/* Engagement Stats */}
                        <View style={styles.engagementStats}>
                            <Text style={styles.statText}>{post.likes} Likes</Text>
                            <View style={styles.rightStats}>
                                <Text style={styles.statText}>{post.comments} Comments</Text>
                                <Text style={styles.statText}>{post.shares} Shares</Text>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.actionButton}>
                                <Ionicons name="thumbs-up-outline" size={20} color="#666" />
                                <Text style={styles.actionText}>Like</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5'
    },
    header: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e5e5'
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#166534'
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333'
    },
    postsList: {
        flex: 1
    },
    postCard: {
        backgroundColor: 'white',
        marginBottom: 8
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
        width: 32,
        height: 32,
        borderRadius: 16
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
    }
});
