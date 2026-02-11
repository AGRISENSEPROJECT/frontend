import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Accordion: tap card to expand; expanded shows summary + "more+" link (design)
const ROUTES: Record<string, string> = {
  Crop: '/CropRecommendation',
  Irrigation: '/IrrigationRecommendation',
  Disease: '/PestDiseaseRecommendation',
  Fertilizer: '/FertilizerRecommendation',
  Weather: '/WeatherRecommendation',
};

function formatDate() {
  const d = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const sections = [
  {
    key: 'Crop',
    title: 'Crop recommends',
    icon: 'leaf' as const,
    summaryLines: ['Best Crop: Maize'],
  },
  {
    key: 'Irrigation',
    title: 'Irrigation recommends',
    icon: 'water' as const,
    summaryLines: ['Soil Moisture: 40% (Needs watering)', 'Next Irrigation: Tomorrow, 6 AM'],
  },
  {
    key: 'Disease',
    title: 'Disease recommends',
    icon: 'bug' as const,
    summaryLines: ['Detected Issue: Leaf Rust (Maize)', 'Treatment: Neem Oil Spray'],
  },
  {
    key: 'Fertilizer',
    title: 'Fertilizer recommends',
    icon: 'nutrition' as const,
    summaryLines: ['Soil pH: 6.2 (Slightly Acidic)', 'Suggested Fertilizer: NPK 20-10-10, 50kg per acre'],
  },
  {
    key: 'Weather',
    title: 'Weather recommends',
    icon: 'rainy' as const,
    summaryLines: ['Current Temp: 28°C', 'Advice: Reduce irrigation'],
  },
];

export default function Recommends() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => (prev === key ? null : key));
  };

  return (
    <View className="flex-1 bg-[#F8F8F0]">
      <View className="flex-row justify-between items-center bg-[#34643F] px-4 pt-12 pb-4">
        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Recommends</Text>
        <TouchableOpacity className="p-2">
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} className="flex-1">
        <View className="items-center my-4">
          <View className="w-24 h-24 rounded-full bg-white border-2 border-[#34643F]/20 overflow-hidden">
            <Image
              source={require('../assets/farm-illustration.png')}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <Text className="text-gray-700 font-semibold text-base mt-3">{formatDate()}</Text>
        </View>

        {sections.map(({ key, title, icon, summaryLines }) => {
          const isExpanded = expanded === key;
          return (
            <View key={key} className="mb-2">
              <TouchableOpacity
                onPress={() => toggleExpand(key)}
                className="flex-row items-center bg-white px-4 py-3.5 rounded-xl border border-gray-200/80 shadow-sm"
                activeOpacity={0.85}
              >
                <Ionicons name={icon} size={22} color="#34643F" />
                <Text className="flex-1 ml-3 text-[15px] font-medium text-gray-800">{title}</Text>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color="#666" />
              </TouchableOpacity>

              {isExpanded && (
                <View className="bg-[#E8E8E0] rounded-b-xl -mt-0.5 px-4 py-3 border border-t-0 border-gray-200/80 ml-1 mr-1">
                  {summaryLines.map((line, i) => (
                    <Text key={i} className="text-gray-800 text-sm">
                      {line}
                    </Text>
                  ))}
                  <TouchableOpacity
                    onPress={() => router.push(ROUTES[key] as any)}
                    className="flex-row justify-end mt-2"
                  >
                    <Text className="text-[#34643F] font-semibold text-sm underline">more →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
