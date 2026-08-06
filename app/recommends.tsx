import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authApi, predictionsApi, Recommendation } from '@/services/api';
import PredictionForm from '@/components/recommendations/PredictionForm';
import { humanize, formatEntry, cleanPayload, formatDate } from '@/components/recommendations/PayloadRows';
import ResultFieldCard, { GrowthScoreBar } from '@/components/recommendations/ResultFieldCard';
import NotificationBell from '@/components/NotificationBell';

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

type ResultCard = {
    label: string;
    value: string | null;
    tone?: 'default' | 'warning' | 'muted';
    fallback?: string;
};

function cleanText(value: any): string | null {
    if (value == null) return null;
    if (typeof value === 'object') return null;
    const text = formatEntry('value', value).trim();
    if (!text || text === '-' || /^[^\w\d]+$/.test(text)) return null;
    return text;
}

function formatNpkStatus(value: any): string | null {
    const text = cleanText(value);
    if (!text) return null;
    return text
        .replace(/\bN\s*:/i, 'Nitrogen: ')
        .replace(/\bP\s*:/i, 'Phosphorus: ')
        .replace(/\bK\s*:/i, 'Potassium: ')
        .replace(/,\s*/g, '\n');
}

function formatWeatherMetric(label: string, value: any, unit = '') {
    if (value == null || value === '') return null;
    const formatted = formatEntry(label, value);
    return `${label}: ${formatted}${unit && !String(formatted).includes(unit) ? unit : ''}`;
}

function formatWeatherBlock(day: any): string | null {
    if (!day || typeof day !== 'object') return null;
    const rows = [
        formatWeatherMetric('Temperature', day.temp ?? day.temperature, '°C'),
        formatWeatherMetric('Humidity', day.humidity, '%'),
        formatWeatherMetric('Rainfall', day.rainfall, ' mm'),
    ].filter(Boolean);
    return rows.length > 0 ? rows.join('\n') : null;
}

