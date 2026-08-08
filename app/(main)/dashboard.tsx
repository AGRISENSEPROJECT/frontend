import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TextInput,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    StyleSheet,
    RefreshControl,
    Dimensions,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSidebar } from '../../context/SidebarContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, predictionsApi, userHasFarm } from '@/services/api';
import PayloadRows, { formatValue, formatEntry, humanize, HIDDEN_KEYS } from '@/components/recommendations/PayloadRows';
import NotificationBell from '@/components/NotificationBell';
import OnboardingBanner from '@/components/OnboardingBanner';
import { useNotifications } from '@/context/NotificationContext';
import { hasSeenPredictionRun, markPredictionRunSeen, timeAgoShort } from '@/services/notifications';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { userDisplayName } from '@/utils/userDisplay';

const TABS = ['Overview', 'Soil status', 'Weather', 'Recommend', 'Irrigation', 'Pests'];
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - 48;
const CAROUSEL_GAP = 12;
const LATEST_UPDATE_PLACEHOLDERS = [
    require('../../assets/latest-update.png'),
    require('../../assets/farm-illustration.png'),
    require('../../assets/crop-image.png'),
    require('../../assets/soil-detection-image.png'),
];

function latestPostCover(post: { id: string; imageUrl?: string | null }) {
    if (post.imageUrl) return { uri: post.imageUrl };
    let hash = 0;
    for (let i = 0; i < post.id.length; i++) hash = (hash + post.id.charCodeAt(i)) % 997;
    return LATEST_UPDATE_PLACEHOLDERS[hash % LATEST_UPDATE_PLACEHOLDERS.length];
}

