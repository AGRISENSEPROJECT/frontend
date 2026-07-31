import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

const TYPE_ORDER = ['crop', 'fertilizer', 'irrigation', 'weather', 'disease', 'general'];

function humanize(key: string) {
    return key
        .replace(/[_-]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^\w/, c => c.toUpperCase());
}

function formatValue(value: any): string {
    if (value == null) return '-';
    if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
    if (Array.isArray(value)) return value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ');
    return String(value);
}

function PayloadRows({ payload }: { payload: Record<string, any> }) {
    if (!payload || typeof payload !== 'object') return null;
    return (
        <View className="gap-1.5">
            {Object.entries(payload).map(([key, value]) => {
                if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                    return (
                        <View key={key} className="mt-1">
                            <Text className="text-gray-500 text-xs font-semibold uppercase mb-1">{humanize(key)}</Text>
                            {Object.entries(value).map(([subKey, subValue]) => (
                                <View key={subKey} className="flex-row justify-between py-0.5 pl-2">
                                    <Text className="text-gray-600 text-sm">{humanize(subKey)}</Text>
                                    <Text className="text-gray-900 text-sm font-medium flex-shrink ml-2 text-right">{formatValue(subValue)}</Text>
                                </View>
                            ))}
                        </View>
                    );
                }
                return (
                    <View key={key} className="flex-row justify-between py-0.5">
                        <Text className="text-gray-600 text-sm">{humanize(key)}</Text>
                        <Text className="text-gray-900 text-sm font-medium flex-shrink ml-2 text-right">{formatValue(value)}</Text>
                    </View>
                );
            })}
        </View>
    );
}

