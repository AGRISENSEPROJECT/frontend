import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SoilDetails() {
  const [activeTab, setActiveTab] = useState('Values');
  const router = useRouter();

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const generateRandomValue = (min: number, max: number) => {
    return (Math.random() * (max - min) + min).toFixed(1);
  };

  const randomSoilType = () => {
    const types = ['loam', 'clay', 'sandy', 'silt'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const randomSoilColor = () => {
    const colors = ['reddish', 'brown', 'black', 'yellow'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const randomSoilStructure = () => {
    const structures = ['compacted', 'loose', 'granular', 'blocky'];
    return structures[Math.floor(Math.random() * structures.length)];
  };

  const handleToggle = (tab: string) => {
    setActiveTab(tab);
  };

  const handleNext = () => {
    router.push('DataScanned');
  };

  return (
    <View className="flex-1 bg-[#F5F5F5] p-4">
      <View className="flex-row justify-between items-center mb-4">
        <Ionicons name="arrow-back" size={24} color="black" />
        <Text className="text-xl font-bold">Soil Details</Text>
        <View className="flex-row">
          <Ionicons name="notifications-outline" size={24} color="black" />
          <Ionicons name="ellipsis-vertical" size={24} color="black" />
        </View>
      </View>

      <View className="bg-white p-4 rounded-lg shadow mb-4 flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Ionicons name="information-circle-outline" size={24} color="green" />
          <Text className="ml-2 text-lg font-semibold">Data scanned</Text>
        </View>
        <Text className="text-gray-600">{currentDate}</Text>
      </View>

      <View className="flex-row justify-center mb-4 bg-gray-200 rounded-full p-1">
        <TouchableOpacity
          className={`flex-1 items-center py-2 rounded-full ${activeTab === 'Values' ? 'bg-[#0B4D26]' : ''}`}
          onPress={() => handleToggle('Values')}
        >
          <Text className={`${activeTab === 'Values' ? 'text-white' : 'text-black'}`}>Values</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 items-center py-2 rounded-full ${activeTab === 'Rates' ? 'bg-[#0B4D26]' : ''}`}
          onPress={() => handleToggle('Rates')}
        >
          <Text className={`${activeTab === 'Rates' ? 'text-white' : 'text-black'}`}>Rates</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        <View className="bg-white p-4 rounded-lg shadow mb-4">
          <View className="flex-row justify-between mb-4">
            <Text className="font-semibold">Property</Text>
            <Text className="font-semibold">{activeTab}</Text>
          </View>
          {activeTab === 'Values' ? (
            <>
              <View className="flex-row justify-between mb-2">
                <Text>Moisture:</Text>
                <Text>{generateRandomValue(10, 20)}%</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Temperature:</Text>
                <Text>{generateRandomValue(20, 30)} °C</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>pH level:</Text>
                <Text>{generateRandomValue(5, 7)}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil type:</Text>
                <Text>{randomSoilType()}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Organic levels:</Text>
                <Text>{generateRandomValue(3, 5)}%</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil color:</Text>
                <Text>{randomSoilColor()}</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil Structure:</Text>
                <Text>{randomSoilStructure()}</Text>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row justify-between mb-2">
                <Text>Moisture:</Text>
                <Text>moderate</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Temperature:</Text>
                <Text>optimal</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>pH level:</Text>
                <Text>moderate</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil type:</Text>
                <Text>moderate</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Organic levels:</Text>
                <Text>optimal</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil color:</Text>
                <Text>moderate</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Soil Structure:</Text>
                <Text>low</Text>
              </View>
            </>
          )}
        </View>

        <View className="bg-white p-4 rounded-lg shadow mb-4">
          <View className="flex-row justify-between mb-4">
            <Text className="font-semibold">NPK Level</Text>
            <Text className="font-semibold">{activeTab}</Text>
          </View>
          {activeTab === 'Values' ? (
            <>
              <View className="flex-row justify-between mb-2">
                <Text>Nitrogen:</Text>
                <Text>{generateRandomValue(20, 40)} mg/kg</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Phosphorus:</Text>
                <Text>{generateRandomValue(15, 30)} mg/kg</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Potassium:</Text>
                <Text>{generateRandomValue(40, 60)} mg/kg</Text>
              </View>
            </>
          ) : (
            <>
              <View className="flex-row justify-between mb-2">
                <Text>Nitrogen:</Text>
                <Text>moderate</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Phosphorus:</Text>
                <Text>optimal</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text>Potassium:</Text>
                <Text>low</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        className="bg-[#0B4D26] p-4 rounded-lg items-center mt-4"
        onPress={handleNext}
      >
        <Text className="text-white text-lg font-bold">Next</Text>
      </TouchableOpacity>
    </View>
  );
}
