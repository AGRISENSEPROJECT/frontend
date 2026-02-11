import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const AVAILABLE_DEVICES = ['BMP280', 'DSR020', 'MP1290', 'MPJ280', 'TCS34725'];

export default function DeviceConnection() {
    const router = useRouter();

    const handleStartSensor = () => {
        router.push('/ResultsPage');
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8F8F0]">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
                <View className="flex-row items-center justify-between mb-4">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900">Device connection</Text>
                    <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                        <Ionicons name="person" size={20} color="#666" />
                    </View>
                </View>

                <View className="rounded-xl overflow-hidden mb-6">
                    <Image
                        source={require('../assets/device.png')}
                        className="w-full h-40"
                        resizeMode="cover"
                    />
                </View>

                <View className="mb-5">
                    <Text className="text-base font-semibold text-gray-900 mb-2">Paired Devices</Text>
                    <View className="flex-row items-center gap-2">
                        <View className="w-2 h-2 rounded-full bg-[#22C55E]" />
                        <Text className="text-gray-700">BMP280</Text>
                        <Text className="text-[#22C55E] text-sm">connected</Text>
                    </View>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold text-gray-900 mb-3">Available Devices</Text>
                    {AVAILABLE_DEVICES.map((device, index) => (
                        <View
                            key={`${device}-${index}`}
                            className="flex-row justify-between items-center py-3 border-b border-gray-200"
                        >
                            <Text className="text-gray-800">{device}</Text>
                            <TouchableOpacity>
                                <Text className="text-gray-500 text-sm">connect</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>

                <TouchableOpacity
                    className="bg-[#34643F] py-3.5 rounded-xl items-center active:opacity-90"
                    onPress={handleStartSensor}
                >
                    <Text className="text-white text-lg font-semibold">Start sensor</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
