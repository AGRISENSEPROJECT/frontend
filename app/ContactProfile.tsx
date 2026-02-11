import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ContactProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const contactName = (params.name as string) || 'Chance Regine';
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Dark green header: back, Edit contact */}
      <View className="bg-[#166534] pb-3 px-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-white font-semibold">Edit contact</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: bottomPadding + 24 }}>
        <View className="items-center pt-8 pb-6">
          <Image source={require('../assets/profile-pic.png')} className="w-28 h-28 rounded-full" />
          <View className="flex-row gap-4 mt-6">
            <TouchableOpacity className="items-center bg-gray-100 rounded-xl py-3 px-5 shadow-sm">
              <Ionicons name="chatbubble-outline" size={24} color="#166534" />
              <Text className="text-gray-800 font-medium text-sm mt-1">Message</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center bg-gray-100 rounded-xl py-3 px-5 shadow-sm">
              <Ionicons name="call-outline" size={24} color="#166534" />
              <Text className="text-gray-800 font-medium text-sm mt-1">Call</Text>
            </TouchableOpacity>
            <TouchableOpacity className="items-center bg-gray-100 rounded-xl py-3 px-5 shadow-sm">
              <Ionicons name="videocam-outline" size={24} color="#166534" />
              <Text className="text-gray-800 font-medium text-sm mt-1">video call</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 gap-3">
          <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <View>
              <Text className="text-gray-500 text-xs">Mobile | Nigeria</Text>
              <Text className="text-gray-900 font-medium">+250 798-829-201</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="call" size={20} color="#166534" />
            </TouchableOpacity>
          </View>
          <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <Text className="text-gray-900 font-medium">Whatsapp</Text>
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
          </View>
          <TouchableOpacity className="py-3">
            <Text className="text-gray-800 font-medium">Add to Favorite</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3">
            <Text className="text-red-600 font-medium">Block this number</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
