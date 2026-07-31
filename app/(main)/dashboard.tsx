import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSidebar } from '../../context/SidebarContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, predictionsApi, Recommendation } from '@/services/api';

const TYPE_META: Record<string, { title: string; icon: any }> = {
    crop: { title: 'Crop', icon: 'leaf' },
    fertilizer: { title: 'Fertilizer', icon: 'nutrition' },
    irrigation: { title: 'Irrigation', icon: 'water' },
    disease: { title: 'Pest & Disease', icon: 'bug' },
    weather: { title: 'Weather', icon: 'rainy' },
    general: { title: 'General', icon: 'information-circle' },
};

export default function Dashboard() {
    const [userData, setUserData] = useState<any>(null);
    const [farmData, setFarmData] = useState<any>(null);
    const [farms, setFarms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [farmModalVisible, setFarmModalVisible] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const { toggleSidebar } = useSidebar();

    const fetchRecommendations = useCallback(async (farmId: string) => {
        setLoadingRecs(true);
        try {
            const response = await predictionsApi.getRecommendations({ farmId, limit: 10 });
            setRecommendations(response.items || []);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            setRecommendations([]);
        } finally {
            setLoadingRecs(false);
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
                fetchRecommendations(selectedFarm.id);
            }
        } catch (error) {
            console.error('Error fetching farm details:', error);
        }
    }, [fetchRecommendations]);

    const switchFarm = async (farm: any) => {
        setFarmData(farm);
        await AsyncStorage.setItem('preferredFarmId', farm.id);
        fetchRecommendations(farm.id);
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
    }, [fetchFarmDetails]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchFarmDetails();
        setRefreshing(false);
    };

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const primary = recommendations.find(r => r.isPrimary && r.type === 'crop');
    const latestByType = Object.keys(TYPE_META)
        .map(type => recommendations.find(r => r.type === type && !(r.isPrimary && r.type === 'crop')))
        .filter(Boolean) as Recommendation[];

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
                <View className="bg-[#0B4D26] pt-6 pb-8 px-5 rounded-b-3xl">
                    <View className="flex-row justify-between items-center">
                        <TouchableOpacity onPress={toggleSidebar} className="p-1">
                            <Ionicons name="menu-outline" size={26} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => farms.length > 1 && setFarmModalVisible(true)}
                            className="flex-row items-center"
                            disabled={farms.length <= 1}
                        >
                            <Ionicons name="location-outline" size={18} color="white" style={{ marginRight: 4 }} />
                            <Text className="text-white font-semibold">{farmData?.name || 'My Farm'}</Text>
                            {farms.length > 1 && <Ionicons name="chevron-down" size={16} color="white" style={{ marginLeft: 4 }} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/RegisterFarm')} className="bg-white/20 p-2 rounded-full">
                            <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text className="text-white/70 text-sm mt-6">{greeting()},</Text>
                    <Text className="text-white text-2xl font-bold">{userData?.username || 'Farmer'} 👋</Text>
                    {farmData && (
                        <Text className="text-white/70 text-xs mt-1">
                            {farmData.district}{farmData.province ? `, ${farmData.province}` : ''}
                        </Text>
                    )}
                </View>

                {/* Quick actions */}
                <View className="flex-row px-5 -mt-5 gap-3">
                    <QuickAction icon="flask" label="New Analysis" onPress={() => router.push('/NewRecommendation')} highlight />
                    <QuickAction icon="star" label="Recommends" onPress={() => router.push('/recommends')} />
                    <QuickAction icon="cloudy" label="Weather" onPress={() => router.push('/(main)/weather')} />
                    <QuickAction icon="people" label="Community" onPress={() => router.push('/(main)/community')} />
                </View>

                {/* Recommendations section */}
                <View className="px-5 mt-6">
                    <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-lg font-bold text-gray-900">Your Recommendations</Text>
                        {recommendations.length > 0 && (
                            <TouchableOpacity onPress={() => router.push('/recommends')}>
                                <Text className="text-[#0B4D26] font-semibold text-sm">See all →</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {loadingRecs ? (
                        <View className="bg-white rounded-2xl border border-gray-200/80 p-8 items-center">
                            <ActivityIndicator color="#0B4D26" />
                        </View>
                    ) : recommendations.length === 0 ? (
                        /* Empty state: no recommendations yet */
                        <View className="bg-white rounded-2xl border border-gray-200/80 p-6 items-center">
                            <View className="w-16 h-16 rounded-full bg-[#E8F5E9] items-center justify-center">
                                <Ionicons name="flask-outline" size={30} color="#0B4D26" />
                            </View>
                            <Text className="text-gray-900 font-bold text-base mt-4">No recommendations yet</Text>
                            <Text className="text-gray-500 text-sm text-center mt-1 leading-5">
                                Run a soil analysis to get crop, fertilizer and irrigation advice for your farm.
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/NewRecommendation')}
                                className="bg-[#0B4D26] rounded-xl px-6 py-3 mt-4 flex-row items-center"
                            >
                                <Ionicons name="add" size={18} color="white" />
                                <Text className="text-white font-bold ml-1">Get Recommendations</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View className="gap-3">
                            {/* Primary crop card */}
                            {primary && (
                                <TouchableOpacity
                                    onPress={() => router.push('/recommends')}
                                    className="bg-[#0B4D26] rounded-2xl p-5"
                                    activeOpacity={0.9}
                                >
                                    <Text className="text-white/70 text-xs font-semibold uppercase">Best Crop Match</Text>
                                    <Text className="text-white text-2xl font-bold mt-1 capitalize">{primary.title}</Text>
                                    {primary.payload?.confidence != null && (
                                        <Text className="text-emerald-200 text-sm font-semibold mt-0.5">
                                            {Math.round(Number(primary.payload.confidence) * (Number(primary.payload.confidence) <= 1 ? 100 : 1))}% confidence
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            )}

                            {/* One card per recommendation type */}
                            {latestByType.map(rec => {
                                const meta = TYPE_META[rec.type] || TYPE_META.general;
                                return (
                                    <TouchableOpacity
                                        key={rec.id}
                                        onPress={() => router.push('/recommends')}
                                        className="bg-white rounded-2xl border border-gray-200/80 p-4 flex-row items-center"
                                        activeOpacity={0.85}
                                    >
                                        <View className="w-10 h-10 rounded-full bg-[#E8F5E9] items-center justify-center">
                                            <Ionicons name={meta.icon} size={20} color="#0B4D26" />
                                        </View>
                                        <View className="flex-1 ml-3">
                                            <Text className="text-gray-500 text-xs">{meta.title}</Text>
                                            <Text className="text-gray-900 font-semibold capitalize" numberOfLines={1}>{rec.title}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Farm info */}
                {farmData && (
                    <View className="px-5 mt-6 mb-8">
                        <Text className="text-lg font-bold text-gray-900 mb-3">Farm Details</Text>
                        <View className="bg-white rounded-2xl border border-gray-200/80 p-4 gap-2">
                            <InfoRow icon="resize-outline" label="Size" value={farmData.size ? `${farmData.size} ha` : '—'} />
                            <InfoRow icon="layers-outline" label="Soil type" value={farmData.soilType || '—'} />
                            <InfoRow icon="location-outline" label="Location" value={[farmData.sector, farmData.district].filter(Boolean).join(', ') || '—'} />
                        </View>
                    </View>
                )}
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

function QuickAction({ icon, label, onPress, highlight }: { icon: any; label: string; onPress: () => void; highlight?: boolean }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-1 rounded-2xl items-center py-3.5 shadow-sm ${highlight ? 'bg-[#1B7A3E]' : 'bg-white border border-gray-200/80'}`}
            activeOpacity={0.85}
        >
            <Ionicons name={icon} size={22} color={highlight ? 'white' : '#0B4D26'} />
            <Text className={`text-[11px] font-semibold mt-1.5 ${highlight ? 'text-white' : 'text-gray-700'}`}>{label}</Text>
        </TouchableOpacity>
    );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
    return (
        <View className="flex-row items-center py-1">
            <Ionicons name={icon} size={18} color="#0B4D26" />
            <Text className="text-gray-600 ml-2 flex-1">{label}</Text>
            <Text className="text-gray-900 font-medium capitalize">{value}</Text>
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
