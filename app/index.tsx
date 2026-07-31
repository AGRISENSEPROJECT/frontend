import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Home() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const userJson = await AsyncStorage.getItem('user');

                if (token && userJson) {
                    const user = JSON.parse(userJson);

                    if (!user.isEmailVerified) {
                        router.replace(`/verifyEmail?email=${encodeURIComponent(user.email)}&userId=${user.id}`);
                    } else {
                        // The dashboard verifies farm ownership against the API
                        // and redirects to farm creation only if truly needed.
                        router.replace('/(main)/dashboard');
                    }
                } else {
                    setChecking(false);
                }
            } catch (error) {
                console.error('Auth check error:', error);
                setChecking(false);
            }
        };

        checkAuth();
    }, []);

    if (checking) {
        return (
            <SafeAreaView className='flex-1 bg-white items-center justify-center'>
                <ActivityIndicator size="large" color="#0B4D26" />
            </SafeAreaView>
        );
    }

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
