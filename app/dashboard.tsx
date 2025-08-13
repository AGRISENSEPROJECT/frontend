import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DashboardSidebar from './components/DashboardSidebar';

export default function Dashboard() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <SafeAreaView className="flex-1 bg-[#FAF9F6]">
            {/* Header */}
            <View className="bg-green-800 py-10 px-4">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity onPress={toggleSidebar}>
                        <Ionicons name="menu-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">AgriSense Dashboard</Text>
                    <TouchableOpacity>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <ScrollView className="flex-1 p-4">
                {/* Welcome Section */}
                <View className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
                    <Text className="text-2xl font-bold text-[#0B4D26] mb-2">
                        Welcome back! 👋
                    </Text>
                    <Text className="text-gray-600 mb-4">
                        Ready to analyze your soil and get crop recommendations?
                    </Text>
                    
                    <View className="flex-row space-x-3">
                        <TouchableOpacity
                            className="flex-1 bg-blue-600 p-4 rounded-lg items-center"
                            onPress={() => router.push('/SoilDetection')}
                        >
                            <Ionicons name="camera" size={24} color="white" />
                            <Text className="text-white font-semibold mt-2">Scan Soil</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="flex-1 bg-green-600 p-4 rounded-lg items-center"
                            onPress={() => router.push('/components/EnhancedDataEntryForm')}
                        >
                            <Ionicons name="analytics" size={24} color="white" />
                            <Text className="text-white font-semibold mt-2">Input Data</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Quick Actions */}
                <View className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
                    <Text className="text-xl font-bold text-gray-800 mb-4">Quick Actions</Text>
                    <View className="grid grid-cols-2 gap-4">
                        <TouchableOpacity
                            className="bg-purple-100 p-4 rounded-lg items-center"
                            onPress={() => router.push('/create-farm')}
                        >
                            <Ionicons name="leaf" size={32} color="#0B4D26" />
                            <Text className="text-[#0B4D26] font-semibold mt-2">Create Farm</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="bg-yellow-100 p-4 rounded-lg items-center"
                            onPress={() => router.push('/weather')}
                        >
                            <Ionicons name="partly-sunny" size={32} color="#F59E0B" />
                            <Text className="text-[#F59E0B] font-semibold mt-2">Weather</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="bg-blue-100 p-4 rounded-lg items-center"
                            onPress={() => router.push('/CropRecommendation')}
                        >
                            <Ionicons name="bulb" size={32} color="#2563EB" />
                            <Text className="text-[#2563EB] font-semibold mt-2">Recommendations</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            className="bg-green-100 p-4 rounded-lg items-center"
                            onPress={() => router.push('/community')}
                        >
                            <Ionicons name="people" size={32} color="#059669" />
                            <Text className="text-[#059669] font-semibold mt-2">Community</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Activity */}
                <View className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6">
                    <Text className="text-xl font-bold text-gray-800 mb-4">Recent Activity</Text>
                    <View className="space-y-3">
                        <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                            <Ionicons name="camera" size={20} color="#0B4D26" />
                            <Text className="text-gray-700 ml-3">Soil analysis completed</Text>
                            <Text className="text-gray-500 text-sm ml-auto">2h ago</Text>
                        </View>
                        <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                            <Ionicons name="leaf" size={20} color="#0B4D26" />
                            <Text className="text-gray-700 ml-3">Crop recommendations generated</Text>
                            <Text className="text-gray-500 text-sm ml-auto">1d ago</Text>
                        </View>
                        <View className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                            <Ionicons name="partly-sunny" size={20} color="#0B4D26" />
                            <Text className="text-gray-700 ml-3">Weather alert: Rain expected</Text>
                            <Text className="text-gray-500 text-sm ml-auto">3d ago</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Sidebar */}
            <DashboardSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        </SafeAreaView>
    );
} 