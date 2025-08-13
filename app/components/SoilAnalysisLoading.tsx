import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SoilAnalysisLoadingProps {
    method: 'camera' | 'sensor';
    onComplete: () => void;
}

const { width } = Dimensions.get('window');

export default function SoilAnalysisLoading({ method, onComplete }: SoilAnalysisLoadingProps) {
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Scanner line animation
        const scanAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanLineAnim, {
                    toValue: width - 60,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(scanLineAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        );

        scanAnimation.start();

        // Simulate analysis completion after 5 seconds
        const timer = setTimeout(() => {
            onComplete();
        }, 5000);

        return () => {
            scanAnimation.stop();
            clearTimeout(timer);
        };
    }, []);

    const getMethodIcon = () => {
        return method === 'camera' ? 'camera' : 'analytics';
    };

    const getMethodTitle = () => {
        return method === 'camera' ? 'Image Analysis' : 'Sensor Data Analysis';
    };

    const getMethodDescription = () => {
        return method === 'camera' 
            ? 'Analyzing soil composition from image...' 
            : 'Processing sensor readings...';
    };

    return (
        <View className="flex-1 bg-[#0B4D26] justify-center items-center p-6">
            <Animated.View 
                className="flex-1 justify-center items-center"
                style={{ opacity: fadeAnim }}
            >
                {/* Scanner Container */}
                <View className="bg-white p-8 rounded-2xl shadow-2xl mb-8 w-80">
                    {/* Scanner Frame */}
                    <View className="border-4 border-[#0B4D26] rounded-lg p-4 mb-6">
                        <View className="w-64 h-48 bg-gray-100 rounded relative overflow-hidden">
                            {/* Sample Image Placeholder */}
                            <View className="absolute inset-0 bg-gradient-to-br from-yellow-200 to-brown-200 items-center justify-center">
                                <Ionicons name="image" size={48} color="#8B4513" />
                                <Text className="text-brown-800 mt-2 font-medium">Soil Sample</Text>
                            </View>
                            
                            {/* Scanning Line */}
                            <Animated.View
                                className="absolute w-full h-1 bg-green-400"
                                style={{
                                    transform: [{ translateX: scanLineAnim }],
                                    left: -width + 60,
                                }}
                            />
                            
                            {/* Corner Indicators */}
                            <View className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-green-400" />
                            <View className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-green-400" />
                            <View className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-green-400" />
                            <View className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-green-400" />
                        </View>
                    </View>

                    {/* Analysis Status */}
                    <View className="items-center">
                        <View className="w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4">
                            <Ionicons name={getMethodIcon()} size={32} color="#0B4D26" />
                        </View>
                        <Text className="text-2xl font-bold text-[#0B4D26] mb-2">
                            {getMethodTitle()}
                        </Text>
                        <Text className="text-gray-600 text-center leading-5">
                            {getMethodDescription()}
                        </Text>
                    </View>
                </View>

                {/* Progress Steps */}
                <View className="bg-white/10 backdrop-blur-sm rounded-xl p-6 w-80">
                    <Text className="text-white text-lg font-semibold mb-4 text-center">
                        Analysis Progress
                    </Text>
                    
                    <View className="space-y-3">
                        {[
                            'Initializing scanner...',
                            'Detecting soil texture...',
                            'Analyzing color composition...',
                            'Identifying nutrient patterns...',
                            'Generating recommendations...'
                        ].map((step, index) => (
                            <View key={index} className="flex-row items-center">
                                <View className="w-6 h-6 bg-green-400 rounded-full items-center justify-center mr-3">
                                    <Ionicons name="checkmark" size={16} color="white" />
                                </View>
                                <Text className="text-white flex-1">{step}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Loading Indicator */}
                <View className="mt-6">
                    <View className="flex-row space-x-2">
                        {[0, 1, 2].map((i) => (
                            <View
                                key={i}
                                className="w-3 h-3 bg-white rounded-full animate-pulse"
                                style={{
                                    animationDelay: `${i * 0.2}s`,
                                }}
                            />
                        ))}
                    </View>
                </View>
            </Animated.View>
        </View>
    );
} 