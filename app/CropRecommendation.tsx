import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { Bell, Leaf, TrendingUp, Calendar, Droplets, Thermometer } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CropRecommendations() {
  const [selectedChoice, setSelectedChoice] = useState(1);
  const router = useRouter();

  // Mock crop recommendations based on soil analysis
  const cropRecommendations = {
    1: {
      name: 'Maize (Corn)',
      scientificName: 'Zea mays',
      growthScore: 85,
      yield: 'High Yield',
      plantingSeason: 'March – June',
      soilSuitability: 'pH: 6.0-7.0 | Moisture: Medium | Nutrients: High',
      alternatives: ['Soybeans', 'Cassava', 'Sweet Potato'],
      description: 'Excellent choice for your soil conditions. Maize thrives in well-drained, fertile soil with good organic matter content.',
      waterNeeds: 'Medium',
      temperature: '18-32°C',
      harvestTime: '90-120 days'
    },
    2: {
      name: 'Soybeans'  ,
      scientificName: 'Glycine max',
      growthScore: 78,
      yield: 'Good Yield',
      plantingSeason: 'April – May',
      soilSuitability: 'pH: 6.0-6.8 | Moisture: Medium | Nutrients: Medium-High',
      alternatives: ['Cowpeas', 'Groundnuts', 'Pigeon Peas'],
      description: 'Great nitrogen-fixing crop that improves soil fertility. Suitable for crop rotation and sustainable farming.',
      waterNeeds: 'Medium',
      temperature: '20-30°C',
      harvestTime: '100-130 days'
    },
    3: {
      name: 'Cassava',
      scientificName: 'Manihot esculenta',
      growthScore: 72,
      yield: 'Moderate-High',
      plantingSeason: 'Year-round',
      soilSuitability: 'pH: 5.5-7.0 | Moisture: Low-Medium | Nutrients: Low-Medium',
      alternatives: ['Yam', 'Taro', 'Sweet Potato'],
      description: 'Drought-resistant root crop perfect for areas with variable rainfall. Low maintenance and high carbohydrate yield.',
      waterNeeds: 'Low',
      temperature: '25-35°C',
      harvestTime: '8-18 months'
    }
  };

  const currentCrop = cropRecommendations[selectedChoice];

  const getGrowthScoreColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGrowthScoreText = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Fair';
  };

  return (
    <View className="flex-1 bg-green-800">
      {/* Header */}
      <View className="flex-row justify-between h-20 items-center p-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-white text-lg">{'←'}</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-semibold">Crop Recommendations</Text>
        <Bell color="white" size={22} />
      </View>

      {/* Main Content */}
      <View className="flex-1 bg-emerald-50 rounded-t-3xl p-4">
        {/* Icon Tabs */}
        <View className="flex-row justify-around my-4">
          <TouchableOpacity className="bg-green-700 p-3 rounded-lg">
            <Leaf color="white" size={24} />
          </TouchableOpacity>
          <TouchableOpacity className="p-3">
            <TrendingUp color="gray" size={24} />
          </TouchableOpacity>
          <TouchableOpacity className="p-3">
            <Calendar color="gray" size={24} />
          </TouchableOpacity>
          <TouchableOpacity className="p-3">
            <Droplets color="gray" size={24} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text className="text-green-800 text-xl font-bold mb-2">🌱 Crop Recommendations</Text>
        <Text className="text-gray-500 text-sm mb-4">Best crops based on your soil analysis and environmental conditions.</Text>

        {/* Choice Tabs */}
        <View className="flex-row justify-around my-4 bg-white p-2 rounded-lg">
          {[1, 2, 3].map((choice) => (
            <TouchableOpacity 
              key={choice} 
              onPress={() => setSelectedChoice(choice)}
              className={`px-4 py-2 rounded-lg ${
                selectedChoice === choice ? 'bg-green-100' : ''
              }`}
            >
              <Text className={`text-lg font-semibold ${
                selectedChoice === choice ? 'text-green-700' : 'text-gray-400'
              }`}>
                Choice {choice}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView className="space-y-3" showsVerticalScrollIndicator={false}>
          {/* Crop Header */}
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-green-700 font-bold text-lg">{currentCrop.name}</Text>
              <Text className="text-gray-500 text-sm italic">{currentCrop.scientificName}</Text>
            </View>
            <Text className="text-gray-700 text-sm">{currentCrop.description}</Text>
          </View>

          {/* Growth Score */}
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <Text className="text-green-700 font-semibold mb-2">Growth Score</Text>
            <View className="flex-row items-center space-x-3">
              <View className="flex-1">
                <View className="h-3 bg-gray-200 rounded-full">
                  <View 
                    className={`h-3 rounded-full ${getGrowthScoreColor(currentCrop.growthScore)}`}
                    style={{ width: `${currentCrop.growthScore}%` }}
                  ></View>
                </View>
                <Text className="text-gray-700 mt-1 text-sm">{getGrowthScoreText(currentCrop.growthScore)}</Text>
              </View>
              <View className="bg-green-100 px-3 py-1 rounded-full">
                <Text className="text-green-700 font-bold">{currentCrop.growthScore}%</Text>
              </View>
            </View>
          </View>

          {/* Key Information Grid */}
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <Text className="text-green-700 font-semibold mb-3">Key Information</Text>
            <View className="space-y-3">
              <View className="flex-row items-center space-x-3">
                <Calendar color="#0B4D26" size={20} />
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Planting Season</Text>
                  <Text className="text-gray-800 font-medium">{currentCrop.plantingSeason}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center space-x-3">
                <Droplets color="#0B4D26" size={20} />
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Water Needs</Text>
                  <Text className="text-gray-800 font-medium">{currentCrop.waterNeeds}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center space-x-3">
                <Thermometer color="#0B4D26" size={20} />
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Temperature Range</Text>
                  <Text className="text-gray-800 font-medium">{currentCrop.temperature}</Text>
                </View>
              </View>
              
              <View className="flex-row items-center space-x-3">
                <Leaf color="#0B4D26" size={20} />
                <View className="flex-1">
                  <Text className="text-gray-600 text-sm">Harvest Time</Text>
                  <Text className="text-gray-800 font-medium">{currentCrop.harvestTime}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Soil Suitability */}
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <Text className="text-green-700 font-semibold mb-2">Soil Suitability</Text>
            <Text className="text-gray-700">{currentCrop.soilSuitability}</Text>
          </View>

          {/* Alternative Crops */}
          <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <Text className="text-green-700 font-semibold mb-2">Alternative Crops</Text>
            <View className="flex-row flex-wrap gap-2">
              {currentCrop.alternatives.map((crop, index) => (
                <View key={index} className="bg-green-50 px-3 py-2 rounded-full border border-green-200">
                  <Text className="text-green-700 text-sm">{crop}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 mb-4">
            <TouchableOpacity className="flex-1 bg-green-600 py-3 rounded-lg items-center">
              <Text className="text-white font-semibold">Save Recommendation</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 bg-blue-600 py-3 rounded-lg items-center">
              <Text className="text-white font-semibold">View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Tips */}
          <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
            <Text className="text-blue-800 font-semibold mb-2">💡 Farming Tips</Text>
            <Text className="text-blue-700 text-sm">
              • Test your soil regularly for optimal results{'\n'}
              • Consider crop rotation to maintain soil health{'\n'}
              • Monitor weather conditions for best planting times{'\n'}
              • Use organic fertilizers to improve soil fertility
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
