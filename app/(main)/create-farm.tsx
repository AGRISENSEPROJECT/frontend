import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface FarmData {
    farmName: string;
    farmSize: string;
    farmLocation: string;
    soilType: string;
    irrigationType: string;
    climateZone: string;
}

interface FormErrors {
    farmName?: string;
    farmSize?: string;
    farmLocation?: string;
}

export default function CreateFarm() {
    const router = useRouter();
    const [farmData, setFarmData] = useState<FarmData>({
        farmName: '',
        farmSize: '',
        farmLocation: '',
        soilType: '',
        irrigationType: '',
        climateZone: ''
    });

    const [errors, setErrors] = useState<FormErrors>({});

    const validateForm = () => {
        const newErrors: FormErrors = {};
        
        if (!farmData.farmName.trim()) {
            newErrors.farmName = 'Farm name is required';
        }
        
        if (!farmData.farmSize.trim()) {
            newErrors.farmSize = 'Farm size is required';
        }
        
        if (!farmData.farmLocation.trim()) {
            newErrors.farmLocation = 'Farm location is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateFarm = () => {
        if (!validateForm()) return;

        // For demo purposes, we'll simulate success and navigate directly
        console.log('Farm data:', farmData);
            
        // Navigate directly to dashboard for demo
        router.push('/(main)/dashboard');
    };

    const handleDemoMode = () => {
        // Demo mode - skip validation and go straight to dashboard
        Alert.alert(
            'Demo Mode',
            'Skipping farm creation for demo purposes. Going to dashboard...',
            [
                {
                    text: 'Continue',
                    onPress: () => router.push('/(main)/dashboard')
                }
            ]
        );
    };

    const soilTypes = [
        'Clay', 'Sandy', 'Loamy', 'Silt', 'Peaty', 'Chalky', 'Unknown'
    ];

    const irrigationTypes = [
        'Drip', 'Sprinkler', 'Flood', 'Center Pivot', 'None', 'Manual'
    ];

    const climateZones = [
        'Tropical', 'Subtropical', 'Temperate', 'Mediterranean', 'Desert', 'Alpine'
    ];

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5DC]">
            <ScrollView className="flex-1 p-6">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold ml-4 text-[#0B4D26]">
                        Create Your Farm
                    </Text>
                </View>

                <Text className="text-gray-600 mb-6 text-center">
                    Set up your farm profile to get personalized crop recommendations and soil analysis
                </Text>

                {/* Demo Mode Button */}
                <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                    <Text className="text-blue-800 font-semibold mb-2">🎯 Demo Mode</Text>
                    <Text className="text-blue-700 text-sm mb-3">
                        Skip farm creation and go directly to the main features for demonstration
                    </Text>
                    <TouchableOpacity
                        className="bg-blue-600 py-3 rounded-lg items-center"
                        onPress={handleDemoMode}
                    >
                        <Text className="text-white font-semibold">
                            Skip to Demo
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Farm Name */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Farm Name</Text>
                    <TextInput
                        className="bg-white p-4 rounded-lg border border-gray-300"
                        placeholder="Enter your farm name"
                        value={farmData.farmName}
                        onChangeText={(text) => setFarmData({...farmData, farmName: text})}
                    />
                    {errors.farmName && (
                        <Text className="text-red-500 text-sm mt-1">{errors.farmName}</Text>
                    )}
                </View>

                {/* Farm Size */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Farm Size (Acres/Hectares)</Text>
                    <TextInput
                        className="bg-white p-4 rounded-lg border border-gray-300"
                        placeholder="e.g., 25 acres"
                        value={farmData.farmSize}
                        onChangeText={(text) => setFarmData({...farmData, farmSize: text})}
                        keyboardType="numeric"
                    />
                    {errors.farmSize && (
                        <Text className="text-red-500 text-sm mt-1">{errors.farmSize}</Text>
                    )}
                </View>

                {/* Farm Location */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Farm Location</Text>
                    <TextInput
                        className="bg-white p-4 rounded-lg border border-gray-300"
                        placeholder="City, State/Province"
                        value={farmData.farmLocation}
                        onChangeText={(text) => setFarmData({...farmData, farmLocation: text})}
                    />
                    {errors.farmLocation && (
                        <Text className="text-red-500 text-sm mt-1">{errors.farmLocation}</Text>
                    )}
                </View>

                {/* Soil Type */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Primary Soil Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {soilTypes.map((type) => (
                            <TouchableOpacity
                                key={type}
                                className={`px-4 py-2 rounded-full border ${
                                    farmData.soilType === type 
                                        ? 'bg-[#0B4D26] border-[#0B4D26]' 
                                        : 'bg-white border-gray-300'
                                }`}
                                onPress={() => setFarmData({...farmData, soilType: type})}
                            >
                                <Text className={
                                    farmData.soilType === type ? 'text-white' : 'text-gray-700'
                                }>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Irrigation Type */}
                <View className="mb-4">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Irrigation System</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {irrigationTypes.map((type) => (
                            <TouchableOpacity
                                key={type}
                                className={`px-4 py-2 rounded-full border ${
                                    farmData.irrigationType === type 
                                        ? 'bg-[#0B4D26] border-[#0B4D26]' 
                                        : 'bg-white border-gray-300'
                                }`}
                                onPress={() => setFarmData({...farmData, irrigationType: type})}
                            >
                                <Text className={
                                    farmData.irrigationType === type ? 'text-white' : 'text-gray-700'
                                }>
                                    {type}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Climate Zone */}
                <View className="mb-6">
                    <Text className="text-lg font-semibold mb-2 text-gray-800">Climate Zone</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {climateZones.map((zone) => (
                            <TouchableOpacity
                                key={zone}
                                className={`px-4 py-2 rounded-full border ${
                                    farmData.climateZone === zone 
                                        ? 'bg-[#0B4D26] border-[#0B4D26]' 
                                        : 'bg-white border-gray-300'
                                }`}
                                onPress={() => setFarmData({...farmData, climateZone: zone})}
                            >
                                <Text className={
                                    farmData.climateZone === zone ? 'text-white' : 'text-gray-700'
                                }>
                                    {zone}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Create Farm Button */}
                <TouchableOpacity
                    className="bg-[#0B4D26] py-4 rounded-lg items-center mb-6"
                    onPress={handleCreateFarm}
                >
                    <Text className="text-white text-lg font-semibold">
                        Create Farm
                    </Text>
                </TouchableOpacity>

                <Text className="text-gray-500 text-sm text-center mb-4">
                    You can always update these details later in your farm settings
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
} 