import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '@/config/env';
import { authApi } from '@/services/api';
import { isFarmerRole } from '@/utils/userDisplay';

const API_URL_KEY = 'api_url_bound';

async function clearSession() {
  await AsyncStorage.multiRemove([
    'token',
    'refreshToken',
    'user',
    'skipFarm',
    'preferredFarmId',
  ]);
}

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentApi = ENV.API_URL || '';
        const boundApi = await AsyncStorage.getItem(API_URL_KEY);

        // Frontend bug: tokens from another API host were trusted blindly.
        // If the API URL changed, wipe the stale session.
        if (boundApi && currentApi && boundApi !== currentApi) {
          await clearSession();
          await AsyncStorage.setItem(API_URL_KEY, currentApi);
          setChecking(false);
          return;
        }

        if (currentApi && !boundApi) {
          await AsyncStorage.setItem(API_URL_KEY, currentApi);
        }

        const token = await AsyncStorage.getItem('token');
        const userJson = await AsyncStorage.getItem('user');

        if (!token || !userJson) {
          setChecking(false);
          return;
        }

        const user = JSON.parse(userJson);

        // Validate the stored token against the *current* API before auto-routing.
        try {
          const profile = await authApi.getProfile(token);
          const freshUser = profile?.user || user;

          // Mobile app is farmers-only — drop non-farmer sessions.
          if (!isFarmerRole(freshUser.role)) {
            await clearSession();
            setChecking(false);
            return;
          }

          if (profile?.user) {
            await AsyncStorage.setItem('user', JSON.stringify(profile.user));
            await AsyncStorage.setItem(API_URL_KEY, currentApi);
          }

          if (freshUser.isEmailVerified === false) {
            router.replace(
              `/verifyEmail?email=${encodeURIComponent(freshUser.email || '')}&userId=${freshUser.id || ''}`,
            );
            return;
          }

          router.replace('/(main)/dashboard');
        } catch {
          // Token invalid for this server — force a fresh login.
          await clearSession();
          setChecking(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#0B4D26" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="w-screen h-screen bg-white">
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
          <Text className="text-white text-lg font-semibold">Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
