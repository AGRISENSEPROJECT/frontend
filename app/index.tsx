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

                <TouchableOpacity
                    className="bg-[#0B4D26] px-14 py-3 rounded-xl"
                    onPress={() => router.push('/signin')}
                >
                    <Text className="text-white text-lg font-semibold">
                        Get Started
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
