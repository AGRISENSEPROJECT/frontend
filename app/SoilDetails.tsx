import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Static data matching design: Values and Rates views
const SOIL_VALUES = {
  moisture: '85%',
  temperature: '21 °C',
  pH: '6',
  soilType: 'loam',
  organic: '4.5',
  soilColor: 'reddish',
  soilStructure: 'compacted',
};

const SOIL_RATES = {
  moisture: 'moderate',
  temperature: 'optimal',
  pH: 'moderate',
  soilType: 'moderate',
  organic: 'optimal',
  soilColor: 'moderate',
  soilStructure: 'low',
};

const NPK_VALUES = { nitrogen: '20 mg/kg', phosphorus: '20 mg/kg', potassium: '50 mg/kg' };
const NPK_RATES = { nitrogen: 'moderate', phosphorus: 'optimal', potassium: 'low' };

export default function SoilDetails() {
  const [activeTab, setActiveTab] = useState<'Values' | 'Rates'>('Values');
  const router = useRouter();

  const scannedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleNext = () => {
    router.push('/DataScanned');
  };

  return (
    <View className="flex-1 bg-[#F8F8F0]">
      {/* Header - dark green icons, centered title */}
      <View className="flex-row items-center justify-between pt-12 pb-3 px-4 bg-[#F8F8F0]">
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
        {/* Data scanned card - lighter green background */}
        <View className="bg-[#E8F0E8] p-4 rounded-xl flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={22} color="#34643F" />
            <Text className="ml-2 text-base font-semibold text-gray-900">Data scanned</Text>
          </View>
          <Text className="text-gray-600 text-sm">{scannedDate}</Text>
        </View>

        {/* Segmented control - Values | Rates */}
        <View className="flex-row bg-[#E8E8E0] rounded-xl p-1 mb-5">
          <TouchableOpacity
            className={`flex-1 items-center py-2.5 rounded-lg ${activeTab === 'Values' ? 'bg-[#34643F]' : ''}`}
            onPress={() => setActiveTab('Values')}
          >
            <Text className={`text-base font-semibold ${activeTab === 'Values' ? 'text-white' : 'text-[#34643F]'}`}>
              Values
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center py-2.5 rounded-lg ${activeTab === 'Rates' ? 'bg-[#34643F]' : ''}`}
            onPress={() => setActiveTab('Rates')}
          >
            <Text className={`text-base font-semibold ${activeTab === 'Rates' ? 'text-white' : 'text-[#34643F]'}`}>
              Rates
            </Text>
          </TouchableOpacity>
        </View>

        {/* Property table */}
        <View className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm mb-4">
          <View className="flex-row justify-between mb-3 pb-2 border-b border-gray-200">
            <Text className="font-semibold text-gray-900">Property</Text>
            <Text className="font-semibold text-gray-900">{activeTab}</Text>
          </View>
          {activeTab === 'Values' ? (
            <>
              <Row label="Moisture" value={SOIL_VALUES.moisture} />
              <Row label="Temperature" value={SOIL_VALUES.temperature} />
              <Row label="pH level" value={SOIL_VALUES.pH} />
              <Row label="Soil type" value={SOIL_VALUES.soilType} />
              <Row label="Organic levels" value={SOIL_VALUES.organic} />
              <Row label="Soil color" value={SOIL_VALUES.soilColor} />
              <Row label="Soil structure" value={SOIL_VALUES.soilStructure} />
            </>
          ) : (
            <>
              <Row label="Moisture" value={SOIL_RATES.moisture} />
              <Row label="Temperature" value={SOIL_RATES.temperature} />
              <Row label="pH level" value={SOIL_RATES.pH} />
              <Row label="Soil type" value={SOIL_RATES.soilType} />
              <Row label="Organic levels" value={SOIL_RATES.organic} />
              <Row label="Soil color" value={SOIL_RATES.soilColor} />
              <Row label="Soil structure" value={SOIL_RATES.soilStructure} />
            </>
          )}
        </View>

        {/* NPK Level table */}
        <View className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm mb-6">
          <View className="flex-row justify-between mb-3 pb-2 border-b border-gray-200">
            <Text className="font-semibold text-gray-900">NPK Level</Text>
            <Text className="font-semibold text-gray-900">{activeTab}</Text>
          </View>
          {activeTab === 'Values' ? (
            <>
              <Row label="Nitrogen" value={NPK_VALUES.nitrogen} />
              <Row label="Phosphorus" value={NPK_VALUES.phosphorus} />
              <Row label="Potassium" value={NPK_VALUES.potassium} />
            </>
          ) : (
            <>
              <Row label="Nitrogen" value={NPK_RATES.nitrogen} />
              <Row label="Phosphorus" value={NPK_RATES.phosphorus} />
              <Row label="Potassium" value={NPK_RATES.potassium} />
            </>
          )}
        </View>
      </ScrollView>

      <View className="px-4 pb-8 pt-2">
        <TouchableOpacity
          className="bg-[#34643F] py-3.5 rounded-xl items-center active:opacity-90"
          onPress={handleNext}
        >
          <Text className="text-white text-lg font-semibold">Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-gray-700">{label}</Text>
      <Text className="text-gray-900 font-medium">{value}</Text>
    </View>
  );
}
