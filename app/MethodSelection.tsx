import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MethodSelection() {
    const router = useRouter();
    const [isSensorEnabled, setIsSensorEnabled] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(false);

    const toggleSensorSwitch = () => {
        if (!isSensorEnabled) {
            setIsSensorEnabled(true);
            setIsCameraEnabled(false);
        }
    };

    const toggleCameraSwitch = () => {
        if (!isCameraEnabled) {
            setIsCameraEnabled(true);
            setIsSensorEnabled(false);
            // Automatically navigate to camera page when camera toggle is activated
            router.push('/(main)/camera');
        }
    };

    const handleNext = () => {
        if (isSensorEnabled) {
            router.push('/DeviceConnection');
        } else {
            // Handle other navigation if needed
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8F8F0]">
            <View className="flex-1 px-5 pt-2 pb-6">
                <View className="flex-row items-center justify-between mb-2">
                    <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-gray-900">Method</Text>
                    <View className="w-10" />
                </View>

                <Text className="text-base mb-6 text-gray-700 leading-5">
                    If you need a quick analysis, go with Camera. For detailed and real-time monitoring, use Sensor.
                </Text>

                <View className="bg-white p-5 mb-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <Text className="font-bold text-gray-900 text-base">Sensor</Text>
                        <Switch
                            trackColor={{ false: '#767577', true: '#34643F' }}
                            thumbColor={isSensorEnabled ? '#fff' : '#f4f3f4'}
                            onValueChange={toggleSensorSwitch}
                            value={isSensorEnabled}
                        />
                    </View>
                    {isSensorEnabled && (
                        <Text className="mt-3 text-gray-600 text-sm">
                            Use a connected soil sensor to get real-time data on moisture, nutrients, and pH levels.
                        </Text>
                    )}
                </View>

                <View className="bg-white p-5 mb-4 rounded-xl border border-gray-200/80 shadow-sm">
                    <View className="flex-row justify-between items-center">
                        <Text className="font-bold text-gray-900 text-base">Camera</Text>
                        <Switch
                            trackColor={{ false: '#767577', true: '#34643F' }}
                            thumbColor={isCameraEnabled ? '#fff' : '#f4f3f4'}
                            onValueChange={toggleCameraSwitch}
                            value={isCameraEnabled}
                        />
                    </View>
                    {isCameraEnabled && (
                        <Text className="mt-3 text-gray-600 text-sm">
                            Capture an image of your soil, and our AI will analyze its texture, color, and possible issues.
                        </Text>
                    )}
                </View>

                <TouchableOpacity
                    className="bg-[#34643F] py-3.5 rounded-xl items-center mt-auto"
                    onPress={handleNext}
                    activeOpacity={0.9}
                >
                    <Text className="text-white text-lg font-semibold">Next</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
