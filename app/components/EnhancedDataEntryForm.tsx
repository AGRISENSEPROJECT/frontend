import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SoilAnalysisLoading from './SoilAnalysisLoading';

export default function EnhancedDataEntryForm() {
    const router = useRouter();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [sensorData, setSensorData] = useState({
        // Basic soil properties
        ph: '',
        moisture: '',
        temperature: '',
        nitrogen: '',
        phosphorus: '',
        potassium: '',
        organicMatter: '',
        
        // Advanced properties
        soilTexture: '',
        bulkDensity: '',
        porosity: '',
        electricalConductivity: '',
        
        // Environmental factors
        rainfall: '',
        humidity: '',
        windSpeed: '',
        solarRadiation: ''
    });

    const [useAdvanced, setUseAdvanced] = useState(false);
    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        
        // Required fields
        if (!sensorData.ph.trim()) {
            newErrors.ph = 'pH level is required';
        } else if (parseFloat(sensorData.ph) < 0 || parseFloat(sensorData.ph) > 14) {
            newErrors.ph = 'pH must be between 0 and 14';
        }
        
        if (!sensorData.moisture.trim()) {
            newErrors.moisture = 'Moisture level is required';
        } else if (parseFloat(sensorData.moisture) < 0 || parseFloat(sensorData.moisture) > 100) {
            newErrors.moisture = 'Moisture must be between 0 and 100%';
        }
        
        if (!sensorData.temperature.trim()) {
            newErrors.temperature = 'Temperature is required';
        }
        
        if (!sensorData.nitrogen.trim()) {
            newErrors.nitrogen = 'Nitrogen level is required';
        }
        
        if (!sensorData.phosphorus.trim()) {
            newErrors.phosphorus = 'Phosphorus level is required';
        }
        
        if (!sensorData.potassium.trim()) {
            newErrors.potassium = 'Potassium level is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        // Start analysis
        setIsAnalyzing(true);
    };

    const handleAnalysisComplete = () => {
        // Navigate to crop recommendations
        router.push('/CropRecommendation');
    };

    if (isAnalyzing) {
        return (
            <SoilAnalysisLoading 
                method="sensor" 
                onComplete={handleAnalysisComplete} 
            />
        );
    }

    const soilTextures = ['Clay', 'Sandy', 'Loamy', 'Silt', 'Peaty', 'Chalky'];
    const moistureLevels = ['Very Dry', 'Dry', 'Moderate', 'Moist', 'Very Moist', 'Saturated'];

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5DC]">
            <ScrollView className="flex-1 p-6">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-bold ml-4 text-[#0B4D26]">
                        Sensor Data Entry
                    </Text>
                </View>

                <Text className="text-gray-600 mb-6 text-center">
                    Enter your soil sensor readings to get accurate crop recommendations
                </Text>

                {/* Basic Soil Properties */}
                <View className="bg-white p-4 rounded-lg mb-4">
                    <Text className="text-lg font-semibold mb-4 text-[#0B4D26]">
                        🌱 Basic Soil Properties
                    </Text>
                    
                    {/* pH Level */}
                    <View className="mb-4">
                        <Text className="text-base font-medium mb-2 text-gray-800">pH Level</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                            placeholder="e.g., 6.5"
                            value={sensorData.ph}
                            onChangeText={(text) => setSensorData({...sensorData, ph: text})}
                            keyboardType="numeric"
                        />
                        {errors.ph && (
                            <Text className="text-red-500 text-sm mt-1">{errors.ph}</Text>
                        )}
                    </View>

                    {/* Moisture Level */}
                    <View className="mb-4">
                        <Text className="text-base font-medium mb-2 text-gray-800">Moisture Level (%)</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                            placeholder="e.g., 45"
                            value={sensorData.moisture}
                            onChangeText={(text) => setSensorData({...sensorData, moisture: text})}
                            keyboardType="numeric"
                        />
                        {errors.moisture && (
                            <Text className="text-red-500 text-sm mt-1">{errors.moisture}</Text>
                        )}
                    </View>

                    {/* Temperature */}
                    <View className="mb-4">
                        <Text className="text-base font-medium mb-2 text-gray-800">Soil Temperature (°C)</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                            placeholder="e.g., 22"
                            value={sensorData.temperature}
                            onChangeText={(text) => setSensorData({...sensorData, temperature: text})}
                            keyboardType="numeric"
                        />
                        {errors.temperature && (
                            <Text className="text-red-500 text-sm mt-1">{errors.temperature}</Text>
                        )}
                    </View>

                    {/* NPK Values */}
                    <View className="flex-row space-x-2">
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Nitrogen (N)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="mg/kg"
                                value={sensorData.nitrogen}
                                onChangeText={(text) => setSensorData({...sensorData, nitrogen: text})}
                                keyboardType="numeric"
                            />
                            {errors.nitrogen && (
                                <Text className="text-red-500 text-sm mt-1">{errors.nitrogen}</Text>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Phosphorus (P)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="mg/kg"
                                value={sensorData.phosphorus}
                                onChangeText={(text) => setSensorData({...sensorData, phosphorus: text})}
                                keyboardType="numeric"
                            />
                            {errors.phosphorus && (
                                <Text className="text-red-500 text-sm mt-1">{errors.phosphorus}</Text>
                            )}
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Potassium (K)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="mg/kg"
                                value={sensorData.potassium}
                                onChangeText={(text) => setSensorData({...sensorData, potassium: text})}
                                keyboardType="numeric"
                            />
                            {errors.potassium && (
                                <Text className="text-red-500 text-sm mt-1">{errors.potassium}</Text>
                            )}
                        </View>
                    </View>

                    {/* Organic Matter */}
                    <View className="mb-4">
                        <Text className="text-base font-medium mb-2 text-gray-800">Organic Matter (%)</Text>
                        <TextInput
                            className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                            placeholder="e.g., 3.2"
                            value={sensorData.organicMatter}
                            onChangeText={(text) => setSensorData({...sensorData, organicMatter: text})}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Advanced Options Toggle */}
                <View className="bg-white p-4 rounded-lg mb-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-semibold text-[#0B4D26]">
                            🔬 Advanced Properties
                        </Text>
                        <Switch
                            value={useAdvanced}
                            onValueChange={setUseAdvanced}
                            trackColor={{ false: "#767577", true: "#0B4D26" }}
                            thumbColor={useAdvanced ? "#fff" : "#f4f3f4"}
                        />
                    </View>
                </View>

                {/* Advanced Properties */}
                {useAdvanced && (
                    <View className="bg-white p-4 rounded-lg mb-4">
                        <Text className="text-base font-medium mb-2 text-gray-800">Soil Texture</Text>
                        <View className="flex-row flex-wrap gap-2 mb-4">
                            {soilTextures.map((texture) => (
                                <TouchableOpacity
                                    key={texture}
                                    className={`px-3 py-2 rounded-full border ${
                                        sensorData.soilTexture === texture 
                                            ? 'bg-[#0B4D26] border-[#0B4D26]' 
                                            : 'bg-gray-50 border-gray-300'
                                    }`}
                                    onPress={() => setSensorData({...sensorData, soilTexture: texture})}
                                >
                                    <Text className={
                                        sensorData.soilTexture === texture ? 'text-white' : 'text-gray-700'
                                    }>
                                        {texture}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="flex-row space-x-2 mb-4">
                            <View className="flex-1">
                                <Text className="text-base font-medium mb-2 text-gray-800">Bulk Density (g/cm³)</Text>
                                <TextInput
                                    className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                    placeholder="e.g., 1.3"
                                    value={sensorData.bulkDensity}
                                    onChangeText={(text) => setSensorData({...sensorData, bulkDensity: text})}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-medium mb-2 text-gray-800">Porosity (%)</Text>
                                <TextInput
                                    className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                    placeholder="e.g., 45"
                                    value={sensorData.porosity}
                                    onChangeText={(text) => setSensorData({...sensorData, porosity: text})}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View className="mb-4">
                            <Text className="text-base font-medium mb-2 text-gray-800">Electrical Conductivity (dS/m)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="e.g., 0.8"
                                value={sensorData.electricalConductivity}
                                onChangeText={(text) => setSensorData({...sensorData, electricalConductivity: text})}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                )}

                {/* Environmental Factors */}
                <View className="bg-white p-4 rounded-lg mb-6">
                    <Text className="text-lg font-semibold mb-4 text-[#0B4D26]">
                        🌤️ Environmental Factors
                    </Text>
                    
                    <View className="flex-row space-x-2 mb-4">
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Rainfall (mm)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="Monthly avg"
                                value={sensorData.rainfall}
                                onChangeText={(text) => setSensorData({...sensorData, rainfall: text})}
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Humidity (%)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="e.g., 65"
                                value={sensorData.humidity}
                                onChangeText={(text) => setSensorData({...sensorData, humidity: text})}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View className="flex-row space-x-2">
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Wind Speed (km/h)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="e.g., 12"
                                value={sensorData.windSpeed}
                                onChangeText={(text) => setSensorData({...sensorData, windSpeed: text})}
                                keyboardType="numeric"
                            />
                        </View>
                        <View className="flex-1">
                            <Text className="text-base font-medium mb-2 text-gray-800">Solar Radiation (MJ/m²)</Text>
                            <TextInput
                                className="bg-gray-50 p-3 rounded-lg border border-gray-300"
                                placeholder="Daily avg"
                                value={sensorData.solarRadiation}
                                onChangeText={(text) => setSensorData({...sensorData, solarRadiation: text})}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    className="bg-[#0B4D26] py-4 rounded-lg items-center mb-6"
                    onPress={handleSubmit}
                >
                    <Text className="text-white text-lg font-semibold">
                        Analyze Soil & Get Recommendations
                    </Text>
                </TouchableOpacity>

                <Text className="text-gray-500 text-sm text-center mb-4">
                    💡 Tip: More accurate data leads to better crop recommendations
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
} 