type CommunityPostPreview = {
    id: string;
    title?: string | null;
    description: string;
    imageUrl?: string | null;
    createdAt: string;
    author?: {
        id?: string;
        username?: string;
        displayName?: string;
        firstName?: string;
        lastName?: string;
        profileImage?: string | null;
    } | null;
    likeCount?: number;
    commentCount?: number;
    likes?: any[];
    comments?: any[];
};

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
    const [latestPosts, setLatestPosts] = useState<CommunityPostPreview[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const { toggleSidebar } = useSidebar();
    const { push: pushNotification } = useNotifications();
    const carouselRef = useRef<ScrollView>(null);

    const toggleAccordion = (key: string) => {
        setExpandedCard((prev) => (prev === key ? null : key));
    };

    const fetchLatestPosts = useCallback(async () => {
        setLoadingPosts(true);
        try {
            const data = await authApi.getPosts({ page: 1, limit: 3 });
            const items = Array.isArray(data) ? data : data?.items || [];
            setLatestPosts(
                items.slice(0, 3).map((post: any) => ({
                    ...post,
                    author: post.author || post.user || null,
                })),
            );
        } catch (error) {
            console.error('Error fetching latest community posts:', error);
            setLatestPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    }, []);

    const fetchLatestRun = useCallback(async (farmId: string) => {
        setLoadingRun(true);
        try {
            const response = await predictionsApi.getRuns({ farmId, limit: 10 });
            const runs = response.items || response.runs || [];

            // Prefer a successful run; otherwise any run that already has recommendations attached.
            let successRun =
                runs.find((run: any) => String(run?.status || '').toLowerCase() === 'success') ||
                runs.find((run: any) => Array.isArray(run?.recommendations) && run.recommendations.length > 0) ||
                null;

            // Same data source as the Recommends page — hydrate if runs are missing/empty.
            const hydrateFromRecommendations = async (predictionId?: string | null) => {
                const recResponse = await predictionsApi.getRecommendations({ farmId, limit: 50 });
                const items = recResponse.items || [];
                if (!items.length) return null;

                const targetId = predictionId || items[0].predictionId;
                const related = items.filter((item: any) => item.predictionId === targetId);
                const pool = related.length ? related : items;
                const crop =
                    pool.find((r: any) => r.type === 'crop' && r.isPrimary) ||
                    pool.find((r: any) => r.type === 'crop') ||
                    pool[0];
                const payload = crop?.payload || {};

                return {
                    id: targetId || crop?.predictionId || crop?.id,
                    status: 'success',
                    farmId,
                    recommendations: pool,
                    predictionSummary: {
                        bestCrop:
                            payload.best_crop ||
                            payload.bestCrop ||
                            payload.crop ||
                            crop?.title ||
                            null,
                        confidence:
                            payload.confidence ??
                            payload.suitability_score ??
                            payload.suitabilityScore ??
                            null,
                        fertilizer:
                            pool.find((r: any) => r.type === 'fertilizer')?.payload
                                ?.recommended_fertilizer ||
                            pool.find((r: any) => r.type === 'fertilizer')?.title ||
                            null,
                        soilTexture: payload.soil_texture || payload.soilTexture || null,
                        timestamp: crop?.createdAt || items[0].createdAt,
                    },
                    createdAt: crop?.createdAt || items[0].createdAt,
                };
            };

            if (!successRun) {
                successRun = await hydrateFromRecommendations();
            } else if (!Array.isArray(successRun.recommendations) || successRun.recommendations.length === 0) {
                const hydrated = await hydrateFromRecommendations(successRun.id);
                if (hydrated) {
                    successRun = {
                        ...successRun,
                        recommendations: hydrated.recommendations,
                        predictionSummary: successRun.predictionSummary || hydrated.predictionSummary,
                    };
                }
            }

            setLatestRun(successRun);

            if (successRun?.id) {
                const seen = await hasSeenPredictionRun(successRun.id);
                if (!seen) {
                    await markPredictionRunSeen(successRun.id);
                    const crop =
                        successRun.predictionSummary?.bestCrop ||
                        successRun.recommendations?.find((r: any) => r.type === 'crop')?.payload?.crop ||
                        successRun.recommendations?.find((r: any) => r.type === 'crop')?.payload?.best_crop ||
                        'your farm';
                    await pushNotification({
                        type: 'recommendation',
                        title: 'New recommendation ready',
                        body: `Fresh analysis for ${crop}. Tap to review crop, fertilizer, and irrigation advice.`,
                        route: '/recommends',
                        params: { predictionId: String(successRun.id) },
                        meta: { dedupeKey: `run-${successRun.id}`, runId: String(successRun.id) },
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching latest run:', error);
            // Last resort: recommendations-only path (keeps dashboard aligned with Recommends page)
            try {
                const recResponse = await predictionsApi.getRecommendations({ farmId, limit: 50 });
                const items = recResponse.items || [];
                if (items.length) {
                    const crop = items.find((r: any) => r.type === 'crop') || items[0];
                    const related = items.filter((r: any) => r.predictionId === crop.predictionId);
                    setLatestRun({
                        id: crop.predictionId,
                        status: 'success',
                        farmId,
                        recommendations: related.length ? related : items,
                        predictionSummary: {
                            bestCrop:
                                crop.payload?.best_crop ||
                                crop.payload?.bestCrop ||
                                crop.payload?.crop ||
                                crop.title,
                            confidence: crop.payload?.confidence ?? crop.payload?.suitability_score,
                        },
                        createdAt: crop.createdAt,
                    });
                    return;
                }
            } catch (fallbackError) {
                console.error('Recommendation fallback failed:', fallbackError);
            }
            setLatestRun(null);
        } finally {
            setLoadingRun(false);
        }
    }, [pushNotification]);

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

                // Only force verify when explicitly false (missing/undefined should not trap users)
                if (user.isEmailVerified === false) {
                    const emailParam = user.email
                        ? encodeURIComponent(user.email)
                        : '';
                    router.replace(
                        `/verifyEmail?email=${emailParam}&userId=${user.id || ''}`,
                    );
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
                            user.hasFarm = true;
                            await AsyncStorage.setItem('user', JSON.stringify(user));
                        }
                    } catch (error) {
                        console.error('Error checking farms:', error);
                    }
                }

                // Incomplete farmer onboarding (identity / first farm) → RegisterFarm
                if (!hasFarm && skipFarm !== 'true') {
                    router.replace('/RegisterFarm');
                    return;
                }

                setUserData(user);
                fetchFarmDetails();
                fetchLatestPosts();
            } catch (error) {
                console.error('Error loading user data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [fetchFarmDetails, fetchLatestPosts]);

    useEffect(() => {
        if (latestPosts.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => {
                const next = (prevIndex + 1) % latestPosts.length;
                carouselRef.current?.scrollTo({
                    x: next * (CAROUSEL_CARD_WIDTH + CAROUSEL_GAP),
                    animated: true,
                });
                return next;
            });
        }, 4200);
        return () => clearInterval(interval);
    }, [latestPosts.length]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchFarmDetails(), fetchLatestPosts()]);
        setRefreshing(false);
    };

    const onCarouselScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / (CAROUSEL_CARD_WIDTH + CAROUSEL_GAP));
        if (index !== currentIndex && index >= 0 && index < latestPosts.length) {
            setCurrentIndex(index);
        }
    };

    const openCommunityPost = (postId: string) => {
        router.push({
            pathname: '/(main)/community',
            params: { postId },
        });
    };

    const avatarSource = (uri?: string | null) =>
        uri ? { uri } : require('../../assets/profile-pic.png');

    const recommendations: any[] = latestRun?.recommendations || [];
    const recsOfType = (type: string) => recommendations.filter(rec => rec.type === type);
    const summary = latestRun?.predictionSummary || {};
    const soilScan = latestRun?.soilScan || null;
    const needsIdentity = !!(userData && !userData.nationalIdVerified && !userData.onboardingCompleted);
    const needsFarm = !userHasFarm(userData) && !farmData;

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
                            {(summary.bestCrop ||
                                cropRecs[0]?.payload?.best_crop ||
                                cropRecs[0]?.payload?.bestCrop ||
                                cropRecs[0]?.payload?.crop ||
                                cropRecs[0]?.title) && (
                                <HighlightLine
                                    label="Best crop :"
                                    value={String(
                                        summary.bestCrop ||
                                            cropRecs[0]?.payload?.best_crop ||
                                            cropRecs[0]?.payload?.bestCrop ||
                                            cropRecs[0]?.payload?.crop ||
                                            cropRecs[0]?.title,
                                    )}
                                />
                            )}
                            {(summary.confidence != null ||
                                cropRecs[0]?.payload?.confidence != null ||
                                cropRecs[0]?.payload?.suitability_score != null) && (
                                <Text style={dashStyles.bodyText}>
                                    Confidence:{' '}
                                    {Math.round(
                                        Number(
                                            summary.confidence ??
                                                cropRecs[0]?.payload?.confidence ??
                                                cropRecs[0]?.payload?.suitability_score,
                                        ) *
                                            (Number(
                                                summary.confidence ??
                                                    cropRecs[0]?.payload?.confidence ??
                                                    cropRecs[0]?.payload?.suitability_score,
                                            ) <= 1
                                                ? 100
                                                : 1),
                                    )}
                                    %
                                </Text>
                            )}
                            {summary.soilTexture && (
                                <Text style={dashStyles.bodyText}>Soil texture: {String(summary.soilTexture)}</Text>
                            )}
                            {(summary.fertilizer ||
                                fertRecs[0]?.payload?.recommended_fertilizer ||
                                fertRecs[0]?.title) && (
                                <HighlightLine
                                    label="Fertilizer :"
                                    value={String(
                                        summary.fertilizer ||
                                            fertRecs[0]?.payload?.recommended_fertilizer ||
                                            fertRecs[0]?.title,
                                    )}
                                />
                            )}
                            {!summary.bestCrop && cropRecs.length === 0 && (
                                <Text style={dashStyles.bodyText}>
                                    Analysis ready — open recommendations for full details.
                                </Text>
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
        return <DashboardSkeleton />;
    }

    return (
        <View className="flex-1 bg-[#FAF9F6]">
            <ScrollView
                className="flex-1"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B4D26']} />}
            >
                {/* Header */}
                <View style={dashStyles.header}>
                    <View style={dashStyles.headerTop}>
                        <TouchableOpacity onPress={toggleSidebar} hitSlop={10} style={dashStyles.headerIconBtn}>
                            <Ionicons name="menu-outline" size={24} color="white" />
                        </TouchableOpacity>
                        <View style={dashStyles.headerCenter}>
                            <TouchableOpacity
                                onPress={() => setFarmModalVisible(true)}
                                style={dashStyles.farmSwitcher}
                                disabled={farms.length === 0}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="location-outline" size={18} color="white" style={{ marginRight: 4 }} />
                                <Text style={dashStyles.farmLocation} numberOfLines={1}>
                                    {farmData
                                        ? `${farmData.district || farmData.name}${farmData.province ? `, ${farmData.province}` : farmData.country ? `, ${farmData.country}` : ''}`
                                        : 'My Farm'}
                                </Text>
                                {farms.length > 0 && <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />}
                            </TouchableOpacity>
                            <Text style={dashStyles.farmWelcome} numberOfLines={1}>
                                {farmData?.name || `Welcome, ${userDisplayName(userData)}`}
                            </Text>
                        </View>
                        <View style={dashStyles.headerRight}>
                            <TouchableOpacity
                                onPress={() => router.push('/RegisterFarm')}
                                style={dashStyles.addFarmHeaderBtn}
                            >
                                <Ionicons name="add" size={20} color="white" />
                            </TouchableOpacity>
                            <NotificationBell color="#fff" size={24} />
                        </View>
                    </View>

                    <View style={dashStyles.searchBar}>
                        <Ionicons name="search-outline" size={20} color="#0B4D26" />
                        <TextInput
                            placeholder="Search farms, crops, tips..."
                            placeholderTextColor="#6B7280"
                            style={dashStyles.searchInput}
                        />
                    </View>
                </View>

                {(needsIdentity || needsFarm) && (
                    <View style={dashStyles.section}>
                        <OnboardingBanner needsIdentity={needsIdentity} needsFarm={needsFarm} />
                    </View>
                )}

                {/* Latest community posts */}
                <View style={dashStyles.section}>
                    <View style={dashStyles.sectionHeader}>
                        <View>
                            <Text style={dashStyles.sectionTitle}>#Latest Update</Text>
                            <Text style={dashStyles.sectionSubtitle}>From the farmer community</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/(main)/community')} hitSlop={8}>
                            <Text style={dashStyles.seeAll}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    {loadingPosts && latestPosts.length === 0 ? (
                        <View style={dashStyles.carouselLoading}>
                            <ActivityIndicator color="#0B4D26" />
                        </View>
                    ) : latestPosts.length === 0 ? (
                        <TouchableOpacity
                            style={dashStyles.emptyPostsCard}
                            activeOpacity={0.9}
                            onPress={() => router.push('/(main)/community')}
                        >
                            <Image source={LATEST_UPDATE_PLACEHOLDERS[0]} style={dashStyles.emptyPostsBg} />
                            <View style={dashStyles.emptyPostsOverlay}>
                                <Text style={dashStyles.emptyPostsTitle}>No community posts yet</Text>
                                <Text style={dashStyles.emptyPostsBody}>Be the first to share an update or tip.</Text>
                                <View style={dashStyles.emptyPostsCta}>
                                    <Text style={dashStyles.emptyPostsCtaText}>Open Community</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <>
                            <ScrollView
                                ref={carouselRef}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                decelerationRate="fast"
                                snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_GAP}
                                snapToAlignment="start"
                                contentContainerStyle={{ paddingRight: 16 }}
                                onScroll={onCarouselScroll}
                                scrollEventThrottle={16}
                            >
                                {latestPosts.map((post) => (
                                    <TouchableOpacity
                                        key={post.id}
                                        activeOpacity={0.92}
                                        onPress={() => openCommunityPost(post.id)}
                                        style={[dashStyles.postCard, { width: CAROUSEL_CARD_WIDTH, marginRight: CAROUSEL_GAP }]}
                                    >
                                        <Image
                                            source={latestPostCover(post)}
                                            style={dashStyles.postCardBg}
                                        />
                                        <View style={dashStyles.postCardOverlay} />
                                        <View style={dashStyles.postCardContent}>
                                            <View style={dashStyles.postCardMeta}>
                                                <Image
                                                    source={avatarSource(post.author?.profileImage)}
                                                    style={dashStyles.postAvatar}
                                                />
                                                <View style={{ flex: 1 }}>
                                                    <Text style={dashStyles.postAuthor} numberOfLines={1}>
                                                        {userDisplayName(post.author) || 'Farmer'}
                                                    </Text>
                                                    <Text style={dashStyles.postTime}>
                                                        {post.createdAt ? timeAgoShort(post.createdAt) : ''}
                                                    </Text>
                                                </View>
                                                <View style={dashStyles.postBadge}>
                                                    <Ionicons name="people" size={12} color="#0B4D26" />
                                                    <Text style={dashStyles.postBadgeText}>Community</Text>
                                                </View>
                                            </View>
                                            <View style={dashStyles.postCardBottom}>
                                                <Text style={dashStyles.postSnippet} numberOfLines={2}>
                                                    {post.title?.trim() ||
                                                        post.description?.trim() ||
                                                        'Community update'}
                                                </Text>
                                                <View style={dashStyles.postFooter}>
                                                    <Text style={dashStyles.postStats}>
                                                        {post.likeCount ?? post.likes?.length ?? 0} likes ·{' '}
                                                        {post.commentCount ?? post.comments?.length ?? 0} comments
                                                    </Text>
                                                    <Text style={dashStyles.readMore}>Read more →</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <View style={dashStyles.dots}>
                                {latestPosts.map((post, index) => (
                                    <View
                                        key={post.id}
                                        style={[
                                            dashStyles.dot,
                                            currentIndex === index && dashStyles.dotActive,
                                        ]}
                                    />
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {/* Recommended For You */}
                <View style={[dashStyles.section, { paddingTop: 4 }]}>
                    <View style={dashStyles.sectionHeader}>
                        <Text style={dashStyles.sectionTitle}>Recommended For You</Text>
                        <TouchableOpacity onPress={() => router.push('/recommends')} hitSlop={8}>
                            <Text style={dashStyles.seeAll}>See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
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
                <View style={[dashStyles.section, dashStyles.farmSection]}>
                    <Text style={dashStyles.sectionTitle}>{farmData?.name || 'My Farm'}</Text>
                    <TouchableOpacity onPress={() => router.push('/recommends')} hitSlop={8}>
                        <Text style={dashStyles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 28 }}>
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
    header: {
        backgroundColor: '#0B4D26',
        paddingTop: 18,
        paddingBottom: 20,
        paddingHorizontal: 16,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    farmSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        maxWidth: '100%',
    },
    farmLocation: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 15,
        maxWidth: 180,
    },
    farmWelcome: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    addFarmHeaderBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 18,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        color: '#111827',
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
    },
    section: {
        paddingHorizontal: 16,
        paddingTop: 18,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
    },
    sectionSubtitle: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    seeAll: {
        color: '#0B4D26',
        fontWeight: '800',
        fontSize: 13,
        marginTop: 4,
    },
    farmSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 8,
    },
    carouselLoading: {
        height: 168,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyPostsCard: {
        height: 168,
        borderRadius: 18,
        overflow: 'hidden',
    },
    emptyPostsBg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    emptyPostsOverlay: {
        flex: 1,
        backgroundColor: 'rgba(11, 77, 38, 0.62)',
        padding: 18,
        justifyContent: 'flex-end',
    },
    emptyPostsTitle: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 17,
    },
    emptyPostsBody: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        marginTop: 4,
        marginBottom: 12,
    },
    emptyPostsCta: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    emptyPostsCtaText: {
        color: '#0B4D26',
        fontWeight: '800',
        fontSize: 12,
    },
    postCard: {
        height: 176,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#0B4D26',
    },
    postCardBg: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    postCardOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '55%',
        backgroundColor: 'rgba(8, 45, 24, 0.55)',
    },
    postCardContent: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    postCardBottom: {
        gap: 8,
    },
    postCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    postAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.7)',
    },
    postAuthor: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    postTime: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
        textShadowColor: 'rgba(0,0,0,0.35)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    postBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    postBadgeText: {
        color: '#0B4D26',
        fontWeight: '800',
        fontSize: 10,
    },
    postSnippet: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.45)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    postFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    postStats: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 11,
        fontWeight: '600',
    },
    readMore: {
        color: '#BBF7D0',
        fontWeight: '800',
        fontSize: 12,
    },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 12,
        gap: 6,
    },
    dot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#D1D5DB',
    },
    dotActive: {
        width: 18,
        backgroundColor: '#0B4D26',
    },
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
        borderRadius: 999,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        minHeight: 40,
        justifyContent: 'center',
    },
    chipActive: {
        backgroundColor: '#0B4D26',
        borderColor: '#0B4D26',
        shadowColor: '#0B4D26',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    chipText: { color: '#4B5563', fontWeight: '700', fontSize: 13 },
    chipTextActive: { color: '#fff', fontWeight: '800' },
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
