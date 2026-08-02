import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, predictionsApi, Recommendation } from '@/services/api';
import PredictionForm from '@/components/recommendations/PredictionForm';
import { humanize, formatEntry, cleanPayload, ErrorNote, formatDate } from '@/components/recommendations/PayloadRows';
import ResultFieldCard, { GrowthScoreBar } from '@/components/recommendations/ResultFieldCard';

const CATEGORIES = [
    { type: 'crop', icon: 'leaf-outline' as const, emoji: '🌱', title: 'Crop Recommendations', subtitle: 'Best crops based on soil, weather, and market demand.' },
    { type: 'irrigation', icon: 'water-outline' as const, emoji: '💧', title: 'Irrigation Recommendation', subtitle: 'Monitor soil moisture, watering schedules, rainfall forecasts.' },
    { type: 'disease', icon: 'bug-outline' as const, emoji: '🦠', title: 'Pest & Disease Recommendations', subtitle: 'Detect issues early and protect your crops.' },
    { type: 'fertilizer', icon: 'flask-outline' as const, emoji: '🌾', title: 'Fertilizer Recommendations', subtitle: 'Optimize soil nutrients for better yields.' },
    { type: 'weather', icon: 'cloudy-outline' as const, emoji: '☁️', title: 'Weather Recommendations', subtitle: 'Get real-time weather insights for better farm decisions.' },
];

function cropName(item: Recommendation) {
    const p = item.payload || {};
    return String(p.best_crop || p.bestCrop || p.crop || item.title || '').trim();
}

function normalizeCropKey(name: string) {
    return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function confidenceOf(item: Recommendation): number | null {
    const raw = item.payload?.confidence ?? item.payload?.suitability_score ?? item.payload?.suitabilityScore;
    if (raw == null || Number.isNaN(Number(raw))) return null;
    return Number(raw);
}

/** Keep only the latest prediction run for a type, then unique crop names. */
function filterActiveItems(items: Recommendation[], type: string): Recommendation[] {
    const ofType = items.filter(item => item.type === type);
    if (ofType.length === 0) return [];

    // Newest run first (createdAt DESC already from API, but be explicit).
    const newest = ofType.reduce((a, b) =>
        new Date(a.createdAt).getTime() >= new Date(b.createdAt).getTime() ? a : b,
    );
    const latestRunId = newest.predictionId;
    const fromLatestRun = ofType.filter(item => item.predictionId === latestRunId);

    if (type !== 'crop') {
        // One card family per category from the latest run (prefer primary, then rank).
        return [...fromLatestRun].sort((a, b) => {
            if (a.isPrimary && !b.isPrimary) return -1;
            if (!a.isPrimary && b.isPrimary) return 1;
            return (a.rank ?? 99) - (b.rank ?? 99);
        });
    }

    // Deduplicate crops by name (case-insensitive), keep best score / primary.
    const byName = new Map<string, Recommendation>();
    for (const item of fromLatestRun) {
        const key = normalizeCropKey(cropName(item));
        if (!key) continue;
        const existing = byName.get(key);
        if (!existing) {
            byName.set(key, item);
            continue;
        }
        const nextScore = confidenceOf(item) ?? -1;
        const prevScore = confidenceOf(existing) ?? -1;
        if (item.isPrimary && !existing.isPrimary) {
            byName.set(key, item);
        } else if (nextScore > prevScore) {
            byName.set(key, item);
        } else if ((item.rank ?? 99) < (existing.rank ?? 99)) {
            byName.set(key, item);
        }
    }

    return Array.from(byName.values()).sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (confidenceOf(b) ?? -1) - (confidenceOf(a) ?? -1);
    });
}

