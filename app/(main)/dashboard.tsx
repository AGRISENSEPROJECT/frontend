import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Geolocation from 'react-native-geolocation-service';
import { useSidebar } from '../context/SidebarContext';
import { router } from 'expo-router';
import DashboardSidebar from '../components/DashboardSidebar';

export default function Dashboard() {
    const [location, setLocation] = useState('Fetching location...');
    const [district, setDistrict] = useState('Fetching district...');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('Overview');
    const { toggleSidebar, isSidebarOpen } = useSidebar();

    useEffect(() => {
        Geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                const data = await response.json();
                setLocation(`${data.city}, ${data.countryName}`);
                setDistrict(data.locality || 'District unavailable');
            },
            (error) => {
                console.error(error);
                setLocation('Location unavailable');
                setDistrict('District unavailable');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const carouselItems = [
        { image: require('../../assets/latest-update.png'), title: 'Get to know your soil' },
        { image: require('../../assets/latest-update.png'), title: 'More updates' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 1' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 2' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 1' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 2' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 1' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 2' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 1' },
        { image: require('../../assets/latest-update.png'), title: 'Additional update 2' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <Text>Overview Content</Text>;
            case 'Soil status':
                return <Text>Soil Status Content</Text>;
            case 'Weather':
                return <Text>Weather Content</Text>;
            case 'Recommend':
                return <Text>Recommend Content</Text>;
            case 'Irrigation':
                return <Text>Irrigation Content</Text>;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#FAF9F6]">
            {/* Header */}
            <View className="bg-green-800 py-10 px-4">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity onPress={toggleSidebar}>
                        <Ionicons name="menu-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <View>
                        <View className="flex-row items-center">
                            <Ionicons name="location-outline" size={20} color="white" style={{ marginRight: 5 }} />
                            <Text className="text-white">{location}</Text>
                        </View>
                    </View>
                    <View className="flex-row items-center space-x-4">
                        <TouchableOpacity
                            onPress={() => router.push('/(main)/camera')}
                            className="bg-white/20 p-2 rounded-full"
                        >
                            <Ionicons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                        <Ionicons name="notifications-outline" size={24} color="white" />
                    </View>
                </View>

                {/* Search Bar */}
                <View className="flex-row items-center mt-10 bg-white p-2 rounded-lg">
                    <Ionicons name="search-outline" size={20} color="#0B4D26" />
                    <TextInput
                        placeholder="Search for crops, soil types..."
                        className="flex-1 ml-2"
                    />
                </View>
            </View>

            {/* Main Content */}
            <View className="flex-1">
                {/* Welcome Section */}
                <View className="p-4">
                    <View className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                        <Text className="text-2xl font-bold text-[#0B4D26] mb-2">
                            Welcome back! 👋
                        </Text>
                        <Text className="text-gray-600 mb-4">
                            Ready to analyze your soil and get crop recommendations?
                        </Text>
                        
                        <View className="flex-row space-x-3">
                            <TouchableOpacity
                                className="flex-1 bg-blue-600 p-4 rounded-lg items-center"
                                onPress={() => router.push('/SoilDetection')}
                            >
                                <Ionicons name="camera" size={24} color="white" />
                                <Text className="text-white font-semibold mt-2">Scan Soil</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                className="flex-1 bg-green-600 p-4 rounded-lg items-center"
                                onPress={() => router.push('/MethodSelection')}
                            >
                                <Ionicons name="analytics" size={24} color="white" />
                                <Text className="text-white font-semibold mt-2">Input Data</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Latest Update */}
                <View className="p-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold">#Latest Update</Text>
                        <Text className="text-green-700">See all</Text>
                    </View>
                    <View className="bg-white p-4 rounded-lg shadow-md">
                        <Image 
                            source={carouselItems[currentIndex].image} 
                            className="w-full h-32 rounded-lg mb-3"
                            resizeMode="cover"
                        />
                        <Text className="text-lg font-semibold text-center">
                            {carouselItems[currentIndex].title}
                        </Text>
                    </View>
                </View>

                {/* Recommended For You */}
                <View className="p-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold">Recommended For You</Text>
                        <Text className="text-green-700">See all</Text>
                    </View>
                    <View className="flex-row space-x-2 mt-2">
                        {['Overview', 'Soil status', 'Weather', 'Recommend', 'Irrigation'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`p-2 rounded-lg ${activeTab === tab ? 'bg-green-200' : 'bg-gray-200'}`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Tab Content */}
                <View className="p-4">
                    {renderContent()}
                </View>

                {/* Weather Section */}
                <View className="p-4">
                    <Text className="text-lg font-bold mb-2">{district}</Text>
                    <Text className="text-sm text-gray-600 mb-3">Current Weather</Text>
                    <View className="bg-white p-4 rounded-lg shadow-md">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Ionicons name="sunny-outline" size={32} color="#F59E0B" />
                                <View className="ml-3">
                                    <Text className="text-2xl font-bold">28°C</Text>
                                    <Text className="text-gray-600">Partly Cloudy</Text>
                                </View>
                            </View>
                            <View className="items-end">
                                <Text className="text-gray-600">Humidity: 65%</Text>
                                <Text className="text-gray-600">Wind: 12 km/h</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Sidebar */}
            <DashboardSidebar isOpen={isSidebarOpen} onClose={() => toggleSidebar()} />
        </SafeAreaView>
    );
}
