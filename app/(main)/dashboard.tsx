import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Image, TouchableOpacity, ActivityIndicator, Modal, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSidebar } from '../../context/SidebarContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, predictionsApi } from '@/services/api';
import PayloadRows, { formatValue, humanize } from '@/components/recommendations/PayloadRows';

const TABS = ['Overview', 'Soil status', 'Weather', 'Recommend', 'Irrigation', 'Pest/Disease'];

const carouselItems = [
    { image: require('../../assets/latest-update.png'), title: 'Get to know your soil' },
    { image: require('../../assets/latest-update.png'), title: 'Smart crop suggestions' },
    { image: require('../../assets/latest-update.png'), title: 'Weather-aware farming' },
];

export default function Dashboard() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeTab, setActiveTab] = useState('Overview');
    const [userData, setUserData] = useState<any>(null);
    const [farmData, setFarmData] = useState<any>(null);
    const [farms, setFarms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [farmModalVisible, setFarmModalVisible] = useState(false);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [latestRun, setLatestRun] = useState<any>(null);
    const [loadingRun, setLoadingRun] = useState(false);
    const { toggleSidebar } = useSidebar();

    const toggleAccordion = (key: string) => {
        setExpandedCard((prev) => (prev === key ? null : key));
    };

    const fetchLatestRun = useCallback(async (farmId: string) => {
        setLoadingRun(true);
        try {
            const response = await predictionsApi.getRuns({ farmId, limit: 5 });
            const runs = response.items || response.runs || [];
            const successRun = runs.find((run: any) => run.status === 'success') || null;
            setLatestRun(successRun);
        } catch (error) {
            console.error('Error fetching latest run:', error);
            setLatestRun(null);
        } finally {
            setLoadingRun(false);
        }
    }, []);

    const fetchFarmDetails = useCallback(async () => {
        try {
            const response = await authApi.getFarms();
            if (response.farms && response.farms.length > 0) {
                setFarms(response.farms);
                const preferredFarmId = await AsyncStorage.getItem('preferredFarmId');
                const selectedFarm = response.farms.find((f: any) => f.id === preferredFarmId) || response.farms[0];
                setFarmData(selectedFarm);
                fetchLatestRun(selectedFarm.id);
            }
        } catch (error) {
            console.error('Error fetching farm details:', error);
        }
    }, [fetchLatestRun]);

    const switchFarm = async (farm: any) => {
        setFarmData(farm);
        await AsyncStorage.setItem('preferredFarmId', farm.id);
        fetchLatestRun(farm.id);
    };

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

                if (!user.isEmailVerified) {
                    router.replace(`/verifyEmail?email=${encodeURIComponent(user.email)}&userId=${user.id}`);
                    return;
                }

                const skipFarm = await AsyncStorage.getItem('skipFarm');
                if (!user.hasFarm && !user.farm && skipFarm !== 'true') {
                    router.replace('/RegisterFarm');
                    return;
                }

                setUserData(user);
                fetchFarmDetails();
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchFarmDetails]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFarmDetails();
        setRefreshing(false);
    };

    const recommendations: any[] = latestRun?.recommendations || [];
    const recsOfType = (type: string) => recommendations.filter(rec => rec.type === type);
    const summary = latestRun?.predictionSummary || {};
    const soilScan = latestRun?.soilScan || null;

    const EmptyRecommendations = () => (
        <View className="bg-white rounded-xl p-6 border border-gray-200/80 shadow-sm items-center">
            <View className="w-14 h-14 rounded-full bg-[#E8F5E9] items-center justify-center">
                <Ionicons name="flask-outline" size={26} color="#0B4D26" />
            </View>
            <Text className="text-gray-900 font-bold text-base mt-3">No recommendations yet</Text>
            <Text className="text-gray-500 text-sm text-center mt-1 leading-5">
                Run a soil analysis to get crop, fertilizer and irrigation advice for your farm.
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/recommends')}
                className="bg-[#0B4D26] rounded-lg px-6 py-3 mt-4"
            >
                <Text className="text-white font-bold">Get Recommendations</Text>
            </TouchableOpacity>
        </View>
    );

    const RecommendationAccordions = ({ recs, keyPrefix }: { recs: any[]; keyPrefix: string }) => (
        <View className="gap-3">
            {recs.map((rec, index) => (
                <AccordionCard
                    key={`${keyPrefix}-${index}`}
                    title={rec.title}
                    expanded={expandedCard === `${keyPrefix}-${index}`}
                    onPress={() => toggleAccordion(`${keyPrefix}-${index}`)}
                >
                    <PayloadRows payload={rec.payload} />
                </AccordionCard>
            ))}
            <TouchableOpacity onPress={() => router.push('/recommends')} className="py-2">
                <Text className="text-green-700 font-semibold text-sm">See all recommendations →</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        if (loadingRun) {
            return (
                <View className="bg-white rounded-xl p-8 border border-gray-200/80 items-center">
                    <ActivityIndicator color="#0B4D26" />
                </View>
            );
        }

        if (!latestRun) {
            return <EmptyRecommendations />;
        }

        switch (activeTab) {
            case 'Overview':
                return (
                    <View className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                        <Text className="font-semibold text-gray-900 mb-3">Latest Analysis</Text>
                        <View className="gap-2">
                            {summary.bestCrop && <Row icon="leaf" iconColor="#22C55E" label="Best Crop" value={String(summary.bestCrop)} />}
                            {summary.confidence != null && (
                                <Row icon="analytics" iconColor="#22C55E" label="Confidence"
                                    value={`${Math.round(Number(summary.confidence) * (Number(summary.confidence) <= 1 ? 100 : 1))}%`} />
                            )}
                            {summary.soilTexture && <Row icon="layers" iconColor="#A16207" label="Soil Texture" value={String(summary.soilTexture)} />}
                            {summary.soilMoisture != null && <Row icon="water" iconColor="#3B82F6" label="Soil Moisture" value={formatValue(summary.soilMoisture)} />}
                            {summary.fertilizer && <Row icon="nutrition" iconColor="#EAB308" label="Fertilizer" value={String(summary.fertilizer)} />}
                            {latestRun.executedAt && (
                                <Row icon="time" iconColor="#6B7280" label="Analyzed"
                                    value={new Date(latestRun.executedAt).toLocaleDateString()} />
                            )}
                        </View>
                        <TouchableOpacity onPress={() => router.push('/recommends')} className="mt-3">
                            <Text className="text-green-700 font-semibold text-sm">See all recommendations →</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'Soil status':
                return (
                    <View className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm">
                        <Text className="font-semibold text-gray-900 mb-3">Latest Soil Composition</Text>
                        {soilScan ? (
                            <View className="gap-1">
                                {Object.entries(soilScan)
                                    .filter(([key, value]) =>
                                        value != null && value !== '' &&
                                        !['id', 'farmId', 'imageUrl', 'createdAt', 'updatedAt'].includes(key) &&
                                        typeof value !== 'object')
                                    .map(([key, value]) => (
                                        <View key={key} className="flex-row justify-between py-1">
                                            <Text className="text-gray-700">{humanize(key)}</Text>
                                            <Text className="text-gray-900 font-medium">{formatValue(value)}</Text>
                                        </View>
                                    ))}
                            </View>
                        ) : (
                            <Text className="text-gray-500 text-sm">No soil scan data in the latest analysis.</Text>
                        )}
                    </View>
                );
            case 'Weather': {
                const recs = recsOfType('weather');
                return recs.length > 0
                    ? <RecommendationAccordions recs={recs} keyPrefix="weather" />
                    : <NoTabData label="weather" />;
            }
            case 'Recommend': {
                const recs = [...recsOfType('crop'), ...recsOfType('fertilizer'), ...recsOfType('general')];
                return recs.length > 0
                    ? <RecommendationAccordions recs={recs} keyPrefix="recommend" />
                    : <NoTabData label="crop and fertilizer" />;
            }
            case 'Irrigation': {
                const recs = recsOfType('irrigation');
                return recs.length > 0
                    ? <RecommendationAccordions recs={recs} keyPrefix="irrigation" />
                    : <NoTabData label="irrigation" />;
            }
            case 'Pest/Disease': {
                const recs = recsOfType('disease');
                return recs.length > 0 ? (
                    <View>
                        <RecommendationAccordions recs={recs} keyPrefix="disease" />
                        <Text className="text-gray-400 text-xs mt-2 text-center">Informational only — satellite data coming soon</Text>
                    </View>
                ) : <NoTabData label="pest & disease" />;
            }
            default:
                return null;
        }
    };

    const NoTabData = ({ label }: { label: string }) => (
        <View className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm items-center">
            <Text className="text-gray-500 text-sm text-center">
                No {label} recommendations in your latest analysis.
            </Text>
            <TouchableOpacity onPress={() => router.push('/recommends')} className="mt-2">
                <Text className="text-green-700 font-semibold text-sm">Run a new analysis →</Text>
            </TouchableOpacity>
        </View>
    );

    const AccordionCard = ({ title, expanded, onPress, children }: { title: string; expanded: boolean; onPress: () => void; children: React.ReactNode }) => (
        <View className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <TouchableOpacity className="flex-row justify-between items-center p-4" onPress={onPress} activeOpacity={0.8}>
                <Text className="font-semibold text-gray-900 capitalize flex-1">{title}</Text>
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
            <Text className="text-gray-900 font-medium capitalize">{value}</Text>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-[#FAF9F6]">
                <ActivityIndicator size="large" color="#0B4D26" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B4D26']} />}
            >
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
                                <Text className="text-white font-medium">{farmData?.name || 'My Farm'}</Text>
                                {farms.length > 1 && <Ionicons name="chevron-down" size={16} color="white" style={{ marginLeft: 5 }} />}
                            </TouchableOpacity>
                            <Text className="text-white text-xs opacity-80">
                                {farmData ? `${farmData.district}${farmData.province ? `, ${farmData.province}` : ''}` : `Welcome, ${userData?.username || ''}`}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => router.push('/RegisterFarm')}
                                className="bg-white/20 p-2 rounded-full mr-2"
                            >
                                <Ionicons name="add" size={20} color="white" />
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
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
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
                        className="mt-2"
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
                <View className="px-4">
                    <View className="flex-row justify-between items-center">
                        <Text className="text-lg font-bold">Recommended For You</Text>
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text className="text-green-700">See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                        {TABS.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                className={`p-2 px-3 rounded-lg mr-2 ${activeTab === tab ? 'bg-green-200' : 'bg-gray-200'}`}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text className={activeTab === tab ? 'font-semibold text-green-900' : 'text-gray-700'}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Farm section */}
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <Text className="text-lg font-bold text-gray-900">{farmData?.name || 'My Farm'}</Text>
                    <TouchableOpacity onPress={() => router.push('/recommends')}>
                        <Text className="text-green-700 font-semibold">See All</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View className="px-4 pb-8">
                    {renderContent()}
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
