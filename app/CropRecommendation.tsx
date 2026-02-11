import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { RecommendScreenHeader } from '@/components/RecommendScreenHeader';

// Match design: green header, 5 category icons, Crop Recommendations with 3 choice tabs and cards
const CROP_DATA: Record<number, {
  bestCrop: string;
  growthFill: number; // 0–1 for progress bar
  growthText: string;
  plantingSeason: string;
  soilSuitability: string;
  alternativeCrops: string;
}> = {
  1: {
    bestCrop: 'Maize',
    growthFill: 0.85,
    growthText: 'High Yield',
    plantingSeason: 'March - June',
    soilSuitability: 'pH: 6.9 | Moisture: Medium | Nutrients: High',
    alternativeCrops: 'Soybeans, Cassava',
  },
  2: {
    bestCrop: 'Soybeans',
    growthFill: 0.5,
    growthText: 'Moderate Yield',
    plantingSeason: 'March - June',
    soilSuitability: 'pH: 6.9 | Moisture: Medium | Nutrients: High',
    alternativeCrops: 'Maize, Cassava',
  },
  3: {
    bestCrop: 'Cassava',
    growthFill: 0.35,
    growthText: 'Lower Yield',
    plantingSeason: 'April - July',
    soilSuitability: 'pH: 6.5 | Moisture: Medium | Nutrients: Medium',
    alternativeCrops: 'Maize, Soybeans',
  },
};

export default function CropRecommendations() {
  const [selectedChoice, setSelectedChoice] = useState(1);
  const currentData = CROP_DATA[selectedChoice];

  return (
    <View className="flex-1 bg-[#34643F]">
      <RecommendScreenHeader activeCategory="crop" />

      {/* Main content - light cream */}
      <View className="flex-1 bg-[#F8F8F0] rounded-t-3xl pt-6 px-4 pb-8">
        {/* Title + subtitle */}
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="leaf" size={20} color="#34643F" />
          <Text className="text-[#34643F] text-lg font-bold">Crop Recommendations</Text>
        </View>
        <Text className="text-gray-500 text-sm mb-5">Best crops based on soil, weather, and market demand.</Text>

        {/* Choice tabs */}
        <View className="flex-row justify-around mb-5 bg-white rounded-xl py-2 px-2 border border-gray-200/80">
          {[1, 2, 3].map((choice) => (
            <TouchableOpacity
              key={choice}
              onPress={() => setSelectedChoice(choice)}
              className={`flex-1 items-center py-2 rounded-lg ${selectedChoice === choice ? 'bg-[#34643F]' : ''}`}
            >
              <Text
                className={`text-base font-semibold ${selectedChoice === choice ? 'text-white' : 'text-gray-400'}`}
              >
                Choice {choice}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="gap-3">
          <View className="bg-white p-4 rounded-xl border border-gray-200/80">
            <Text className="text-[#34643F] font-semibold text-sm">Best Crop:</Text>
            <Text className="text-gray-800 text-base mt-0.5">{currentData.bestCrop}</Text>
          </View>

          <View className="bg-white p-4 rounded-xl border border-gray-200/80">
            <Text className="text-[#34643F] font-semibold text-sm">Growth Score:</Text>
            <View className="h-2.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
              <View
                className="h-2.5 bg-[#34643F] rounded-full"
                style={{ width: `${currentData.growthFill * 100}%`, minWidth: 8 }}
              />
            </View>
            <Text className="text-gray-700 text-sm mt-1.5">{currentData.growthText}</Text>
          </View>

          <View className="bg-white p-4 rounded-xl border border-gray-200/80">
            <Text className="text-[#34643F] font-semibold text-sm">Best Planting Season:</Text>
            <Text className="text-gray-800 text-base mt-0.5">{currentData.plantingSeason}</Text>
          </View>

          <View className="bg-white p-4 rounded-xl border border-gray-200/80">
            <Text className="text-[#34643F] font-semibold text-sm">Soil Suitability:</Text>
            <Text className="text-gray-800 text-base mt-0.5">{currentData.soilSuitability}</Text>
          </View>

          <View className="bg-white p-4 rounded-xl border border-gray-200/80">
            <Text className="text-[#34643F] font-semibold text-sm">Alternative Crops:</Text>
            <Text className="text-gray-800 text-base mt-0.5">{currentData.alternativeCrops}</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