/** Keep only the latest prediction run for a type, then unique crop names. */
function filterActiveItems(items: Recommendation[], type: string, predictionId?: string | null): Recommendation[] {
    const source = predictionId ? items.filter(item => item.predictionId === predictionId) : items;
    const ofType = source.filter(item => item.type === type);
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

function getPredictionRuns(items: Recommendation[]) {
    const groups = new Map<string, { id: string; createdAt: string; count: number }>();
    for (const item of items) {
        if (!item.predictionId) continue;
        const existing = groups.get(item.predictionId);
        if (!existing) {
            groups.set(item.predictionId, {
                id: item.predictionId,
                createdAt: item.createdAt,
                count: 1,
            });
        } else {
            existing.count += 1;
            if (new Date(item.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
                existing.createdAt = item.createdAt;
            }
        }
    }
    return Array.from(groups.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

/** Build Figma-style field cards from a recommendation payload */
function buildCards(item: Recommendation, type: string) {
    const p = item.payload || {};
    const { entries, error } = cleanPayload(p, [item.title, cropName(item)]);
    const cards: ResultCard[] = [];

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
            });
        }
        if (p.next_irrigation || p.next_watering || p.schedule) {
            cards.push({
                label: 'Next Watering Schedule',
                value: `🕓 ${formatEntry('next', p.next_irrigation || p.next_watering || p.schedule)}${p.recommended_water_mm != null ? ` | Amount: ${p.recommended_water_mm} mm` : ''}`,
            });
        }
        if (p.rain_prediction || p.rainfall) {
            cards.push({
                label: 'Rain Prediction',
                value: `🌧️ ${formatEntry('rain', p.rain_prediction || p.rainfall)}`,
            });
        }
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
        const ph = cleanText(p.ph || p.phLevel || p.soil_ph);
        const nutrients = formatNpkStatus(p.soil_npk_status || p.npk || p.nutrients);
        const fertilizer = cleanText(p.recommended_fertilizer || p.fertilizer);
        const alternatives = cleanText(p.organic_alternatives || p.organicAlternatives);
        const extraAdvice = cleanText(p.additional_recommendations || p.additionalRecommendations);
        const description = cleanText(p.description || p.tips || p.soil_improvement_tips || p.soilImprovementTips);

        if (ph) {
            cards.push({
                label: 'Soil pH Level',
                value: `pH: ${ph}`,
            });
        }
        if (nutrients) {
            cards.push({
                label: 'Nutrient Status',
                value: nutrients,
            });
        }
        if (fertilizer) {
            cards.push({
                label: 'Recommended Fertilizer',
                value: fertilizer,
            });
        }
        if (alternatives) {
            cards.push({
                label: 'Organic Alternatives',
                value: alternatives,
            });
        }
        if (description) {
            cards.push({
                label: 'Why This Helps',
                value: description,
            });
        }
        if (extraAdvice && extraAdvice !== alternatives && extraAdvice !== description) {
            cards.push({
                label: 'Additional Advice',
                value: extraAdvice,
            });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'weather') {
        const today = formatWeatherBlock(p.today);
        const tomorrow = formatWeatherBlock(p.tomorrow);
        const nextDays = cleanText(p.next_3_days || p.next3Days);
        const alerts = cleanText(p.alerts || p.extreme_weather || p.extremeWeather);
        const actions = cleanText(p.recommended_actions || p.actions || p.recommendedActions);

        if (today) {
            cards.push({
                label: 'Today',
                value: today,
            });
        }
        if (tomorrow) {
            cards.push({
                label: 'Tomorrow',
                value: tomorrow,
            });
        }
        if (nextDays) {
            cards.push({ label: 'Next 3 Days', value: nextDays });
        }
        if (alerts) {
            cards.push({
                label: 'Extreme Weather Alerts',
                value: alerts,
                tone: 'warning',
            });
        }
        if (actions) {
            cards.push({ label: 'Recommended Actions', value: actions });
        }
        return { cards, error, score: confidenceOf(item) };
    }

    if (type === 'disease') {
        if (p.message || p.status) {
            cards.push({ label: 'Detected Issue', value: `⚠️ ${formatEntry('status', p.message || p.status)}` });
        }
        if (p.symptoms) {
            cards.push({ label: 'Symptoms', value: `🍂 ${formatEntry('symptoms', p.symptoms)}` });
        }
        if (p.treatment || p.recommended_treatment) {
            cards.push({
                label: 'Recommended Treatment',
                value: `🌿 ${formatEntry('treatment', p.treatment || p.recommended_treatment)}`,
            });
        }
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
    }

    return { cards, error, score: confidenceOf(item) };
}

function unavailableCopy(type: string, rawMessage?: string | null) {
    if (type === 'irrigation') {
        const unsupportedCrop = rawMessage?.match(/crop type (.+?) not supported/i)?.[1]?.trim();
        return {
            icon: 'water-outline' as const,
            title: 'Irrigation advice is not available for this crop yet',
            body: unsupportedCrop
                ? `The model does not currently support irrigation scheduling for ${unsupportedCrop}.`
                : 'The model could not calculate a watering plan from this scan.',
            action: 'Try rice or Irish Potatoes, or run the analysis again without selecting a crop type.',
        };
    }
    if (type === 'disease') {
        return {
            icon: 'bug-outline' as const,
            title: 'Disease detection is still limited',
            body: 'This feature needs satellite imagery or confirmed leaf symptoms before it can give a reliable diagnosis.',
            action: 'For now, use this as a placeholder and rely on field inspection for disease decisions.',
        };
    }
    if (type === 'weather') {
        return {
            icon: 'cloudy-outline' as const,
            title: 'Weather details were not included',
            body: 'The recommendation exists, but the model did not return enough forecast data for this section.',
            action: 'Run another analysis after adding rainfall, humidity, and location values.',
        };
    }
    if (type === 'fertilizer') {
        return {
            icon: 'flask-outline' as const,
            title: 'Fertilizer details are incomplete',
            body: 'The model needs clearer NPK and soil information before it can give a confident fertilizer plan.',
            action: 'Add nitrogen, phosphorus, potassium and pH values, then run a new analysis.',
        };
    }
    return {
        icon: 'leaf-outline' as const,
        title: 'Not enough recommendation data',
        body: 'This scan returned a result, but not enough detail to create useful cards.',
        action: 'Run a fresh analysis with complete metrics and a clear soil image.',
    };
}

function UnavailablePanel({
    type,
    message,
    onRetry,
}: {
    type: string;
    message?: string | null;
    onRetry: () => void;
}) {
    const copy = unavailableCopy(type, message);
    return (
        <View style={styles.unavailablePanel}>
            <View style={styles.unavailableHeader}>
                <View style={styles.unavailableBadge}>
                    <Ionicons name={copy.icon} size={22} color="#34643F" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.unavailableTitle}>{copy.title}</Text>
                    <Text style={styles.unavailableBody}>{copy.body}</Text>
                </View>
            </View>
            {message && (
                <View style={styles.modelMessageBox}>
                    <Text style={styles.modelMessageLabel}>Model response</Text>
                    <Text style={styles.modelMessageText}>{formatEntry('message', message)}</Text>
                </View>
            )}
            <Text style={styles.unavailableAction}>{copy.action}</Text>
            <TouchableOpacity onPress={onRetry} style={styles.secondaryButton} activeOpacity={0.85}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.secondaryButtonText}>Run New Analysis</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function Recommends() {
    const router = useRouter();
    const params = useLocalSearchParams<{ predictionId?: string }>();
    const [view, setView] = useState<'loading' | 'list' | 'form'>('loading');
    const [refreshing, setRefreshing] = useState(false);
    const [items, setItems] = useState<Recommendation[]>([]);
    const [farms, setFarms] = useState<any[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [selectedPredictionId, setSelectedPredictionId] = useState<string | null>(null);
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
                    const runs = getPredictionRuns(loaded);
                    const primary = loaded.find((r: any) => r.isPrimary) || loaded[0];
                    const fromNotif =
                        typeof params.predictionId === 'string' &&
                        runs.some((r) => r.id === params.predictionId)
                            ? params.predictionId
                            : null;
                    setSelectedPredictionId(fromNotif || runs[0]?.id || primary?.predictionId || null);
                    setActiveType(primary?.type || 'crop');
                    setChoiceIndex(0);
                    setView('list');
                }
            } catch (error) {
                console.error('Error loading farms:', error);
                setView('form');
            }
        })();
    }, [loadRecommendations, params.predictionId]);

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
            setSelectedPredictionId(null);
            setView('form');
        } else {
            setFirstTime(false);
            const runs = getPredictionRuns(loaded);
            const primary = loaded.find((r: any) => r.isPrimary) || loaded[0];
            setSelectedPredictionId(runs[0]?.id || primary?.predictionId || null);
            setActiveType(primary?.type || 'crop');
            setView('list');
        }
    };

    const onRefresh = async () => {
        if (!selectedFarmId) return;
        setRefreshing(true);
        const loaded = await loadRecommendations(selectedFarmId);
        setItems(loaded);
        const runs = getPredictionRuns(loaded);
        if (!runs.some(run => run.id === selectedPredictionId)) {
            setSelectedPredictionId(runs[0]?.id || null);
        }
        setRefreshing(false);
    };

    const handlePredictionSuccess = async (result: any) => {
        const farmId = result?.soilScan?.farmId || selectedFarmId;
        if (farmId && farmId !== selectedFarmId) setSelectedFarmId(farmId);
        const loaded = farmId ? await loadRecommendations(farmId) : [];
        setItems(loaded);
        setFirstTime(false);
        const hasCrop = (result?.recommendations || loaded).some((r: any) => r.type === 'crop');
        const runs = getPredictionRuns(loaded);
        setSelectedPredictionId(runs[0]?.id || loaded[0]?.predictionId || null);
        setActiveType(hasCrop ? 'crop' : (loaded[0]?.type || 'crop'));
        setChoiceIndex(0);
        setView('list');
    };

    const activeCategory = CATEGORIES.find(c => c.type === activeType) || CATEGORIES[0];
    const predictionRuns = getPredictionRuns(items);
    const activeItems = filterActiveItems(items, activeType, selectedPredictionId);

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
                        onPress={() => router.replace('/(main)/dashboard')}
                        style={styles.headerBtn}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Recommends</Text>
                    <NotificationBell color="#fff" size={24} />
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

                        {predictionRuns.length > 1 && (
                            <View style={styles.historyBox}>
                                <View style={styles.historyHeader}>
                                    <View>
                                        <Text style={styles.historyTitle}>Prediction History</Text>
                                        <Text style={styles.historySubtitle}>Switch between previous analysis runs</Text>
                                    </View>
                                    <Text style={styles.historyCount}>{predictionRuns.length} runs</Text>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                                    {predictionRuns.map((run, index) => {
                                        const selected = selectedPredictionId === run.id;
                                        return (
                                            <TouchableOpacity
                                                key={run.id}
                                                onPress={() => {
                                                    setSelectedPredictionId(run.id);
                                                    setChoiceIndex(0);
                                                }}
                                                style={[styles.historyChip, selected && styles.historyChipActive]}
                                            >
                                                <Text style={[styles.historyChipTitle, selected && styles.historyChipTitleActive]}>
                                                    {index === 0 ? 'Latest' : `Run ${index + 1}`}
                                                </Text>
                                                <Text style={[styles.historyChipDate, selected && styles.historyChipDateActive]}>
                                                    {formatDate(run.createdAt)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Section title */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={styles.sectionTitle}>
                                {activeCategory.emoji} {activeCategory.title}
                            </Text>
                            <Text style={styles.sectionSubtitle}>{activeCategory.subtitle}</Text>
                        </View>

                        {activeItems.length === 0 ? (
                            <UnavailablePanel
                                type={activeType}
                                onRetry={() => setView('form')}
                            />
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

                                {(built?.error || (built && built.cards.length === 0)) && (
                                    <UnavailablePanel
                                        type={activeType}
                                        message={built?.error}
                                        onRetry={() => setView('form')}
                                    />
                                )}

                                {!built?.error && built?.cards[0] && (
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

                                {!built?.error && built?.cards.slice(1).map((card, i) => (
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
    historyBox: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8E8E0',
        padding: 12,
        marginBottom: 16,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 10,
    },
    historyTitle: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '800',
    },
    historySubtitle: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    historyCount: {
        color: '#34643F',
        backgroundColor: '#E8F5E9',
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    historyChip: {
        minWidth: 124,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#FAFAF7',
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginRight: 8,
    },
    historyChipActive: {
        backgroundColor: '#34643F',
        borderColor: '#34643F',
    },
    historyChipTitle: {
        color: '#374151',
        fontSize: 13,
        fontWeight: '800',
    },
    historyChipTitleActive: {
        color: '#fff',
    },
    historyChipDate: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 3,
    },
    historyChipDateActive: {
        color: '#E8F5E9',
    },
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
    unavailablePanel: {
        backgroundColor: '#FFFDF4',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#EADFB8',
        padding: 16,
        marginBottom: 14,
    },
    unavailableHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    unavailableBadge: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    unavailableTitle: {
        color: '#1F2937',
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 21,
    },
    unavailableBody: {
        color: '#4B5563',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 19,
        marginTop: 4,
    },
    unavailableAction: {
        color: '#34643F',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 19,
        marginTop: 12,
    },
    modelMessageBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3E6B7',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginTop: 12,
    },
    modelMessageLabel: {
        color: '#92400E',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    modelMessageText: {
        color: '#6B5E38',
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
    },
    secondaryButton: {
        marginTop: 14,
        backgroundColor: '#34643F',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
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
