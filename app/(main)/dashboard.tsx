import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Image, TouchableOpacity, ActivityIndicator, Modal, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSidebar } from '../../context/SidebarContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, predictionsApi, userHasFarm } from '@/services/api';
import PayloadRows, { formatValue, formatEntry, humanize, HIDDEN_KEYS } from '@/components/recommendations/PayloadRows';

const TABS = ['Overview', 'Soil status', 'Weather', 'Recommend', 'Irrigation', 'Pests'];

const carouselItems = [
    { image: require('../../assets/latest-update.png'), title: 'Get to know your soil' },
    { image: require('../../assets/latest-update.png'), title: 'Smart crop suggestions' },
    { image: require('../../assets/latest-update.png'), title: 'Weather-aware farming' },
];

function AccordionCard({
    title,
    expanded,
    onPress,
    children,
}: {
    title: string;
    expanded: boolean;
    onPress: () => void;
    children: React.ReactNode;
}) {
    return (
        <View style={dashStyles.accordion}>
            <TouchableOpacity style={dashStyles.accordionHeader} onPress={onPress} activeOpacity={0.85}>
                <View style={dashStyles.accordionTitleRow}>
                    <Ionicons name="leaf" size={18} color="#34643F" style={{ marginRight: 8 }} />
                    <Text style={dashStyles.accordionTitle}>{title}</Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#374151" />
            </TouchableOpacity>
            {expanded && <View style={dashStyles.accordionBody}>{children}</View>}
        </View>
    );
}

