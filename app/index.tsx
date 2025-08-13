import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function Home() {
    const router = useRouter();

    return (
        <SafeAreaView className='w-screen h-screen bg-white'>
            <View className="flex-1 items-center justify-center p-4">
                <Image
                    source={require('../assets/icon.png')}
                    className="w-40 h-40 mb-8"
                    resizeMode="contain"
                />

                <Text className="text-3xl font-bold text-[#0B4D26] mb-2 text-center">
                    AgriSense
                </Text>
                
                <Text className="text-gray-600 text-lg mb-8 text-center px-4">
                    Smart farming solutions for better crop yields and soil health
                </Text>

                <View className="w-full space-y-4">
                    <TouchableOpacity
                        className="bg-[#0B4D26] py-4 rounded-xl items-center"
                        onPress={() => router.push('/signin')}
                    >
                        <Text className="text-white text-lg font-semibold">
                            Sign In
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white border-2 border-[#0B4D26] py-4 rounded-xl items-center"
                        onPress={() => router.push('/signup')}
                    >
                        <Text className="text-[#0B4D26] text-lg font-semibold">
                            Create Account
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-gray-100 py-3 rounded-xl items-center"
                        onPress={() => router.push('/SoilDetection')}
                    >
                        <Text className="text-gray-600 text-base">
                            Explore Soil Analysis
                        </Text>
                    </TouchableOpacity>
                </View>

                <View className="mt-8 px-6">
                    <Text className="text-gray-500 text-sm text-center leading-5">
                        🌱 Camera-based soil analysis{'\n'}
                        📊 Sensor data integration{'\n'}
                        🎯 AI-powered crop recommendations{'\n'}
                        📱 Farm management tools
                    </Text>
                </View>
            </View>
        </SafeAreaView>
    );
}
