import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Community() {
    const router = useRouter();

    const communityPosts = [
        {
            id: 1,
            user: 'John Farmer',
            avatar: '👨‍🌾',
            content: 'Just got amazing crop recommendations from AgriSense! My maize yield improved by 30% this season.',
            time: '2 hours ago',
            likes: 12,
            comments: 5
        },
        {
            id: 2,
            user: 'Sarah Agronomist',
            avatar: '👩‍🌾',
            content: 'The soil analysis feature is incredible. Helped me identify nutrient deficiencies I never knew existed.',
            time: '5 hours ago',
            likes: 8,
            comments: 3
        },
        {
            id: 3,
            user: 'Mike Organic',
            avatar: '🧑‍🌾',
            content: 'Weather integration is spot on! Perfect timing for my organic vegetable planting.',
            time: '1 day ago',
            likes: 15,
            comments: 7
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#FAF9F6]">
            {/* Header */}
            <View className="bg-green-600 py-10 px-4">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Community</Text>
                    <TouchableOpacity>
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Community Stats */}
                <View className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <Text className="text-xl font-bold text-gray-800 mb-4">Community Overview</Text>
                    <View className="flex-row justify-around">
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-[#0B4D26]">1,247</Text>
                            <Text className="text-gray-600">Farmers</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-[#0B4D26]">89</Text>
                            <Text className="text-gray-600">Posts Today</Text>
                        </View>
                        <View className="items-center">
                            <Text className="text-2xl font-bold text-[#0B4D26]">156</Text>
                            <Text className="text-gray-600">Active Now</Text>
                        </View>
                    </View>
                </View>

                {/* Community Posts */}
                <View className="space-y-4">
                    {communityPosts.map((post) => (
                        <View key={post.id} className="bg-white p-6 rounded-xl shadow-lg">
                            <View className="flex-row items-center mb-3">
                                <Text className="text-2xl mr-3">{post.avatar}</Text>
                                <View className="flex-1">
                                    <Text className="font-semibold text-gray-800">{post.user}</Text>
                                    <Text className="text-gray-500 text-sm">{post.time}</Text>
                                </View>
                            </View>
                            <Text className="text-gray-700 mb-4 leading-5">{post.content}</Text>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center space-x-4">
                                    <TouchableOpacity className="flex-row items-center">
                                        <Ionicons name="heart-outline" size={20} color="#EF4444" />
                                        <Text className="text-gray-600 ml-1">{post.likes}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity className="flex-row items-center">
                                        <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                                        <Text className="text-gray-600 ml-1">{post.comments}</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="share-outline" size={20} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Join Discussion */}
                <View className="bg-blue-50 p-6 rounded-xl border border-blue-200 mt-6">
                    <Text className="text-blue-800 font-bold text-lg mb-3">💬 Join the Discussion</Text>
                    <Text className="text-blue-700 text-sm mb-4">
                        Share your farming experiences, ask questions, and connect with other farmers in the community.
                    </Text>
                    <TouchableOpacity className="bg-blue-600 py-3 rounded-lg items-center">
                        <Text className="text-white font-semibold">Start a Post</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
} 