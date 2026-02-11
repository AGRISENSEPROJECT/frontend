import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

export default function DataScanned() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  const scannedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Line graph: lime, pH, M, N, P, K - red (low), orange (moderate), green (optimal)
  const chartData = {
    labels: ['lime', 'pH', 'M', 'N', 'P', 'K'],
    datasets: [
      { data: [16, 32, 28, 22, 18, 16], color: (o = 1) => `rgba(239, 68, 68, ${o})`, strokeWidth: 2 },
      { data: [50, 50, 50, 50, 50, 50], color: (o = 1) => `rgba(249, 115, 22, ${o})`, strokeWidth: 2 },
      { data: [90, 85, 88, 92, 95, 108], color: (o = 1) => `rgba(34, 197, 94, ${o})`, strokeWidth: 2 },
    ],
  };

  return (
    <View className="flex-1 bg-[#F8F8F0]">
      {/* Header - match Soil Details design */}
      <View className="flex-row items-center justify-between pt-12 pb-3 px-4">
        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#34643F" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Soil Details</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity className="p-2">
            <Ionicons name="notifications-outline" size={24} color="#34643F" />
          </TouchableOpacity>
          <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
            <Ionicons name="person" size={18} color="#666" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Data scanned card */}
        <View className="bg-[#E8F0E8] p-4 rounded-xl flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={22} color="#34643F" />
            <Text className="ml-2 text-base font-semibold text-gray-900">Data scanned</Text>
          </View>
          <Text className="text-gray-600 text-sm">{scannedDate}</Text>
        </View>

        {/* Summary cards - mini progress bars (soil properties & nitrogen) */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
            <Text className="text-center font-semibold text-gray-800 text-sm mb-3">Soil properties</Text>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden flex-row">
              <View className="flex-1 bg-red-500" />
              <View className="flex-1 bg-orange-500" />
              <View className="flex-2 bg-green-500" />
            </View>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
            <Text className="text-center font-semibold text-gray-800 text-sm mb-3">Nitrogen</Text>
            <View className="h-2 bg-gray-200 rounded-full overflow-hidden flex-row">
              <View className="flex-1 bg-red-500" />
              <View className="flex-2 bg-orange-500" />
              <View className="flex-1 bg-green-500" />
            </View>
          </View>
        </View>

        {/* Line graph */}
        <View className="bg-white rounded-xl border border-gray-200/80 overflow-hidden mb-4">
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: () => 'rgba(0,0,0,0.3)',
              labelColor: () => 'rgba(0,0,0,0.8)',
              style: { borderRadius: 12 },
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 12 }}
          />
        </View>

        {/* Legend */}
        <View className="flex-row justify-center gap-6 mb-6">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-1.5" />
            <Text className="text-gray-700 text-sm">low</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-orange-500 mr-1.5" />
            <Text className="text-gray-700 text-sm">moderate</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-1.5" />
            <Text className="text-gray-700 text-sm">optimal</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-4 pb-8 pt-2">
        <TouchableOpacity
          className="bg-[#34643F] py-3.5 rounded-xl items-center active:opacity-90"
          onPress={() => router.push('/recommends')}
        >
          <Text className="text-white text-lg font-semibold">Get Recommended</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