function HighlightLine({ label, value }: { label: string; value: string }) {
    return (
        <Text style={dashStyles.bodyText}>
            <Text style={dashStyles.bodyLabel}>{label} </Text>
            <Text style={dashStyles.highlight}>{value}</Text>
        </Text>
    );
}

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

                // The cached user can be stale (e.g. farm created after login),
                // so confirm with the farms API before redirecting to farm creation.
                const skipFarm = await AsyncStorage.getItem('skipFarm');
                let hasFarm = userHasFarm(user);
                if (!hasFarm) {
                    try {
                        const farmsResponse = await authApi.getFarms();
                        const farmList = farmsResponse.farms || [];
                        hasFarm = farmList.length > 0;
                        if (hasFarm) {
                            user.farmsCount = farmList.length;
                            await AsyncStorage.setItem('user', JSON.stringify(user));
                        }
                    } catch (error) {
                        console.error('Error checking farms:', error);
                    }
                }
                if (!hasFarm && skipFarm !== 'true') {
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
        <View style={dashStyles.emptyCard}>
            <View style={dashStyles.emptyIcon}>
                <Ionicons name="flask-outline" size={26} color="#0B4D26" />
            </View>
            <Text style={dashStyles.emptyTitle}>No recommendations yet</Text>
            <Text style={dashStyles.emptySubtitle}>
                Run a soil analysis to get crop, fertilizer and irrigation advice for your farm.
            </Text>
            <TouchableOpacity
                onPress={() => router.push('/recommends')}
                style={dashStyles.primaryBtn}
            >
                <Text style={dashStyles.primaryBtnText}>Get Recommendations</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContent = () => {
        if (loadingRun) {
            return (
                <View style={[dashStyles.emptyCard, { paddingVertical: 32 }]}>
                    <ActivityIndicator color="#0B4D26" />
                </View>
            );
        }

        if (!latestRun) {
            return <EmptyRecommendations />;
        }

        const cropRecs = recsOfType('crop');
        const fertRecs = recsOfType('fertilizer');
        const irrigationRecs = recsOfType('irrigation');
        const weatherRecs = recsOfType('weather');
        const diseaseRecs = recsOfType('disease');

        switch (activeTab) {
            case 'Overview':
                return (
                    <View style={{ gap: 12 }}>
                        <AccordionCard
                            title="Latest Analysis"
                            expanded={expandedCard === 'overview' || expandedCard == null}
                            onPress={() => toggleAccordion('overview')}
                        >
                            {summary.bestCrop && (
                                <HighlightLine label="Best crop :" value={String(summary.bestCrop)} />
                            )}
                            {summary.confidence != null && (
                                <Text style={dashStyles.bodyText}>
                                    Confidence: {Math.round(Number(summary.confidence) * (Number(summary.confidence) <= 1 ? 100 : 1))}%
                                </Text>
                            )}
                            {summary.soilTexture && (
                                <Text style={dashStyles.bodyText}>Soil texture: {String(summary.soilTexture)}</Text>
                            )}
                            {summary.fertilizer && (
                                <HighlightLine label="Fertilizer :" value={String(summary.fertilizer)} />
                            )}
                            <TouchableOpacity onPress={() => router.push('/recommends')} style={{ marginTop: 8 }}>
                                <Text style={dashStyles.link}>See all recommendations →</Text>
                            </TouchableOpacity>
                        </AccordionCard>
                    </View>
                );
            case 'Soil status':
                return (
                    <AccordionCard
                        title="Latest Soil Composition"
                        expanded={expandedCard === 'soil' || expandedCard == null}
                        onPress={() => toggleAccordion('soil')}
                    >
                        {soilScan ? (
                            Object.entries(soilScan)
                                .filter(([key, value]) =>
                                    value != null && value !== '' &&
                                    !HIDDEN_KEYS.includes(key) &&
                                    !['source'].includes(key) &&
                                    typeof value !== 'object')
                                .map(([key, value]) => (
                                    <View key={key} style={dashStyles.soilRow}>
                                        <Text style={dashStyles.soilLabel}>{humanize(key)}</Text>
                                        <Text style={dashStyles.soilValue}>{formatEntry(key, value)}</Text>
                                    </View>
                                ))
                        ) : (
                            <Text style={dashStyles.bodyText}>No soil scan data in the latest analysis.</Text>
                        )}
                    </AccordionCard>
                );
            case 'Weather':
                return weatherRecs.length > 0 ? (
                    <View style={{ gap: 12 }}>
                        {weatherRecs.map((rec, index) => (
                            <AccordionCard
                                key={`weather-${index}`}
                                title={rec.title || 'Weather Forecast'}
                                expanded={expandedCard === `weather-${index}` || (expandedCard == null && index === 0)}
                                onPress={() => toggleAccordion(`weather-${index}`)}
                            >
                                <PayloadRows payload={rec.payload} />
                            </AccordionCard>
                        ))}
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text style={dashStyles.link}>See all recommendations →</Text>
                        </TouchableOpacity>
                    </View>
                ) : <NoTabData label="weather" />;
            case 'Recommend': {
                const topCrops = cropRecs
                    .slice(0, 3)
                    .map(r => r.payload?.best_crop || r.payload?.bestCrop || r.payload?.crop || r.title)
                    .filter(Boolean);
                const fert = fertRecs[0];
                const fertName = fert?.payload?.recommended_fertilizer || fert?.payload?.fertilizer || fert?.title;
                const fertDesc = fert?.payload?.description || fert?.payload?.soil_npk_status;
                return (cropRecs.length > 0 || fertRecs.length > 0) ? (
                    <View style={{ gap: 12 }}>
                        {cropRecs.length > 0 && (
                            <AccordionCard
                                title="Crop Suggestions"
                                expanded={expandedCard === 'crops' || expandedCard == null}
                                onPress={() => toggleAccordion('crops')}
                            >
                                {summary.soilTexture && (
                                    <Text style={dashStyles.bodyText}>
                                        {String(summary.soilTexture)}
                                        {summary.soilMoisture != null ? ` · Moisture ${formatValue(summary.soilMoisture)}` : ''}
                                    </Text>
                                )}
                                <HighlightLine label="Possible crops :" value={topCrops.join(', ')} />
                            </AccordionCard>
                        )}
                        {fert && (
                            <AccordionCard
                                title="Fertilizer Suggestion"
                                expanded={expandedCard === 'fert' || (expandedCard == null && cropRecs.length === 0)}
                                onPress={() => toggleAccordion('fert')}
                            >
                                {fertDesc && <Text style={dashStyles.bodyText}>{formatValue(fertDesc)}</Text>}
                                {fertName && <HighlightLine label="Possible fertilizers :" value={String(fertName)} />}
                            </AccordionCard>
                        )}
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text style={dashStyles.link}>See all recommendations →</Text>
                        </TouchableOpacity>
                    </View>
                ) : <NoTabData label="crop and fertilizer" />;
            }
            case 'Irrigation':
                return irrigationRecs.length > 0 ? (
                    <View style={{ gap: 12 }}>
                        {irrigationRecs.map((rec, index) => {
                            const p = rec.payload || {};
                            const hasError = typeof p.error === 'string';
                            return (
                                <AccordionCard
                                    key={`irr-${index}`}
                                    title={index === 0 ? 'Soil Moisture Level' : (rec.title || 'Irrigation Scheduling')}
                                    expanded={expandedCard === `irr-${index}` || (expandedCard == null && index === 0)}
                                    onPress={() => toggleAccordion(`irr-${index}`)}
                                >
                                    {hasError ? (
                                        <Text style={[dashStyles.bodyText, { color: '#B45309' }]}>⚠️ {formatValue(p.error)}</Text>
                                    ) : (
                                        <PayloadRows payload={p} />
                                    )}
                                </AccordionCard>
                            );
                        })}
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text style={dashStyles.link}>See all recommendations →</Text>
                        </TouchableOpacity>
                    </View>
                ) : <NoTabData label="irrigation" />;
            case 'Pests':
                return diseaseRecs.length > 0 ? (
                    <View style={{ gap: 12 }}>
                        {diseaseRecs.map((rec, index) => (
                            <AccordionCard
                                key={`disease-${index}`}
                                title="Pest & Disease Watch"
                                expanded={expandedCard === `disease-${index}` || (expandedCard == null && index === 0)}
                                onPress={() => toggleAccordion(`disease-${index}`)}
                            >
                                <PayloadRows payload={rec.payload} />
                                <Text style={[dashStyles.bodyText, { marginTop: 8, color: '#6B7280', fontSize: 12 }]}>
                                    Informational only — satellite data coming soon
                                </Text>
                            </AccordionCard>
                        ))}
                    </View>
                ) : <NoTabData label="pest & disease" />;
            default:
                return null;
        }
    };

    const NoTabData = ({ label }: { label: string }) => (
        <View style={dashStyles.emptyCard}>
            <Text style={[dashStyles.bodyText, { textAlign: 'center' }]}>
                No {label} recommendations in your latest analysis.
            </Text>
            <TouchableOpacity onPress={() => router.push('/recommends')} style={{ marginTop: 8 }}>
                <Text style={dashStyles.link}>Run a new analysis →</Text>
            </TouchableOpacity>
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
                                onPress={() => setFarmModalVisible(true)}
                                className="flex-row items-center"
                                disabled={farms.length === 0}
                            >
                                <Ionicons name="location-outline" size={20} color="white" style={{ marginRight: 5 }} />
                                <Text className="text-white font-bold text-base">
                                    {farmData
                                        ? `${farmData.district || farmData.name}${farmData.province ? `, ${farmData.province}` : farmData.country ? `, ${farmData.country}` : ''}`
                                        : 'My Farm'}
                                </Text>
                                {farms.length > 0 && <Ionicons name="chevron-down" size={16} color="white" style={{ marginLeft: 5 }} />}
                            </TouchableOpacity>
                            <Text className="text-white text-xs font-semibold" style={{ opacity: 0.9 }}>
                                {farmData?.name || `Welcome, ${userData?.username || ''}`}
                            </Text>
                        </View>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                onPress={() => router.push('/RegisterFarm')}
                                className="p-2 rounded-full mr-2"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
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
                        <Text className="text-xl font-bold text-gray-900">#Latest Update</Text>
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text className="text-green-800 font-bold">See all</Text>
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
                        <Text className="text-xl font-bold text-gray-900">Recommended For You</Text>
                        <TouchableOpacity onPress={() => router.push('/recommends')}>
                            <Text className="text-green-800 font-bold">See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                        {TABS.map((tab) => {
                            const active = activeTab === tab;
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={[dashStyles.chip, active && dashStyles.chipActive]}
                                    onPress={() => {
                                        setActiveTab(tab);
                                        setExpandedCard(null);
                                    }}
                                >
                                    <Text style={[dashStyles.chipText, active && dashStyles.chipTextActive]}>{tab}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Farm section */}
                <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
                    <Text className="text-xl font-bold text-gray-900">{farmData?.name || 'My Farm'}</Text>
                    <TouchableOpacity onPress={() => router.push('/recommends')}>
                        <Text className="text-green-800 font-bold">See All</Text>
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

const dashStyles = StyleSheet.create({
    accordion: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.07,
        shadowRadius: 3,
        elevation: 2,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    accordionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    accordionTitle: { color: '#111827', fontWeight: '700', fontSize: 15, flexShrink: 1 },
    accordionBody: {
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 2,
        backgroundColor: '#FAFAF7',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    bodyText: { color: '#374151', fontSize: 14, fontWeight: '600', lineHeight: 21, marginBottom: 4 },
    bodyLabel: { color: '#111827', fontWeight: '700' },
    highlight: { color: '#34643F', fontWeight: '700' },
    link: { color: '#166534', fontWeight: '700', fontSize: 13 },
    soilRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
    soilLabel: { color: '#374151', fontWeight: '600', fontSize: 14 },
    soilValue: { color: '#111827', fontWeight: '700', fontSize: 14, marginLeft: 12, flexShrink: 1, textAlign: 'right' },
    emptyCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 20,
        alignItems: 'center',
    },
    emptyIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: { color: '#111827', fontWeight: '700', fontSize: 17, marginTop: 12 },
    emptySubtitle: { color: '#4B5563', fontWeight: '500', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
    primaryBtn: { backgroundColor: '#0B4D26', borderRadius: 10, paddingHorizontal: 22, paddingVertical: 12, marginTop: 14 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#E5E7EB',
        marginRight: 8,
    },
    chipActive: { backgroundColor: '#34643F' },
    chipText: { color: '#374151', fontWeight: '700', fontSize: 13 },
    chipTextActive: { color: '#fff' },
});

const styles = StyleSheet.create({
    // Inline shadows avoid a NativeWind + Expo Router race that throws
    // a misleading "Couldn't find a navigation context" error.
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 2,
    },
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
