import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Weather() {
    const router = useRouter();

    const weatherData = {
        current: {
            temperature: 28,
            condition: 'Partly Cloudy',
            humidity: 65,
            windSpeed: 12,
            uvIndex: 7
        },
        hourly: [
            { time: '6:00 AM', temp: 22, icon: 'sunny-outline' },
            { time: '9:00 AM', temp: 25, icon: 'sunny-outline' },
            { time: '12:00 PM', temp: 28, icon: 'partly-sunny-outline' },
            { time: '3:00 PM', temp: 30, icon: 'cloudy-outline' },
            { time: '6:00 PM', temp: 27, icon: 'partly-sunny-outline' },
            { time: '9:00 PM', temp: 24, icon: 'moon-outline' }
        ],
        forecast: [
            { day: 'Today', high: 30, low: 22, condition: 'Partly Cloudy' },
            { day: 'Tomorrow', high: 32, low: 24, condition: 'Sunny' },
            { day: 'Wednesday', high: 29, low: 21, condition: 'Light Rain' },
            { day: 'Thursday', high: 31, low: 23, condition: 'Sunny' },
            { day: 'Friday', high: 28, low: 20, condition: 'Cloudy' }
        ]
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FAF9F6]">
            {/* Header */}
            <View className="bg-blue-600 py-10 px-4">
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text className="text-white text-xl font-bold">Weather Forecast</Text>
                    <TouchableOpacity>
                        <Ionicons name="refresh" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 p-4">
                {/* Current Weather */}
                <View className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <Text className="text-2xl font-bold text-gray-800 mb-4">Current Weather</Text>
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <Ionicons name="partly-sunny-outline" size={48} color="#F59E0B" />
                            <View className="ml-4">
                                <Text className="text-4xl font-bold text-gray-800">
                                    {weatherData.current.temperature}°C
                                </Text>
                                <Text className="text-lg text-gray-600">
                                    {weatherData.current.condition}
                                </Text>
                            </View>
                        </View>
                        <View className="items-end">
                            <Text className="text-gray-600">Humidity: {weatherData.current.humidity}%</Text>
                            <Text className="text-gray-600">Wind: {weatherData.current.windSpeed} km/h</Text>
                            <Text className="text-gray-600">UV Index: {weatherData.current.uvIndex}</Text>
                        </View>
                    </View>
                </View>

                {/* Hourly Forecast */}
                <View className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <Text className="text-xl font-bold text-gray-800 mb-4">Hourly Forecast</Text>
                    <View className="flex-row justify-between">
                        {weatherData.hourly.map((hour, index) => (
                            <View key={index} className="items-center">
                                <Text className="text-gray-600 text-sm mb-2">{hour.time}</Text>
                                <Ionicons name={hour.icon} size={24} color="#F59E0B" />
                                <Text className="text-gray-800 font-semibold mt-2">{hour.temp}°</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 5-Day Forecast */}
                <View className="bg-white p-6 rounded-xl shadow-lg mb-6">
                    <Text className="text-xl font-bold text-gray-800 mb-4">5-Day Forecast</Text>
                    {weatherData.forecast.map((day, index) => (
                        <View key={index} className="flex-row items-center justify-between py-3 border-b border-gray-100">
                            <Text className="text-gray-800 font-medium">{day.day}</Text>
                            <Text className="text-gray-600">{day.condition}</Text>
                            <View className="flex-row items-center">
                                <Text className="text-gray-800 font-semibold mr-2">{day.high}°</Text>
                                <Text className="text-gray-500">{day.low}°</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Weather Tips */}
                <View className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <Text className="text-blue-800 font-bold text-lg mb-3">🌱 Farming Weather Tips</Text>
                    <View className="space-y-2">
                        <Text className="text-blue-700 text-sm">
                            • Today is ideal for soil preparation and planting
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • Consider irrigation needs with current humidity levels
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • UV index is high - protect young plants from sunburn
                        </Text>
                        <Text className="text-blue-700 text-sm">
                            • Light rain expected Wednesday - perfect for seed germination
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
} 