import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function SoilDetection() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-[#F8F8F0]">
            <View className="flex-1 justify-center p-6">
                {/* Image - hands holding plant (with overlay can be added via image asset) */}
                <View className="w-full aspect-[3/4] mb-5 overflow-hidden rounded-2xl">
                    <Image
                        source={require('../assets/soil-detection-image.png')}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                </View>

                <View className="w-full items-center px-2 mb-5">
                    <Text className="text-2xl font-bold mb-3 text-center text-gray-900">
                        Soil detection
                    </Text>
                    <Text className="text-gray-700 text-base text-center leading-5">
                        Detect soil type, pH, moisture, nutrients, and other properties, to get recommended about what to do.
                    </Text>
                </View>

                <View className="items-center w-full px-4">
                    <TouchableOpacity
                        className="bg-[#34643F] w-full py-3.5 rounded-xl active:opacity-90"
                        onPress={() => router.push('MethodSelection')}
                    >
                        <Text className="text-white text-center text-lg font-semibold">
                            Start now
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
