import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DashboardSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
    const router = useRouter();

    const menuItems = [
        {
            title: 'Dashboard',
            icon: 'home-outline',
            route: '/dashboard',
            color: 'text-blue-600'
        },
        {
            title: 'Create Farm',
            icon: 'leaf-outline',
            route: '/create-farm',
            color: 'text-green-600'
        },
        {
            title: 'Get Recommendations',
            icon: 'bulb-outline',
            route: '/SoilDetection',
            color: 'text-purple-600'
        },
        {
            title: 'Weather',
            icon: 'partly-sunny-outline',
            route: '/weather',
            color: 'text-yellow-600'
        },
        {
            title: 'Analytics',
            icon: 'analytics-outline',
            route: '/analytics',
            color: 'text-indigo-600'
        },
        {
            title: 'Community',
            icon: 'people-outline',
            route: '/community',
            color: 'text-pink-600'
        },
        {
            title: 'Settings',
            icon: 'settings-outline',
            route: '/settings',
            color: 'text-gray-600'
        }
    ];

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('isLoggedIn');
            router.replace('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const handleNavigation = (route: string) => {
        router.push(route);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <View className="absolute inset-0 z-50">
            {/* Backdrop */}
            <TouchableOpacity
                className="flex-1 bg-black/50"
                onPress={onClose}
                activeOpacity={1}
            />
            
            {/* Sidebar */}
            <View className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-2xl">
                <ScrollView className="flex-1">
                    {/* Header */}
                    <View className="bg-[#0B4D26] p-6">
                        <View className="flex-row items-center justify-between mb-4">
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="white" />
                            </TouchableOpacity>
                            <Text className="text-white text-lg font-semibold">Menu</Text>
                            <View className="w-6" />
                        </View>
                        
                        <View className="items-center">
                            <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
                                <Ionicons name="person" size={32} color="white" />
                            </View>
                            <Text className="text-white font-semibold text-lg">Farmer User</Text>
                            <Text className="text-white/80 text-sm">Premium Member</Text>
                        </View>
                    </View>

                    {/* Menu Items */}
                    <View className="p-4">
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                className="flex-row items-center p-4 rounded-lg mb-2 hover:bg-gray-50"
                                onPress={() => handleNavigation(item.route)}
                            >
                                <View className={`w-10 h-10 rounded-lg items-center justify-center mr-4 bg-gray-100`}>
                                    <Ionicons name={item.icon} size={20} className={item.color} />
                                </View>
                                <Text className="text-gray-800 font-medium text-base flex-1">
                                    {item.title}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Divider */}
                    <View className="mx-4 h-px bg-gray-200" />

                    {/* Quick Actions */}
                    <View className="p-4">
                        <Text className="text-gray-500 font-medium mb-3">Quick Actions</Text>
                        
                        <TouchableOpacity
                            className="flex-row items-center p-3 rounded-lg bg-green-50 mb-2"
                            onPress={() => handleNavigation('/SoilDetection')}
                        >
                            <Ionicons name="camera" size={20} color="#0B4D26" />
                            <Text className="text-[#0B4D26] font-medium ml-3">Scan Soil</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-row items-center p-3 rounded-lg bg-blue-50 mb-2"
                            onPress={() => handleNavigation('/components/EnhancedDataEntryForm')}
                        >
                            <Ionicons name="analytics" size={20} color="#2563EB" />
                            <Text className="text-blue-700 font-medium ml-3">Input Data</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Divider */}
                    <View className="mx-4 h-px bg-gray-200" />

                    {/* Logout */}
                    <View className="p-4">
                        <TouchableOpacity
                            className="flex-row items-center p-4 rounded-lg bg-red-50"
                            onPress={handleLogout}
                        >
                            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                            <Text className="text-red-600 font-medium ml-3">Logout</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
} 