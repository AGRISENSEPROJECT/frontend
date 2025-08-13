import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function MethodSelection() {
    const router = useRouter();
    const [isSensorEnabled, setIsSensorEnabled] = useState(false);
    const [isCameraEnabled, setIsCameraEnabled] = useState(false);

    const toggleSensorSwitch = () => {
        if (!isSensorEnabled) {
            setIsSensorEnabled(true);
            setIsCameraEnabled(false);
        }
    };

    const toggleCameraSwitch = () => {
        if (!isCameraEnabled) {
            setIsCameraEnabled(true);
            setIsSensorEnabled(false);
        }
    };

    const handleNext = () => {
        if (isSensorEnabled) {
            router.push('/components/EnhancedDataEntryForm');
        } else if (isCameraEnabled) {
            router.push('/(main)/camera');
        }
    };

    const isNextDisabled = !isSensorEnabled && !isCameraEnabled;

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5DC] px-6 py-4 items-center">
            <View className='px-4 py-5 flex-1'>
            <View className="flex-row items-center mb-6">
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text className="text-lg font-bold ml-4">Choose Analysis Method</Text>
            </View>

            <Text className="text-base mb-6 text-gray-800 text-center">
                Select how you want to analyze your soil for crop recommendations
            </Text>

            {/* Camera Method */}
            <View className="bg-white p-6 mb-6 rounded-xl shadow-md border border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <View className="bg-blue-100 p-3 rounded-full mr-4">
                            <Ionicons name="camera" size={24} color="#0B4D26" />
                        </View>
                        <View>
                            <Text className="font-bold text-gray-900 text-lg">Camera Analysis</Text>
                            <Text className="text-gray-600 text-sm">AI-powered soil analysis</Text>
                        </View>
                    </View>
                    <Switch
                        trackColor={{ false: "#767577", true: "#0B4D26" }}
                        thumbColor={isCameraEnabled ? "#fff" : "#f4f3f4"}
                        onValueChange={toggleCameraSwitch}
                        value={isCameraEnabled}
                    />
                </View>
                {isCameraEnabled && (
                    <View className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <Text className="text-green-800 font-medium mb-2">✓ Camera Method Selected</Text>
                        <Text className="text-green-700 text-sm">
                            Take a photo of your soil and get instant analysis using our AI technology. 
                            Perfect for quick assessments and visual soil type identification.
                        </Text>
                    </View>
                )}
                {!isCameraEnabled && (
                    <Text className="text-gray-700 text-sm">
                        Capture an image of your soil, and our AI will analyze its texture, color, 
                        and visual characteristics to provide crop recommendations.
                    </Text>
                )}
            </View>

            {/* Sensor Method */}
            <View className="bg-white p-6 mb-6 rounded-xl shadow-md border border-gray-100">
                <View className="flex-row justify-between items-center mb-4">
                    <View className="flex-row items-center">
                        <View className="bg-green-100 p-3 rounded-full mr-4">
                            <Ionicons name="analytics" size={24} color="#0B4D26" />
                        </View>
                        <View>
                            <Text className="font-bold text-gray-900 text-lg">Sensor Data</Text>
                            <Text className="text-gray-600 text-sm">Manual data entry</Text>
                        </View>
                    </View>
                    <Switch
                        trackColor={{ false: "#767577", true: "#0B4D26" }}
                        thumbColor={isSensorEnabled ? "#fff" : "#f4f3f4"}
                        onValueChange={toggleSensorSwitch}
                        value={isSensorEnabled}
                    />
                </View>
                {isSensorEnabled && (
                    <View className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <Text className="text-green-800 font-medium mb-2">✓ Sensor Method Selected</Text>
                        <Text className="text-green-700 text-sm">
                            Enter your soil sensor readings manually for precise analysis. 
                            Ideal for users with existing soil monitoring equipment.
                        </Text>
                    </View>
                )}
                {!isSensorEnabled && (
                    <Text className="text-gray-700 text-sm">
                        Use a connected soil sensor or enter readings manually to get real-time data 
                        on moisture, nutrients, pH levels, and other soil properties.
                    </Text>
                )}
            </View>

            {/* Comparison */}
            <View className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
                <Text className="text-blue-800 font-semibold mb-2">💡 Method Comparison</Text>
                <Text className="text-blue-700 text-sm">
                    <Text className="font-semibold">Camera:</Text> Quick, visual analysis • 
                    <Text className="font-semibold"> Sensor:</Text> Precise, detailed measurements
                </Text>
            </View>

            <TouchableOpacity 
                className={`py-4 rounded-xl items-center mt-auto ${
                    isNextDisabled 
                        ? 'bg-gray-300' 
                        : 'bg-[#0B4D26]'
                }`} 
                onPress={handleNext}
                disabled={isNextDisabled}
            >
                <Text className={`text-lg font-medium ${
                    isNextDisabled ? 'text-gray-500' : 'text-white'
                }`}>
                    {isNextDisabled ? 'Select a Method' : 'Continue to Analysis'}
                </Text>
            </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
