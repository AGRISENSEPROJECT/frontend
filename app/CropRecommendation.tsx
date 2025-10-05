import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function CropRecommendations() {
  const [selectedChoice, setSelectedChoice] = useState(1);

  // Static data for different choices - High, Medium, Low quality recommendations
  const cropData = {
    1: {
      bestCrop: 'Maize',
      growthScore: 'w-5/6',
      growthText: 'High Quality',
      plantingSeason: 'March – June',
      soilSuitability: 'pH: 6.9 | Moisture: Optimal | Nutrients: High',
      alternativeCrops: 'Premium Soybeans, Organic Cassava'
    },
    2: {
      bestCrop: 'Rice',
      growthScore: 'w-2/3',
      growthText: 'Medium Quality',
      plantingSeason: 'May – August',
      soilSuitability: 'pH: 6.2 | Moisture: Medium | Nutrients: Medium',
      alternativeCrops: 'Standard Wheat, Barley'
    },
    3: {
      bestCrop: 'Beans',
      growthScore: 'w-1/3',
      growthText: 'Low Quality',
      plantingSeason: 'April – July',
      soilSuitability: 'pH: 5.8 | Moisture: Low | Nutrients: Low',
      alternativeCrops: 'Basic Vegetables, Root Crops'
    }
  };

  const currentData = cropData[selectedChoice as keyof typeof cropData];

  return (
    <View className="flex-1 bg-green-800">
      {/* Header */}
      <View className="flex-row justify-between h-20 items-center p-4">
        <TouchableOpacity>
          <Text className="text-white text-lg">{'←'}</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Recommends</Text>
        <Ionicons name="notifications-outline" size={22} color="white" />
      </View>

      {/* Main Content */}
      <View className="flex-1 bg-emerald-50 rounded-t-3xl p-4">
        {/* Icon Tabs */}
        <View className="flex-row justify-around my-2">
          <TouchableOpacity className="bg-green-700 p-2 rounded-lg">
            <Ionicons name="leaf" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Ionicons name="leaf-outline" size={22} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Ionicons name="leaf-outline" size={22} color="gray" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Ionicons name="leaf-outline" size={22} color="gray" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text className="text-green-800 text-lg font-bold">🌱 Crop Recommendations</Text>
        <Text className="text-gray-500 text-sm">Best crops based on soil, weather, and market demand.</Text>

        {/* Choice Tabs */}
        <View className="flex-row justify-around my-4">
          {[1, 2, 3].map((choice) => (
            <TouchableOpacity key={choice} onPress={() => setSelectedChoice(choice)}>
              <Text className={`text-lg font-semibold ${selectedChoice === choice ? 'text-green-700' : 'text-gray-400'}`}>
                Choice {choice}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView className="space-y-2">
          {/* Crop Details */}
          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Best Crop :</Text>
            <Text className="text-gray-700">{currentData.bestCrop}</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Growth Score :</Text>
            <View className="h-2 bg-gray-200 rounded-full mt-1">
              <View className={`h-2 bg-green-600 rounded-full ${currentData.growthScore}`}></View>
            </View>
            <Text className="text-gray-700 mt-1">{currentData.growthText}</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Best Planting Season :</Text>
            <Text className="text-gray-700">{currentData.plantingSeason}</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Soil Suitability :</Text>
            <Text className="text-gray-700">{currentData.soilSuitability}</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Alternative Crops :</Text>
            <Text className="text-gray-700">{currentData.alternativeCrops}</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
