import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, predictionsApi, Recommendation } from '@/services/api';
import PredictionForm from '@/components/recommendations/PredictionForm';
import { humanize, formatEntry, cleanPayload, ErrorNote } from '@/components/recommendations/PayloadRows';

const CATEGORIES = [
    { type: 'crop', icon: 'leaf-outline' as const, title: 'Crop Recommendations', subtitle: 'Best crops based on soil, weather, and market demand.' },
    { type: 'irrigation', icon: 'water-outline' as const, title: 'Irrigation Recommendation', subtitle: 'Monitor soil moisture, watering schedules, rainfall forecasts.' },
    { type: 'disease', icon: 'bug-outline' as const, title: 'Pest & Disease Recommendations', subtitle: 'Detect issues early and protect your crops.' },
    { type: 'fertilizer', icon: 'flask-outline' as const, title: 'Fertilizer Recommendations', subtitle: 'Optimize soil nutrients for better yields.' },
    { type: 'weather', icon: 'cloudy-outline' as const, title: 'Weather Recommendations', subtitle: 'Get real-time weather insights for better farm decisions.' },
];

export default function Recommends() {
    const router = useRouter();
    const [view, setView] = useState<'loading' | 'list' | 'form'>('loading');
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<Recommendation[]>([]);
    const [farms, setFarms] = useState<any[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [firstTime, setFirstTime] = useState(false);
    const [activeType, setActiveType] = useState('crop');
    const [choiceIndex, setChoiceIndex] = useState(0);

    const loadRecommendations = useCallback(async (farmId: string): Promise<Recommendation[]> => {
        try {
            const response = await predictionsApi.getRecommendations({ farmId, limit: 50 });
            return response.items || [];
        } catch (error) {
            console.error('Error loading recommendations:', error);
            return [];
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const farmsResponse = await authApi.getFarms();
                const farmList = farmsResponse.farms || [];
                setFarms(farmList);
                if (farmList.length === 0) {
                    setFirstTime(true);
                    setView('form');
                    return;
                }
                const preferredFarmId = await AsyncStorage.getItem('preferredFarmId');
                const farm = farmList.find((f: any) => f.id === preferredFarmId) || farmList[0];
                setSelectedFarmId(farm.id);
                const loaded = await loadRecommendations(farm.id);
                setItems(loaded);
                if (loaded.length === 0) {
                    // No recommendations yet: take the user straight to the form
                    setFirstTime(true);
                    setView('form');
                } else {
                    setView('list');
                }
            } catch (error) {
                console.error('Error loading farms:', error);
                setView('form');
            }
        })();
    }, [loadRecommendations]);

    // Each farm has its own independent recommendations
    const switchFarm = async (farm: any) => {
        if (farm.id === selectedFarmId) return;
        setSelectedFarmId(farm.id);
        await AsyncStorage.setItem('preferredFarmId', farm.id);
        setView('loading');
        setChoiceIndex(0);
        const loaded = await loadRecommendations(farm.id);
        setItems(loaded);
        if (loaded.length === 0) {
            setFirstTime(true);
            setView('form');
        } else {
            setFirstTime(false);
            setView('list');
        }
    };

    const onRefresh = async () => {
        if (!selectedFarmId) return;
        setRefreshing(true);
        setItems(await loadRecommendations(selectedFarmId));
        setRefreshing(false);
    };

    // After a successful prediction, show the results (redirect to the list view)
    const handlePredictionSuccess = async (result: any) => {
        const farmId = result?.soilScan?.farmId || selectedFarmId;
        if (farmId && farmId !== selectedFarmId) setSelectedFarmId(farmId);
        const loaded = farmId ? await loadRecommendations(farmId) : [];
        setItems(loaded);
        setFirstTime(false);
        const hasCrop = (result?.recommendations || loaded).some((r: any) => r.type === 'crop');
        setActiveType(hasCrop ? 'crop' : (loaded[0]?.type || 'crop'));
        setChoiceIndex(0);
        setView('list');
    };

    const activeCategory = CATEGORIES.find(c => c.type === activeType) || CATEGORIES[0];
    const activeItems = items
        .filter(item => item.type === activeType)
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    const activeItem = activeItems[Math.min(choiceIndex, Math.max(activeItems.length - 1, 0))];

    return (
        <View className="flex-1 bg-[#F8F8F0]">
            {/* Header */}
            <View className="bg-[#34643F] px-4 pt-12 pb-4">
                <View className="flex-row justify-between items-center">
                    <TouchableOpacity
                        onPress={() => {
                            if (view === 'form' && items.length > 0) {
                                setView('list');
                            } else {
                                router.replace('/(main)/dashboard');
                            }
                        }}
                        className="p-2 -ml-2"
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text className="text-white text-lg font-bold">Recommends</Text>
                    <TouchableOpacity className="p-2 -mr-2">
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Category icon tabs (design) — only in list view */}
                {view === 'list' && (
                    <View className="flex-row justify-between mt-4 px-2">
                        {CATEGORIES.map(category => {
                            const isActive = category.type === activeType;
                            return (
                                <TouchableOpacity
                                    key={category.type}
                                    onPress={() => {
                                        setActiveType(category.type);
                                        setChoiceIndex(0);
                                    }}
                                    className={`w-12 h-12 rounded-lg items-center justify-center ${isActive ? 'bg-white' : ''}`}
                                >
                                    <Ionicons name={category.icon} size={24} color={isActive ? '#34643F' : '#fff'} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            {view === 'loading' && (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#34643F" />
                </View>
            )}

            {view === 'form' && (
                <PredictionForm onSuccess={handlePredictionSuccess} firstTime={firstTime} />
            )}

            {view === 'list' && (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#34643F']} />}
                >
                    {/* Farm switcher: each farm has independent recommendations */}
                    {farms.length > 0 && (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ flexGrow: 0, marginBottom: 16 }}
                            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 2 }}
                        >
                            {farms.map(farm => {
                                const isSelected = farm.id === selectedFarmId;
                                return (
                                    <TouchableOpacity
                                        key={farm.id}
                                        onPress={() => switchFarm(farm)}
                                        className={`flex-row items-center px-4 rounded-full mx-1 border ${isSelected ? 'bg-[#34643F] border-[#34643F]' : 'bg-white border-gray-300'}`}
                                        style={{ height: 36 }}
                                    >
                                        <Ionicons name="location-outline" size={14} color={isSelected ? '#fff' : '#4B5563'} />
                                        <Text className={`ml-1 text-sm ${isSelected ? 'text-white font-semibold' : 'text-gray-600'}`}>
                                            {farm.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Section title + subtitle (design) */}
                    <View className="items-center mb-4">
                        <View className="flex-row items-center">
                            <Ionicons name={activeCategory.icon} size={18} color="#34643F" />
                            <Text className="text-[#34643F] font-bold text-base ml-2">{activeCategory.title}</Text>
                        </View>
                        <Text className="text-gray-600 text-xs mt-1 text-center">{activeCategory.subtitle}</Text>
                    </View>

                    {activeItems.length === 0 ? (
                        <View className="items-center py-10">
                            <Ionicons name={activeCategory.icon} size={44} color="#C9CFC5" />
                            <Text className="text-gray-500 text-sm mt-3 text-center">
                                No {activeCategory.title.toLowerCase()} yet.{'\n'}Run a new analysis to get them.
                            </Text>
                        </View>
                    ) : (
                        <>
                            {/* Choice selector when the model returned ranked alternatives (design) */}
                            {activeItems.length > 1 && (
                                <View className="flex-row justify-center mb-4">
                                    {activeItems.map((_, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => setChoiceIndex(index)}
                                            className="px-4 py-1"
                                        >
                                            <Text className={`text-sm font-semibold ${choiceIndex === index ? 'text-[#34643F] underline' : 'text-gray-400'}`}>
                                                Choice {index + 1}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {activeItem && (() => {
                                // Titles like "Irrigation Recommendation" just repeat the
                                // category header, so only show meaningful ones (e.g. crop names)
                                const genericTitle = /recommendation|analysis|forecast/i.test(activeItem.title);
                                const { entries, error } = cleanPayload(
                                    activeItem.payload,
                                    genericTitle ? [] : [activeItem.title],
                                );
                                return (
                                    <>
                                        {!genericTitle && (
                                            <FieldCard
                                                label={activeType === 'crop' ? 'Best Crop' : 'Recommendation'}
                                                value={activeItem.title}
                                            />
                                        )}

                                        {/* The model reported it couldn't produce this recommendation */}
                                        {error && (
                                            <View className="mb-3">
                                                <ErrorNote message={error} />
                                            </View>
                                        )}

                                        {entries.length === 0 && !error && (
                                            <Text className="text-gray-500 text-sm text-center py-6">
                                                No details available for this recommendation.
                                            </Text>
                                        )}

                                        {/* One card per payload field (design) */}
                                        {entries.map(([key, value]) => {
                                            if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                                                return (
                                                    <View key={key} className="bg-white rounded-xl border border-gray-200/90 shadow-sm px-4 py-3 mb-3">
                                                        <Text className="text-[#34643F] font-bold text-[13px] mb-1.5">{humanize(key)} :</Text>
                                                        {Object.entries(value).map(([subKey, subValue]) => (
                                                            <View key={subKey} className="flex-row justify-between py-0.5">
                                                                <Text className="text-gray-600 text-sm">{humanize(subKey)}</Text>
                                                                <Text className="text-gray-900 text-sm font-medium flex-shrink ml-2 text-right">{formatEntry(subKey, subValue)}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                );
                                            }
                                            return <FieldCard key={key} label={humanize(key)} value={formatEntry(key, value)} />;
                                        })}

                                        {activeType === 'disease' && (
                                            <Text className="text-gray-400 text-xs text-center mt-1 mb-2">
                                                Informational only — satellite data coming soon
                                            </Text>
                                        )}

                                        <Text className="text-gray-400 text-xs text-center mt-2">
                                            {new Date(activeItem.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </Text>
                                    </>
                                );
                            })()}
                        </>
                    )}
                </ScrollView>
            )}

            {/* New analysis button - floating, list view only */}
            {view === 'list' && (
                <TouchableOpacity
                    onPress={() => setView('form')}
                    className="absolute bottom-6 right-5 bg-[#34643F] w-14 h-14 rounded-full items-center justify-center shadow-lg"
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
}

function FieldCard({ label, value }: { label: string; value: string }) {
    return (
        <View className="bg-white rounded-xl border border-gray-200/90 shadow-sm px-4 py-3 mb-3">
            <Text className="text-[#34643F] font-bold text-[13px] mb-1">{label} :</Text>
            <Text className="text-gray-800 text-sm capitalize">{value}</Text>
        </View>
    );
}
