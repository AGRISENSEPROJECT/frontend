import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

export default function DataScanned() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const handleBack = () => {
    router.back();
  };

  // Get today's date
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const data = {
    labels: ['Stru', 'Temp', 'pH', 'Moi', 'N', 'P', 'K'],
    datasets: [
      {
        data: [20, 30, 18, 25, 22, 16, 14],
        color: (opacity = 1) => `rgba(255, 0, 0, ${opacity})`, // Red (Low)
        strokeWidth: 2, // Line thickness
      },
      {
        data: [40, 50, 45, 55, 60, 48, 47],
        color: (opacity = 1) => `rgba(255, 165, 0, ${opacity})`, // Orange (Moderate)
        strokeWidth: 2,
      },
      {
        data: [70, 85, 80, 90, 95, 88, 92],
        color: (opacity = 1) => `rgba(0, 128, 0, ${opacity})`, // Green (Optimal)
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View className="flex-1 bg-[#FAF9F6] px-4 py-2">
      {/* Header */}
      <View className="flex-row justify-between items-center my-2">
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-green-900">Soil Details</Text>
        <Ionicons name="notifications-outline" size={24} color="black" />
      </View>

      {/* Data Info */}
      <View className="bg-[#E8F0F2] p-3 rounded-lg shadow flex-row justify-between items-center mb-4">
        <View className="flex-row items-center">
          <Ionicons name="information-circle-outline" size={24} color="green" />
          <Text className="ml-2 text-base font-semibold text-green-900">Data scanned</Text>
        </View>
        <Text className="text-gray-600">{today}</Text>
      </View>

      {/* Properties */}
      <View className="bg-white p-4 rounded-lg shadow flex-row justify-between">
        <View className="w-[48%] border border-gray-300 rounded-lg p-3">
          <Text className="text-center font-semibold text-gray-800">Soil properties</Text>
          <View className="mt-2">
            <Text className="text-green-700 text-sm">● pH level</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-green-500 rounded-full" style={{ width: '70%' }} />
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-orange-600 text-sm mt-1">● Temperature</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-orange-500 rounded-full" style={{ width: '50%' }} />
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-red-500 text-sm mt-1">● Structure</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-red-500 rounded-full" style={{ width: '30%' }} />
            </View>
          </View>
        </View>

        <View className="w-[48%] border border-gray-300 rounded-lg p-3">
          <Text className="text-center font-semibold text-gray-800">NPK levels</Text>
          <View className="mt-2">
            <Text className="text-green-700 text-sm">● Nitrogen</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-green-500 rounded-full" style={{ width: '80%' }} />
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-orange-600 text-sm mt-1">● Phosphorus</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-orange-500 rounded-full" style={{ width: '60%' }} />
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-red-500 text-sm mt-1">● Potassium</Text>
            <View className="h-2 bg-gray-200 rounded-full">
              <View className="h-2 bg-red-500 rounded-full" style={{ width: '40%' }} />
            </View>
          </View>
        </View>
      </View>

      {/* Chart */}
      <ScrollView horizontal className="mt-4">
        <LineChart
          data={data}
          width={screenWidth - 16}
          height={220}
          withDots={false} // No dots on lines
          withInnerLines={false} // No grid lines
          withOuterLines={false} // No outer border
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '0', // Completely remove dots
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </ScrollView>

      {/* Legend */}
      <View className="flex-row justify-center space-x-4 mt-4">
        <View className="flex-row items-center">
          <View className="w-4 h-4 bg-red-500 rounded-full mr-2"></View>
          <Text>low</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-4 h-4 bg-orange-500 rounded-full mr-2"></View>
          <Text>moderate</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-4 h-4 bg-green-500 rounded-full mr-2"></View>
          <Text>optimal</Text>
        </View>
      </View>

      {/* Button */}
      <TouchableOpacity
        className="bg-[#0B4D26] p-4 rounded-lg items-center mt-4"
        onPress={() => router.push('NextPage')}
      >
        <Text className="text-white text-lg font-bold">Get Recommended</Text>
      </TouchableOpacity>
    </View>
  );
}
