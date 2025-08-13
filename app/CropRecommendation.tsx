import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Bell, Leaf } from 'lucide-react-native';

export default function CropRecommendations() {
  const [selectedChoice, setSelectedChoice] = useState(1);

  return (
    <View className="flex-1 bg-green-800">
      {/* Header */}
      <View className="flex-row justify-between h-20 items-center p-4">
        <TouchableOpacity>
          <Text className="text-white text-lg">{'←'}</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Recommends</Text>
        <Bell color="white" size={22} />
      </View>

      {/* Main Content */}
      <View className="flex-1 bg-emerald-50 rounded-t-3xl p-4">
        {/* Icon Tabs */}
        <View className="flex-row justify-around my-2">
          <TouchableOpacity className="bg-green-700 p-2 rounded-lg">
            <Leaf color="white" size={22} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Leaf color="gray" size={22} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Leaf color="gray" size={22} />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Leaf color="gray" size={22} />
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
            <Text className="text-gray-700">Maize</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Growth Score :</Text>
            <View className="h-2 bg-gray-200 rounded-full mt-1">
              <View className="h-2 bg-green-600 rounded-full w-3/4"></View>
            </View>
            <Text className="text-gray-700 mt-1">High Yield</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Best Planting Season :</Text>
            <Text className="text-gray-700">March – June</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Soil Suitability :</Text>
            <Text className="text-gray-700">pH: 6.9 | Moisture: Medium | Nutrients: High</Text>
          </View>

          <View className="bg-white p-4 rounded-lg shadow-sm">
            <Text className="text-green-700 font-semibold">Alternative Crops :</Text>
            <Text className="text-gray-700">Soybeans, Cassava</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
