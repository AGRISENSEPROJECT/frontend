import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const SAMPLE_MSG = "Hey, I've been noticing some yellowing on my maize leaves lately. Any idea what might...";

export default function CommunityChat() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const contactName = (params.name as string) || 'Chance Regine';
  const [input, setInput] = useState('');
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      {/* Green header: back, profile + name, menu */}
      <View className="bg-[#166534] pt-12 pb-3 px-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center justify-center gap-2">
          <View className="relative">
            <Image
              source={require('../assets/profile-pic.png')}
              className="w-9 h-9 rounded-full"
            />
            <View className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border border-[#166534]" />
          </View>
          <Text className="text-white font-semibold text-base">{contactName}</Text>
        </View>
        <TouchableOpacity className="p-2" onPress={() => router.push({ pathname: '/ContactProfile', params: { name: contactName } })}>
          <Ionicons name="ellipsis-vertical" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat messages */}
      <ScrollView className="flex-1 px-4 py-3" contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Incoming */}
        <View className="flex-row justify-start mb-3">
          <View className="max-w-[80%] bg-gray-200 rounded-2xl rounded-tl-sm px-4 py-2.5">
            <Text className="text-gray-800 text-sm">{SAMPLE_MSG}</Text>
            <Text className="text-gray-500 text-xs mt-1">10:04 am</Text>
          </View>
        </View>
        {/* Image block */}
        <View className="flex-row justify-start mb-3">
          <View className="flex-row flex-wrap gap-1" style={{ maxWidth: '75%' }}>
            <Image source={require('../assets/crop-image.png')} className="w-24 h-32 rounded-lg" resizeMode="cover" />
            <View className="gap-1">
              <Image source={require('../assets/latest-update.png')} className="w-24 h-14 rounded-lg" resizeMode="cover" />
              <Image source={require('../assets/farm-illustration.png')} className="w-24 h-14 rounded-lg" resizeMode="cover" />
            </View>
            <Text className="text-gray-500 text-xs w-full mt-1">10:04 am</Text>
          </View>
        </View>
        {/* Outgoing */}
        <View className="flex-row justify-end mb-3">
          <View className="max-w-[80%] bg-[#166534]/15 rounded-2xl rounded-tr-sm px-4 py-2.5">
            <Text className="text-gray-800 text-sm">{SAMPLE_MSG}</Text>
            <Text className="text-gray-500 text-xs mt-1">10:04 am</Text>
          </View>
        </View>
      </ScrollView>

      {/* Input bar - above phone controls (safe area) */}
      <View className="flex-row items-center px-4 py-2 border-t border-gray-200 bg-white" style={{ paddingBottom: Math.max(insets.bottom, 12) + 8 }}>
        <TextInput
          className="flex-1 bg-gray-100 rounded-full py-2.5 px-4 text-base"
          placeholder="Message..."
          placeholderTextColor="#999"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity className="ml-2 p-2">
          <Ionicons name="send" size={22} color="#166534" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