/** Build Figma-style field cards from a recommendation payload */
function buildCards(item: Recommendation, type: string) {
    const p = item.payload || {};
    const { entries, error } = cleanPayload(p, [item.title, cropName(item)]);
    const cards: { label: string; value: string | null; tone?: 'default' | 'warning' | 'muted'; fallback?: string }[] = [];

    if (type === 'crop') {
        const best = cropName(item);
        cards.push({
            label: 'Best Crop',
            value: best || null,
            fallback: 'No clear winner yet — try another sensor profile',
        });
        entries.forEach(([key, value]) => {
            if (/confidence|suitability|best_?crop|crop$/i.test(key)) return;
            if (value != null && typeof value === 'object') return;
            cards.push({ label: humanize(key), value: formatEntry(key, value) });
        });
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'irrigation') {
        if (error) return { cards, error, score: null };
        if (p.status || p.soil_moisture != null || p.moisture != null) {
            const moisture = p.soil_moisture ?? p.moisture ?? p.current_moisture;
            const status = p.status ? formatEntry('status', p.status) : null;
            cards.push({
                label: 'Soil Moisture Level',
                value: moisture != null
                    ? `💧 Current Moisture: ${formatEntry('moisture', moisture)}${status ? ` (${status})` : ''}`
                    : status || null,
                fallback: 'Moisture reading unavailable for this scan',
            });
        } else {
            cards.push({
                label: 'Soil Moisture Level',
                value: null,
                fallback: 'Moisture reading unavailable for this scan',
            });
        }
        cards.push({
            label: 'Next Watering Schedule',
            value: (p.next_irrigation || p.next_watering || p.schedule)
                ? `🕓 ${formatEntry('next', p.next_irrigation || p.next_watering || p.schedule)}${p.recommended_water_mm != null ? ` | Amount: ${p.recommended_water_mm} mm` : ''}`
                : null,
            fallback: 'Schedule not estimated yet — check back after the next analysis',
        });
        cards.push({
            label: 'Rain Prediction',
            value: (p.rain_prediction || p.rainfall)
                ? `🌧️ ${formatEntry('rain', p.rain_prediction || p.rainfall)}`
                : null,
            fallback: 'Rain outlook not included in this result',
        });
        if (p.tips || p.water_saving_tips) {
            cards.push({ label: 'Water-Saving Tips', value: `💡 ${formatEntry('tips', p.tips || p.water_saving_tips)}` });
        }
        if (p.alert || p.drought_risk || p.flood_risk) {
            cards.push({
                label: 'Flood/Drought Alerts',
                value: `⚠️ ${formatEntry('alert', p.alert || p.drought_risk || p.flood_risk)}`,
                tone: 'warning',
            });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'fertilizer') {
        cards.push({
            label: 'Soil pH Level',
            value: (p.ph || p.phLevel || p.soil_ph)
                ? `✔️ pH: ${formatEntry('ph', p.ph || p.phLevel || p.soil_ph)}`
                : null,
            fallback: 'pH not reported — lab test recommended for precision',
        });
        cards.push({
            label: 'Soil Nutrients',
            value: (p.soil_npk_status || p.npk || p.nutrients)
                ? `🌱 ${formatEntry('npk', p.soil_npk_status || p.npk || p.nutrients)}`
                : null,
            fallback: 'NPK breakdown unavailable for this scan',
        });
        cards.push({
            label: 'Recommended Fertilizer',
            value: (p.recommended_fertilizer || p.fertilizer)
                ? `🍼 ${formatEntry('fertilizer', p.recommended_fertilizer || p.fertilizer)}`
                : null,
            fallback: 'No fertilizer match yet — try adjusting NPK readings',
        });
        if (p.organic_alternatives || p.additional_recommendations) {
            cards.push({
                label: 'Organic Alternatives',
                value: `🌿 ${formatEntry('organic', p.organic_alternatives || p.additional_recommendations)}`,
            });
        }
        if (p.description || p.tips || p.soil_improvement_tips) {
            cards.push({
                label: 'Soil Improvement Tips',
                value: `🌾 ${formatEntry('tips', p.description || p.tips || p.soil_improvement_tips)}`,
            });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'weather') {
        if (p.today && typeof p.today === 'object') {
            const t = p.today;
            cards.push({
                label: 'Current Weather',
                value: `🌡️ Temp: ${formatEntry('temp', t.temp ?? t.temperature)} | 💦 Humidity: ${formatEntry('humidity', t.humidity)}${t.rainfall != null ? ` | Rain: ${formatEntry('rain', t.rainfall)}` : ''}`,
            });
        } else {
            cards.push({
                label: 'Current Weather',
                value: null,
                fallback: 'Live weather feed unavailable right now',
            });
        }
        if (p.tomorrow && typeof p.tomorrow === 'object') {
            const t = p.tomorrow;
            cards.push({
                label: 'Tomorrow',
                value: `🌡️ Temp: ${formatEntry('temp', t.temp ?? t.temperature)} | 💦 Humidity: ${formatEntry('humidity', t.humidity)}${t.rainfall != null ? ` | Rain: ${formatEntry('rain', t.rainfall)}` : ''}`,
            });
        }
        if (p.next_3_days || p.next3Days) {
            cards.push({ label: 'Next 3 Days', value: `🌧️ ${formatEntry('forecast', p.next_3_days || p.next3Days)}` });
        }
        if (p.alerts || p.extreme_weather) {
            cards.push({
                label: 'Extreme Weather Alerts',
                value: `⚠️ ${formatEntry('alert', p.alerts || p.extreme_weather)}`,
                tone: 'warning',
            });
        }
        if (p.recommended_actions || p.actions) {
            cards.push({ label: 'Recommended Actions', value: `✅ ${formatEntry('actions', p.recommended_actions || p.actions)}` });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'disease') {
        if (p.message || p.status) {
            cards.push({ label: 'Detected Issue', value: `⚠️ ${formatEntry('status', p.message || p.status)}` });
        } else {
            cards.push({
                label: 'Detected Issue',
                value: null,
                fallback: 'No disease signal yet — satellite detection is coming soon',
            });
        }
        cards.push({
            label: 'Symptoms',
            value: p.symptoms ? `🍂 ${formatEntry('symptoms', p.symptoms)}` : null,
            fallback: 'Symptom guide not available for this crop yet',
        });
        cards.push({
            label: 'Recommended Treatment',
            value: (p.treatment || p.recommended_treatment)
                ? `🌿 ${formatEntry('treatment', p.treatment || p.recommended_treatment)}`
                : null,
            fallback: 'Treatment tips unlock once an issue is confirmed',
        });
        if (p.preventive_measures || p.prevention) {
            cards.push({ label: 'Preventive Measures', value: `🔄 ${formatEntry('prevention', p.preventive_measures || p.prevention)}` });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    // Generic fallback: one card per remaining entry
    if (cards.length === 0) {
        entries.forEach(([key, value]) => {
            if (value != null && typeof value === 'object' && !Array.isArray(value)) {
                Object.entries(value).forEach(([subKey, subValue]) => {
                    cards.push({ label: `${humanize(key)} · ${humanize(subKey)}`, value: formatEntry(subKey, subValue) });
                });
            } else {
                cards.push({ label: humanize(key), value: formatEntry(key, value) });
            }
        });
        if (cards.length === 0) {
            cards.push({
                label: 'Status',
                value: null,
                fallback: 'Details for this category were not returned — try running the analysis again',
            });
        }
    }

    return { cards, error, score: confidenceOf(item) };
}

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
                    setFirstTime(true);
                    setView('form');
                } else {
                    const primary = loaded.find((r: any) => r.isPrimary) || loaded[0];
                    setActiveType(primary?.type || 'crop');
                    setChoiceIndex(0);
                    setView('list');
                }
            } catch (error) {
                console.error('Error loading farms:', error);
                setView('form');
            }
        })();
    }, [loadRecommendations]);

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
            const primary = loaded.find((r: any) => r.isPrimary) || loaded[0];
            setActiveType(primary?.type || 'crop');
            setView('list');
        }
    };

    const onRefresh = async () => {
        if (!selectedFarmId) return;
        setRefreshing(true);
        setItems(await loadRecommendations(selectedFarmId));
        setRefreshing(false);
    };

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
    const activeItems = filterActiveItems(items, activeType);

    // For crop: Choice pills switch between alternatives. Other types: show primary / first only.
    const showChoices = activeType === 'crop' && activeItems.length > 1;
    const safeChoiceIndex = Math.min(choiceIndex, Math.max(activeItems.length - 1, 0));
    const activeItem = activeItems[safeChoiceIndex] || activeItems[0];
    const built = activeItem ? buildCards(activeItem, activeType) : null;

    // Alternatives for crop card (already deduped via filterActiveItems)
    const alternativeCrops = activeType === 'crop'
        ? activeItems
            .filter((_, i) => i !== safeChoiceIndex)
            .map(cropName)
            .filter(Boolean)
        : [];

    return (
        <View style={styles.screen}>
            {/* Green header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => {
                            if (view === 'form' && items.length > 0) setView('list');
                            else router.replace('/(main)/dashboard');
                        }}
                        style={styles.headerBtn}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Recommends</Text>
                    <TouchableOpacity style={styles.headerBtn}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {view === 'list' && (
                    <View style={styles.iconTabs}>
                        {CATEGORIES.map(category => {
                            const isActive = category.type === activeType;
                            return (
                                <TouchableOpacity
                                    key={category.type}
                                    onPress={() => {
                                        setActiveType(category.type);
                                        setChoiceIndex(0);
                                    }}
                                    style={[styles.iconTab, isActive && styles.iconTabActive]}
                                >
                                    <Ionicons name={category.icon} size={24} color={isActive ? '#34643F' : '#fff'} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            {view === 'loading' && (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#34643F" />
                </View>
            )}

            {view === 'form' && (
                <PredictionForm onSuccess={handlePredictionSuccess} firstTime={firstTime} />
            )}

            {view === 'list' && (
                <View style={styles.sheet}>
                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#34643F']} />}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Farm chips */}
                        {farms.length > 1 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }}>
                                {farms.map(farm => {
                                    const selected = farm.id === selectedFarmId;
                                    return (
                                        <TouchableOpacity
                                            key={farm.id}
                                            onPress={() => switchFarm(farm)}
                                            style={[styles.farmChip, selected && styles.farmChipActive]}
                                        >
                                            <Ionicons name="location-outline" size={14} color={selected ? '#fff' : '#4B5563'} />
                                            <Text style={[styles.farmChipText, selected && styles.farmChipTextActive]}>{farm.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        {/* Section title */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.sectionTitle}>
                                {activeCategory.emoji} {activeCategory.title}
                            </Text>
                            <Text style={styles.sectionSubtitle}>{activeCategory.subtitle}</Text>
                        </View>

                        {activeItems.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name={activeCategory.icon} size={44} color="#C9CFC5" />
                                <Text style={styles.emptyText}>
                                    No {activeCategory.title.toLowerCase()} yet.{'\n'}Tap + to run a new analysis.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Crop choice pills — Figma style, only when multiple crops */}
                                {showChoices && (
                                    <View style={styles.choiceRow}>
                                        {activeItems.map((item, index) => {
                                            const selected = safeChoiceIndex === index;
                                            return (
                                                <TouchableOpacity
                                                    key={item.id || `${cropName(item)}-${index}`}
                                                    onPress={() => setChoiceIndex(index)}
                                                    style={[styles.choicePill, selected && styles.choicePillActive]}
                                                >
                                                    <Text style={[styles.choiceText, selected && styles.choiceTextActive]}>
                                                        {cropName(item) || `Option ${index + 1}`}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}

                                {built?.error && (
                                    <View style={{ marginBottom: 12 }}>
                                        <ErrorNote message={built.error} />
                                    </View>
                                )}

                                {built?.cards[0] && (
                                    <ResultFieldCard
                                        label={built.cards[0].label}
                                        value={built.cards[0].value}
                                        fallback={built.cards[0].fallback}
                                        tone={built.cards[0].tone}
                                    />
                                )}

                                {activeType === 'crop' && (
                                    <GrowthScoreBar score={built?.score ?? null} />
                                )}

                                {built?.cards.slice(1).map((card, i) => (
                                    <ResultFieldCard
                                        key={`${card.label}-${i}`}
                                        label={card.label}
                                        value={card.value}
                                        fallback={card.fallback}
                                        tone={card.tone}
                                    />
                                ))}

                                {activeType === 'crop' && (
                                    <ResultFieldCard
                                        label="Alternative Crops"
                                        value={alternativeCrops.length > 0 ? alternativeCrops.join(', ') : null}
                                        fallback="No alternatives this round — try another mock sensor profile to compare crops"
                                    />
                                )}

                                {activeType === 'disease' && (
                                    <Text style={styles.footnote}>Informational only — satellite data coming soon</Text>
                                )}

                                {activeItem?.createdAt && (
                                    <Text style={styles.footnote}>{formatDate(activeItem.createdAt)}</Text>
                                )}
                            </>
                        )}
                    </ScrollView>
                </View>
            )}

            {view === 'list' && (
                <TouchableOpacity
                    onPress={() => setView('form')}
                    style={styles.fab}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#34643F' },
    header: { backgroundColor: '#34643F', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 20 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerBtn: { padding: 8, marginHorizontal: -8 },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    iconTabs: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 4 },
    iconTab: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    iconTabActive: { backgroundColor: '#fff' },
    sheet: {
        flex: 1,
        backgroundColor: '#F8F8F0',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F8F0' },
    farmChip: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginRight: 8,
    },
    farmChipActive: { backgroundColor: '#34643F', borderColor: '#34643F' },
    farmChipText: { marginLeft: 4, fontSize: 13, fontWeight: '600', color: '#374151' },
    farmChipTextActive: { color: '#fff' },
    sectionTitle: { color: '#34643F', fontSize: 18, fontWeight: '700' },
    sectionSubtitle: { color: '#4B5563', fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18 },
    choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    choicePill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#E8EDE9',
    },
    choicePillActive: { backgroundColor: '#34643F' },
    choiceText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    choiceTextActive: { color: '#fff' },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8E8E0',
    },
    emptyText: { color: '#4B5563', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12, lineHeight: 20 },
    footnote: { color: '#6B7280', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#34643F',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 6,
    },
});
