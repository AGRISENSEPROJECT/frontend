import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SoilAnalysisLoading from './components/SoilAnalysisLoading';

export default function SoilDetection() {
    const router = useRouter();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const handleImageUpload = () => {
        // For demo purposes, simulate image selection
        Alert.alert(
            'Image Upload',
            'Image selected successfully! Now analyzing soil...',
            [
                {
                    text: 'OK',
                    onPress: () => {
                        setIsAnalyzing(true);
                    }
                }
            ]
        );
    };

    const handleRealTimeScan = () => {
        // Navigate to camera for real-time scanning
        router.push('/camera-demo');
    };

    const handleAnalysisComplete = () => {
        // Navigate to crop recommendations
        router.push('/CropRecommendation');
    };

    if (isAnalyzing) {
        return (
            <SoilAnalysisLoading 
                method="camera" 
                onComplete={handleAnalysisComplete} 
            />
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F5F5DC]">
            {/* Header */}
            <View className="bg-[#0B4D26] py-10 px-4">
                <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold ml-4">Soil Analysis</Text>
                </View>
            </View>

            <View className="flex-1 p-6">
                {/* Main Content */}
                <View className="flex-1 justify-center">
                    {/* Image Container */}
                    <View className="w-full aspect-[3/4] mb-8 overflow-hidden rounded-xl">
                        <Image
                            source={require('../assets/soil-detection-image.png')}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>

                    {/* Text Content */}
                    <View className="w-full items-center px-4 mb-8">
                        <Text className="text-3xl font-bold mb-4 text-center text-[#0B4D26]">
                            Choose Your Analysis Method
                        </Text>
                        <Text className="text-gray-700 text-lg text-center leading-6">
                            Analyze your soil using either an uploaded image or real-time camera scanning
                        </Text>
                    </View>

                    {/* Scanning Options */}
                    <View className="space-y-4">
                        {/* Option 1: Upload Image */}
                        <TouchableOpacity
                            className="bg-white p-6 rounded-xl shadow-lg border border-gray-200"
                            onPress={handleImageUpload}
                        >
                            <View className="flex-row items-center">
                                <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="image" size={32} color="#2563EB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-gray-800 mb-2">
                                        Upload & Scan Image
                                    </Text>
                                    <Text className="text-gray-600 leading-5">
                                        Upload an existing photo of your soil for analysis
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>

                        {/* Option 2: Real-time Camera */}
                        <TouchableOpacity
                            className="bg-white p-6 rounded-xl shadow-lg border border-gray-200"
                            onPress={handleRealTimeScan}
                        >
                            <View className="flex-row items-center">
                                <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mr-4">
                                    <Ionicons name="camera" size={32} color="#059669" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-gray-800 mb-2">
                                        Real-time Camera Scan
                                    </Text>
                                    <Text className="text-gray-600 leading-5">
                                        Open camera to scan soil directly in real-time
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Info Section */}
                    <View className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-6">
                        <Text className="text-blue-800 font-semibold mb-2">💡 Analysis Process:</Text>
                        <Text className="text-blue-700 text-sm leading-5">
                            • Upload an image or use real-time camera scanning{'\n'}
                            • AI analyzes soil composition, texture, and properties{'\n'}
                            • Get detailed crop recommendations based on results{'\n'}
                            • Receive farming tips and soil improvement suggestions
                        </Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}