export default function Recommends() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<Recommendation[]>([]);
    const [farmName, setFarmName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);

    const loadRecommendations = useCallback(async () => {
        setError(null);
        try {
            const farmsResponse = await authApi.getFarms();
            const farms = farmsResponse.farms || [];
            if (farms.length === 0) {
                setItems([]);
                setFarmName(null);
                return;
            }
            const preferredFarmId = await AsyncStorage.getItem('preferredFarmId');
            const farm = farms.find((f: any) => f.id === preferredFarmId) || farms[0];
            setFarmName(farm.name);

            const response = await predictionsApi.getRecommendations({ farmId: farm.id, limit: 50 });
            setItems(response.items || []);
        } catch (err: any) {
            setError(err.message || 'Could not load recommendations');
        }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadRecommendations();
            setLoading(false);
        })();
    }, [loadRecommendations]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRecommendations();
        setRefreshing(false);
    };

    const primary = items.find(item => item.isPrimary && item.type === 'crop');
    const grouped = TYPE_ORDER
        .map(type => ({ type, items: items.filter(item => item.type === type) }))
        .filter(group => group.items.length > 0);

    return (
        <View className="flex-1 bg-[#F8F8F0]">
            {/* Header */}
            <View className="flex-row justify-between items-center bg-[#0B4D26] px-4 pt-12 pb-4">
                <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} className="p-2 -ml-2">
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View className="items-center">
                    <Text className="text-white text-lg font-bold">Recommendations</Text>
                    {farmName && <Text className="text-white/70 text-xs">{farmName}</Text>}
                </View>
                <TouchableOpacity onPress={() => router.push('/NewRecommendation')} className="p-2 -mr-2">
                    <Ionicons name="add-circle-outline" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#0B4D26" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0B4D26']} />}
                >
                    {error ? (
                        <View className="flex-1 items-center justify-center px-6">
                            <Ionicons name="cloud-offline-outline" size={56} color="#9CA3AF" />
                            <Text className="text-gray-700 font-semibold text-base mt-4 text-center">Couldn't load recommendations</Text>
                            <Text className="text-gray-500 text-sm mt-1 text-center">{error}</Text>
                            <TouchableOpacity
                                onPress={onRefresh}
                                className="bg-[#0B4D26] rounded-xl px-6 py-3 mt-5"
                            >
                                <Text className="text-white font-semibold">Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    ) : items.length === 0 ? (
                        /* Empty state: guide the user to run their first analysis */
                        <View className="flex-1 items-center justify-center px-6">
                            <View className="w-24 h-24 rounded-full bg-[#E8F5E9] items-center justify-center">
                                <Ionicons name="flask-outline" size={44} color="#0B4D26" />
                            </View>
                            <Text className="text-gray-900 font-bold text-xl mt-6 text-center">No recommendations yet</Text>
                            <Text className="text-gray-500 text-sm mt-2 text-center leading-5">
                                Run your first soil analysis to get crop, fertilizer, irrigation and weather advice tailored to your farm.
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/NewRecommendation')}
                                className="bg-[#0B4D26] rounded-xl px-8 py-4 mt-6 flex-row items-center"
                            >
                                <Ionicons name="add" size={20} color="white" />
                                <Text className="text-white font-bold text-base ml-1">Get Recommendations</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            {/* Headline: primary crop recommendation */}
                            {primary && (
                                <View className="bg-[#0B4D26] rounded-2xl p-5 mb-4">
                                    <Text className="text-white/70 text-xs font-semibold uppercase">Best Match</Text>
                                    <Text className="text-white text-2xl font-bold mt-1 capitalize">{primary.title}</Text>
                                    {primary.payload?.confidence != null && (
                                        <Text className="text-emerald-200 text-sm font-semibold mt-1">
                                            {Math.round(Number(primary.payload.confidence) * (Number(primary.payload.confidence) <= 1 ? 100 : 1))}% confidence
                                        </Text>
                                    )}
                                    <Text className="text-white/60 text-xs mt-2">
                                        {new Date(primary.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </Text>
                                </View>
                            )}

                            {/* Grouped recommendation sections */}
                            {grouped.map(({ type, items: groupItems }) => {
                                const meta = TYPE_META[type] || TYPE_META.general;
                                return (
                                    <View key={type} className="mb-3">
                                        <Text className="text-gray-800 font-bold text-base mb-2">{meta.title}</Text>
                                        {groupItems.map(item => {
                                            const isExpanded = expanded === item.id;
                                            return (
                                                <View key={item.id} className="mb-2">
                                                    <TouchableOpacity
                                                        onPress={() => setExpanded(prev => (prev === item.id ? null : item.id))}
                                                        className="flex-row items-center bg-white px-4 py-3.5 rounded-xl border border-gray-200/80 shadow-sm"
                                                        activeOpacity={0.85}
                                                    >
                                                        <Ionicons name={meta.icon} size={22} color="#0B4D26" />
                                                        <View className="flex-1 ml-3">
                                                            <Text className="text-[15px] font-medium text-gray-800 capitalize">{item.title}</Text>
                                                            {type === 'disease' && (
                                                                <Text className="text-gray-400 text-xs mt-0.5">Informational — satellite data coming soon</Text>
                                                            )}
                                                        </View>
                                                        {item.isPrimary && (
                                                            <View className="bg-[#E8F5E9] rounded-full px-2 py-0.5 mr-2">
                                                                <Text className="text-[#0B4D26] text-[10px] font-bold">TOP</Text>
                                                            </View>
                                                        )}
                                                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#666" />
                                                    </TouchableOpacity>
                                                    {isExpanded && (
                                                        <View className="bg-white rounded-b-xl -mt-1 px-4 py-3 border border-t-0 border-gray-200/80 mx-0.5">
                                                            <PayloadRows payload={item.payload} />
                                                            <Text className="text-gray-400 text-xs mt-2">
                                                                {new Date(item.createdAt).toLocaleString()}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}

                            <TouchableOpacity
                                onPress={() => router.push('/NewRecommendation')}
                                className="border border-[#0B4D26] rounded-xl py-3.5 mt-2 flex-row items-center justify-center"
                            >
                                <Ionicons name="add" size={18} color="#0B4D26" />
                                <Text className="text-[#0B4D26] font-bold ml-1">Run New Analysis</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            )}
        </View>
    );
}
