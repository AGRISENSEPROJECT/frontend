import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function DemoNavigation() {
    const router = useRouter();

    const demoFeatures = [
        {
            title: '🌱 Camera Soil Analysis',
            description: 'Take a photo of soil and get AI-powered crop recommendations',
            route: '/SoilDetection',
            color: 'bg-blue-600',
            icon: 'camera'
        },
        {
            title: '📊 Sensor Data Input',
            description: 'Enter soil readings manually for detailed analysis',
            route: '/MethodSelection',
            color: 'bg-green-600',
            icon: 'analytics'
        },
        {
            title: '🏠 Farm Dashboard',
            description: 'View farm overview and access all features',
            route: '/(main)/dashboard',
            color: 'bg-purple-600',
            icon: 'home'
        },
        {
            title: '📱 Camera Demo',
            description: 'Test camera functionality directly',
            route: '/(main)/camera',
            color: 'bg-orange-600',
            icon: 'camera-outline'
        }
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5DC]">
            <ScrollView className="flex-1 p-6">
                {/* Header */}
                <View className="items-center mb-8">
                    <Text className="text-3xl font-bold text-[#0B4D26] mb-2">
                        🎯 Demo Mode
                    </Text>
                    <Text className="text-gray-600 text-center text-lg">
                        Skip setup and go directly to the main features
                    </Text>
                </View>

                {/* Demo Features */}
                <View className="space-y-4 mb-8">
                    {demoFeatures.map((feature, index) => (
                        <TouchableOpacity
                            key={index}
                            className={`${feature.color} p-6 rounded-xl shadow-lg`}
                            onPress={() => router.push(feature.route)}
                        >
                            <View className="flex-row items-center">
                                <View className="bg-white/20 p-3 rounded-full mr-4">
                                    <Ionicons name={feature.icon} size={28} color="white" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-white font-bold text-xl mb-1">
                                        {feature.title}
                                    </Text>
                                    <Text className="text-white/90 text-base">
                                        {feature.description}
                                    </Text>
                                </View>
                                <Ionicons name="arrow-forward" size={24} color="white" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Demo Instructions */}
                <View className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <Text className="text-blue-800 font-bold text-lg mb-3">
                        📋 Demo Instructions
                    </Text>
                    <View className="space-y-2">
                        <Text className="text-blue-700 text-sm">
                            • <Text className="font-semibold">Camera Analysis:</Text> Take a photo → Get crop recommendations
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • <Text className="font-semibold">Sensor Data:</Text> Input soil readings → Get detailed analysis
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • <Text className="font-semibold">Both methods</Text> will show realistic crop recommendations
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • <Text className="font-semibold">No backend required</Text> - everything is simulated
                        </Text>
                    </View>
                </View>

                {/* Back to Normal Flow */}
                <View className="mt-8">
                    <TouchableOpacity
                        className="bg-gray-600 py-4 rounded-xl items-center"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white text-lg font-semibold">
                            Back to Normal Flow
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
} 