import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Recommends() {
    const [expanded, setExpanded] = useState<string | null>(null);
    const router = useRouter();

    const toggleExpand = (item: string) => {
        setExpanded(expanded === item ? null : item);
    };

    return (
        <View className="flex-1 bg-[#F5F5DC]">
            {/* Header */}
            <View className="flex-row justify-between items-center bg-[#166534] p-4">
                <TouchableOpacity>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold">Recommends</Text>
                <TouchableOpacity>
                    <Ionicons name="notifications-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 16 }}>
                <View className="my-4">
                    <Ionicons name="leaf" size={80} color="#166534" />
                </View>
                <Text className="text-lg font-bold mb-4">Tuesday, 17 May 2025</Text>

                {/* Recommendations */}
                {[
                    { name: 'Crop', details: 'Best Crop: Maize' },
                    { name: 'Irrigation', details: 'Soil Moisture: 40% (Needs watering)\nNext Irrigation: Tomorrow, 6 AM' },
                    { name: 'Disease', details: 'Detected Issue: Leaf Rust (Maize)\nTreatment: Neem Oil Spray' },
                    { name: 'Fertilizer', details: 'Soil pH: 6.2 (Slightly Acidic)\nNitrogen: Low (Needs Urea Fertilizer)\nSuggested Fertilizer: NPK 20-10-10, 50kg per acre' },
                    { name: 'Weather', details: 'Current Temp: 28°C\nAdvice: Reduce irrigation' },
                ].map((item, index) => (
                    <View key={index} className="w-full">
                        <TouchableOpacity
                            onPress={() => toggleExpand(item.name)}
                            className="flex-row items-center justify-between bg-white p-4 mb-2 rounded-lg shadow"
                        >
                            <Ionicons name="leaf-outline" size={24} color="#000" />
                            <Text className="flex-1 ml-2 text-lg">{item.name} recommends</Text>
                            <Ionicons name={expanded === item.name ? "chevron-up" : "chevron-down"} size={24} color="#000" />
                        </TouchableOpacity>
                        {expanded === item.name && (
                            <View className="bg-gray-100 p-4 mb-2 rounded-lg">
                                <Text className="text-sm">{item.details}</Text>
                                <TouchableOpacity className="mt-2" onPress={() => router.push('CropRecommendation')}>
                                    <Text className="text-[#166534] text-sm">more →</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
