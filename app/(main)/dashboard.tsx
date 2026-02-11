import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Image, TouchableOpacity, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSidebar } from '../../context/SidebarContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@/services/api';


export default function Dashboard() {
    const [location, setLocation] = useState('Fetching location...');
    const [district, setDistrict] = useState('Fetching district...');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('Overview');
    const [userData, setUserData] = useState<any>(null);
    const [farmData, setFarmData] = useState<any>(null);
    const [farms, setFarms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [farmModalVisible, setFarmModalVisible] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const { toggleSidebar } = useSidebar();

    const toggleAccordion = (key: string) => {
        setExpandedCard((prev) => (prev === key ? null : key));
    };

    const fetchFarmDetails = async () => {
        try {
            const response = await authApi.getFarms();
            if (response.farms && response.farms.length > 0) {
                setFarms(response.farms);
                // Set the first farm as default or use a stored preference
                const preferredFarmId = await AsyncStorage.getItem('preferredFarmId');
                const selectedFarm = response.farms.find((f: any) => f.id === preferredFarmId) || response.farms[0];
                setFarmData(selectedFarm);
            }
        } catch (error) {
            console.error('Error fetching farm details:', error);
        }
    };

    const switchFarm = async (farm: any) => {
        setFarmData(farm);
        await AsyncStorage.setItem('preferredFarmId', farm.id);
    };

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

    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userJson = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');

                if (!token || !userJson) {
                    router.replace('/signin');
                    return;
                }

                const user = JSON.parse(userJson);

                // Security Check: Verification
                if (!user.isEmailVerified) {
                    router.replace(`/verifyEmail?email=${encodeURIComponent(user.email)}&userId=${user.id}`);
                    return;
                }

                // Security Check: Farm Registration
                const skipFarm = await AsyncStorage.getItem('skipFarm');
                if (!user.hasFarm && !user.farm && skipFarm !== 'true') {
                    router.replace('/RegisterFarm');
                    return;
                }

                setUserData(user);
                // Fetch latest farm details
                fetchFarmDetails();
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();

        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocation('Permission denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const data = await response.json();
            setLocation(`${data.city}, ${data.countryName}`);
            setDistrict(data.locality || 'District unavailable');
        })();

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'Overview':
                return <Text>Overview Content</Text>;
            case 'Soil status':
                return (
                    <View className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                        <Text className="font-semibold text-gray-900 mb-3">Latest Soil Composition</Text>
                        <View className="gap-2">
                            <Row icon="checkmark-circle" iconColor="#22C55E" label="Moisture" value="65%" />
                            <Row icon="checkmark-circle" iconColor="#22C55E" label="pH Level" value="6.8 (neutral)" />
                            <Row icon="warning" iconColor="#EAB308" label="Nutrients" value="moderate (Needs N boost)" />
                            <Row icon="close-circle" iconColor="#EF4444" label="Organic Matter" value="4.5%" />
                            <Row icon="checkmark-circle" iconColor="#22C55E" label="Compaction" value="Low" />
                        </View>
                        <TouchableOpacity onPress={() => router.push('/DataScanned')} className="mt-3">
                            <Text className="text-green-700 font-semibold text-sm">Next Check: Read more →</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'Weather':
                return <Text>Weather Content</Text>;
            case 'Recommend':
                return (
                    <View className="gap-3">
                        <AccordionCard
                            title="Crop Suggestions"
                            expanded={expandedCard === 'recommend-crop'}
                            onPress={() => toggleAccordion('recommend-crop')}
                        >
                            <Text className="text-gray-700 text-sm mb-1">Loamy, rich in nitrogen. Moderate to high moisture.</Text>
                            <Text className="text-gray-700 text-sm mb-1">Warm, humid.</Text>
                            <Text className="font-medium text-gray-900 mt-2">Possible crops: Rice, Maize, Sugarcane</Text>
                        </AccordionCard>
                        <AccordionCard
                            title="Fertilizer Suggestion"
                            expanded={expandedCard === 'recommend-fertilizer'}
                            onPress={() => toggleAccordion('recommend-fertilizer')}
                        >
                            <Text className="text-gray-700 text-sm mb-1">Low Nitrogen (N) – Yellowing leaves, stunted growth.</Text>
                            <Text className="text-gray-700 text-sm mb-1">Nitrogen-rich.</Text>
                            <Text className="font-medium text-gray-900 mt-2">Possible fertilizers: Urea, Ammonium Nitrate, Compost, Manure</Text>
                        </AccordionCard>
                        <TouchableOpacity onPress={() => router.push('/recommends')} className="py-2">
                            <Text className="text-green-700 font-semibold text-sm">See all recommendations →</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'Pest/Disease':
                return (
                    <View className="gap-3">
                        <View className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                            <Text className="font-semibold text-gray-900 mb-2">Pest & Disease</Text>
                            <Text className="text-gray-600 text-sm mb-2">Detect issues early and protect your crops.</Text>
                            <TouchableOpacity onPress={() => router.push('/PestDiseaseRecommendation')}>
                                <Text className="text-green-700 font-semibold text-sm">View recommendations →</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            case 'Irrigation':
                return (
                    <View className="gap-3">
                        <AccordionCard
                            title="Soil Moisture Level"
                            expanded={expandedCard === 'irrigation-moisture'}
                            onPress={() => toggleAccordion('irrigation-moisture')}
                        >
                            <Text className="text-red-600 text-sm font-medium mb-1">Status: Soil moisture is 15% (Too Dry)</Text>
                            <Text className="text-amber-600 text-sm mb-1">Alert: Low moisture detected! Water is needed to prevent plant stress.</Text>
                            <Text className="text-green-700 text-sm">Suggested Action: Irrigate within the next 6 hours to maintain optimal soil moisture.</Text>
                        </AccordionCard>
                        <AccordionCard
                            title="Irrigation Scheduling"
                            expanded={expandedCard === 'irrigation-scheduling'}
                            onPress={() => toggleAccordion('irrigation-scheduling')}
                        >
                            <Text className="text-gray-700 text-sm mb-1">Weather Forecast: High temperature (30°C)</Text>
                            <Text className="text-gray-700 text-sm mb-1">Irrigation Time: Early morning (5–7 AM), Late evening (6–8 PM)</Text>
                        </AccordionCard>
                        <TouchableOpacity onPress={() => router.push('/DataScanned')} className="py-2">
                            <Text className="text-green-700 font-semibold text-sm">View full report →</Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                return null;
        }
    };

    const AccordionCard = ({ title, expanded, onPress, children }: { title: string; expanded: boolean; onPress: () => void; children: React.ReactNode }) => (
        <View className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <TouchableOpacity className="flex-row justify-between items-center p-4" onPress={onPress} activeOpacity={0.8}>
                <Text className="font-semibold text-gray-900">{title}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#666" />
            </TouchableOpacity>
            {expanded && <View className="px-4 pb-4 pt-0">{children}</View>}
        </View>
    );

    const Row = ({ icon, iconColor, label, value }: { icon: string; iconColor: string; label: string; value: string }) => (
        <View className="flex-row items-center justify-between py-1">
            <View className="flex-row items-center flex-1">
                <Ionicons name={icon as any} size={18} color={iconColor} style={{ marginRight: 8 }} />
                <Text className="text-gray-700">{label}:</Text>
            </View>
            <Text className="text-gray-900 font-medium">{value}</Text>
        </View>
    );

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <ScrollView className="flex-1">
                {/* Header */}
                <View className="bg-green-800 py-6 px-4">
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity onPress={toggleSidebar}>
                            <Ionicons name="menu-outline" size={24} color="white" />
                        </TouchableOpacity>
                        <View className="items-center">
                            <TouchableOpacity
                                onPress={() => farms.length > 1 && setFarmModalVisible(true)}
                                className="flex-row items-center"
                                disabled={farms.length <= 1}
                            >
                                <Ionicons name="location-outline" size={20} color="white" style={{ marginRight: 5 }} />
                                <Text className="text-white font-medium">{farmData?.name || location}</Text>
                                {farms.length > 1 && <Ionicons name="chevron-down" size={16} color="white" style={{ marginLeft: 5 }} />}
                            </TouchableOpacity>
                            <Text className="text-white text-xs opacity-80">
                                {farmData ? `${farmData.district}, ${farmData.province || ''}` : 'Welcome, ' + userData?.username}
                            </Text>
                        </View>
                        <View className="flex-row items-center space-x-4">
                            <TouchableOpacity
                                onPress={() => router.push('/RegisterFarm')}
                                className="bg-white/20 p-2 rounded-full mr-2"
                            >
                                <Ionicons name="add" size={20} color="white" />
                            </TouchableOpacity>
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
                            placeholder="Search.."
                            placeholderTextColor="#0B4D26"
                            className="flex-1 ml-2"
                        />
                    </View>
                </View>

                {/* Latest Update */}
                <View className="p-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold">#Latest Update</Text>
                        <TouchableOpacity onPress={() => router.push('/SoilDetection')}>
                            <Text className="text-green-700 font-semibold">See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={(event) => {
                            const slideSize = event.nativeEvent.layoutMeasurement.width;
                            const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
                            setCurrentIndex(index);
                        }}
                        scrollEventThrottle={16}
                    >
                        {carouselItems.map((item, index) => (
                            <View key={index} className="w-64 h-36 mr-2">
                                <Image source={item.image} className="w-full h-full rounded-lg" />
                            </View>
                        ))}
                    </ScrollView>
                    <View className="flex-row justify-center mt-2">
                        {carouselItems.map((_, index) => (
                            <View
                                key={index}
                                className={`w-2 h-2 rounded-full mx-1 ${currentIndex === index ? 'bg-blue-800' : 'bg-gray-400'}`}
                            />
                        ))}
                    </View>
                </View>

                {/* Recommended For You */}
                <View className="p-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold">Recommended For You</Text>
                        <Text className="text-green-700">See all</Text>
                    </View>
                    <ScrollView horizontal className="mt-2">
                        {['Overview', 'Soil status', 'Weather', 'Recommend', 'Irrigation', 'Pest/Disease'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`p-2 rounded-lg mr-2 ${activeTab === tab ? 'bg-green-200' : 'bg-gray-200'}`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Farm A section */}
                <View className="px-4 pb-2 flex-row justify-between items-center">
                    <Text className="text-lg font-bold text-gray-900">{farmData?.name || 'Farm A'}</Text>
                    <TouchableOpacity onPress={() => router.push('/DataScanned')}>
                        <Text className="text-green-700 font-semibold">See All</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View className="p-4">
                    {renderContent()}
                </View>

                {/* Hourly Forecast */}
                <View className="p-4">
                    <Text className="text-lg font-bold">{district}</Text>
                    <Text className="text-sm">Hourly Forecast</Text>
                    <ScrollView horizontal className="mt-2">
                        <View className="flex items-center mr-4">
                            <Ionicons name="sunny-outline" size={24} color="black" />
                            <Text>6:00am</Text>
                            <Text>28°C</Text>
                        </View>
                        <View className="flex items-center mr-4">
                            <Ionicons name="cloud-outline" size={24} color="black" />
                            <Text>6:00am</Text>
                            <Text>28°C</Text>
                        </View>
                        <View className="flex items-center mr-4">
                            <Ionicons name="rainy-outline" size={24} color="black" />
                            <Text>6:00am</Text>
                            <Text>28°C</Text>
                        </View>
                        <View className="flex items-center mr-4">
                            <Ionicons name="partly-sunny-outline" size={24} color="black" />
                            <Text>6:00am</Text>
                            <Text>28°C</Text>
                        </View>
                    </ScrollView>
                </View>

                {/* Yesterday's Weather */}
                <View className="p-4">
                    <View className="bg-white p-4 rounded-lg shadow">
                        <Text className="text-sm">Yesterday</Text>
                        <Text className="text-lg font-bold">Light rain showers</Text>
                        <Text className="text-sm">17° ↑ 10° ↓</Text>
                    </View>
                </View>
            </ScrollView>

            {/* Farm Selection Modal */}
            <Modal
                visible={farmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setFarmModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFarmModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Switch Farm</Text>
                        <ScrollView style={styles.farmList}>
                            {farms.map((farm) => (
                                <TouchableOpacity
                                    key={farm.id}
                                    style={[
                                        styles.farmItem,
                                        farmData?.id === farm.id && styles.activeFarmItem
                                    ]}
                                    onPress={() => {
                                        switchFarm(farm);
                                        setFarmModalVisible(false);
                                    }}
                                >
                                    <View>
                                        <Text style={[
                                            styles.farmName,
                                            farmData?.id === farm.id && styles.activeFarmText
                                        ]}>{farm.name}</Text>
                                        <Text style={styles.farmLocation}>{farm.district}, {farm.province}</Text>
                                    </View>
                                    {farmData?.id === farm.id && (
                                        <Ionicons name="checkmark-circle" size={24} color="#0B4D26" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.addFarmBtn}
                            onPress={() => {
                                setFarmModalVisible(false);
                                router.push('/RegisterFarm');
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#0B4D26" />
                            <Text style={styles.addFarmText}>Register New Farm</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginBottom: 20,
        textAlign: 'center',
    },
    farmList: {
        marginBottom: 10,
    },
    farmItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        marginBottom: 10,
    },
    activeFarmItem: {
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#0B4D26',
    },
    farmName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    activeFarmText: {
        color: '#0B4D26',
    },
    farmLocation: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    activeFarmLocation: {
        color: '#0B4D26',
        opacity: 0.8,
    },
    addFarmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        marginTop: 10,
    },
    addFarmText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#0B4D26',
        fontWeight: '600',
    },
});
