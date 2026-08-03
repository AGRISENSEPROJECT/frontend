import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { authApi, predictionsApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';

const CROP_TYPES = ['rice', 'Irish Potatoes', 'Tomatoes'];

type Metrics = {
    temperature: string;
    humidity: string;
    rainfall: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    soilMoisture: string;
};

const EMPTY_METRICS: Metrics = {
    temperature: '',
    humidity: '',
    rainfall: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    soilMoisture: '',
};

/** Three sensor profiles tuned to the model’s crop suitability bands (temp / humidity / rainfall). */
const MOCK_PRESETS: {
    id: string;
    label: string;
    hint: string;
    cropType: string;
    metrics: Metrics;
}[] = [
    {
        id: 'potatoes',
        label: 'Highland Potatoes',
        hint: 'Cool, humid, mid rainfall → Irish Potatoes',
        cropType: 'Irish Potatoes',
        metrics: {
            temperature: '18',
            humidity: '72',
            rainfall: '580',
            nitrogen: '45',
            phosphorus: '35',
            potassium: '50',
            soilMoisture: '42',
        },
    },
    {
        id: 'rice',
        label: 'Valley Rice',
        hint: 'Warm, very wet → rice',
        cropType: 'rice',
        metrics: {
            temperature: '28',
            humidity: '82',
            rainfall: '1100',
            nitrogen: '90',
            phosphorus: '40',
            potassium: '40',
            soilMoisture: '68',
        },
    },
    {
        id: 'tomatoes',
        label: 'Garden Tomatoes',
        hint: 'Mild, drier air → Tomatoes',
        cropType: 'Tomatoes',
        metrics: {
            temperature: '24',
            humidity: '58',
            rainfall: '480',
            nitrogen: '55',
            phosphorus: '45',
            potassium: '60',
            soilMoisture: '34',
        },
    },
];

type Props = {
    onSuccess: (result: any) => void;
    firstTime?: boolean;
};

export default function PredictionForm({ onSuccess, firstTime }: Props) {
    const router = useRouter();
    const [farms, setFarms] = useState<any[]>([]);
    const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
    const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);
    const [cropType, setCropType] = useState<string | null>(null);
    const [activePreset, setActivePreset] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingFarms, setLoadingFarms] = useState(true);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });

    useEffect(() => {
        const loadFarms = async () => {
            try {
                const response = await authApi.getFarms();
                const farmList = response.farms || [];
                setFarms(farmList);
                const preferredFarmId = await AsyncStorage.getItem('preferredFarmId');
                const selected = farmList.find((f: any) => f.id === preferredFarmId) || farmList[0];
                if (selected) setSelectedFarmId(selected.id);
            } catch (error) {
                console.error('Error loading farms:', error);
            } finally {
                setLoadingFarms(false);
            }
        };
        loadFarms();
    }, []);

    const setMetric = (key: keyof Metrics, value: string) => {
        const clean = value.replace(/[^0-9.]/g, '');
        setActivePreset(null);
        setMetrics(prev => ({ ...prev, [key]: clean }));
    };

    const applyPreset = (presetId: string) => {
        const preset = MOCK_PRESETS.find(p => p.id === presetId);
        if (!preset) return;
        setActivePreset(preset.id);
        setMetrics({ ...preset.metrics });
    };

    const buildImageFile = (asset: ImagePicker.ImagePickerAsset) => {
        const uri = asset.uri;
        const name = asset.fileName || uri.split('/').pop() || 'soil.jpg';
        const ext = /\.(\w+)$/.exec(name)?.[1]?.toLowerCase() || 'jpg';
        return { uri, name, type: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            setStatusModal({ visible: true, type: 'error', title: 'Permission Denied', message: 'Camera access is needed to take a soil photo.' });
            return;
        }
        const pickerResult = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
            setImage(buildImageFile(pickerResult.assets[0]));
        }
    };

    const pickFromGallery = async () => {
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });
        if (!pickerResult.canceled && pickerResult.assets?.[0]) {
            setImage(buildImageFile(pickerResult.assets[0]));
        }
    };

    const handleSubmit = async () => {
        if (!selectedFarmId) {
            setStatusModal({ visible: true, type: 'info', title: 'Farm Required', message: 'Please select a farm first. If you have none, register one from the sidebar.' });
            return;
        }
        if (!image) {
            setStatusModal({ visible: true, type: 'info', title: 'Soil Photo Required', message: 'Please take or choose a photo of your soil.' });
            return;
        }
        const required: (keyof Metrics)[] = ['temperature', 'humidity', 'rainfall', 'nitrogen', 'phosphorus', 'potassium'];
        const missing = required.filter(key => metrics[key] === '');
        if (missing.length > 0) {
            setStatusModal({ visible: true, type: 'info', title: 'Readings Required', message: 'Please fill in all sensor readings, or pick one of the 3 mock sensor profiles above.' });
            return;
        }

        setLoading(true);
        try {
            const response = await predictionsApi.run({
                farmId: selectedFarmId,
                image,
                temperature: metrics.temperature,
                humidity: metrics.humidity,
                rainfall: metrics.rainfall,
                nitrogen: metrics.nitrogen,
                phosphorus: metrics.phosphorus,
                potassium: metrics.potassium,
                cropType: cropType || undefined,
                soilMoisture: metrics.soilMoisture || undefined,
            });
            onSuccess(response);
        } catch (error: any) {
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Analysis Failed',
                message: error.message || 'The prediction service is unavailable. Please try again later.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.introCard}>
                <View style={styles.introIcon}>
                    <Ionicons name="analytics-outline" size={24} color="#0B4D26" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.introTitle}>New Soil Analysis</Text>
                    <Text style={styles.introText}>
                        Add a soil photo and readings. You can use a scenario while sensors are not connected.
                    </Text>
                </View>
            </View>

            {firstTime && (
                <View style={styles.banner}>
                    <Ionicons name="sparkles-outline" size={20} color="#0B4D26" />
                    <Text style={styles.bannerText}>
                        You have no recommendations yet. Take a soil photo and enter your readings to get your first one!
                    </Text>
                </View>
            )}

            {/* Farm selection */}
            <View style={styles.sectionCard}>
                <SectionHeader icon="location-outline" title="Farm" subtitle="Choose which farm this analysis belongs to." />
                {loadingFarms ? (
                    <ActivityIndicator color="#0B4D26" style={{ marginVertical: 10 }} />
                ) : farms.length === 0 ? (
                    <TouchableOpacity style={styles.noFarmCard} onPress={() => router.push('/RegisterFarm')}>
                        <Ionicons name="add-circle-outline" size={22} color="#0B4D26" />
                        <Text style={styles.noFarmText}>No farms yet — register one to continue</Text>
                    </TouchableOpacity>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {farms.map(farm => (
                            <TouchableOpacity
                                key={farm.id}
                                style={[styles.chip, selectedFarmId === farm.id && styles.chipActive]}
                                onPress={() => setSelectedFarmId(farm.id)}
                            >
                                <Text style={selectedFarmId === farm.id ? styles.chipTextActive : styles.chipText}>
                                    {farm.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>

            {/* Soil photo */}
            <View style={styles.sectionCard}>
                <SectionHeader icon="camera-outline" title="Soil Photo" subtitle="Use a clear photo of the soil surface." />
                {image ? (
                    <View style={styles.photoPreviewWrap}>
                        <Image source={{ uri: image.uri }} style={styles.photoPreview} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => setImage(null)}>
                            <Ionicons name="close" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.photoButtons}>
                        <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={28} color="#0B4D26" />
                            <Text style={styles.photoBtnText}>Take Photo</Text>
                            <Text style={styles.photoBtnSub}>Open camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                            <Ionicons name="images-outline" size={28} color="#0B4D26" />
                            <Text style={styles.photoBtnText}>From Gallery</Text>
                            <Text style={styles.photoBtnSub}>Choose image</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Sensor readings */}
            <View style={styles.sectionCard}>
                <SectionHeader icon="speedometer-outline" title="Sensor Readings" subtitle="Fill manually or choose a mock scenario." />
                <View style={styles.presetList}>
                    {MOCK_PRESETS.map(preset => {
                        const selected = activePreset === preset.id;
                        return (
                            <TouchableOpacity
                                key={preset.id}
                                style={[styles.presetCard, selected && styles.presetCardActive]}
                                onPress={() => applyPreset(preset.id)}
                                activeOpacity={0.85}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.presetLabel, selected && styles.presetLabelActive]}>
                                        {preset.label}
                                    </Text>
                                    <Text style={[styles.presetSub, selected && styles.presetSubActive]}>
                                        {preset.hint}
                                    </Text>
                                </View>
                                {selected ? (
                                    <Ionicons name="checkmark-circle" size={22} color="#0B4D26" />
                                ) : (
                                    <Text style={styles.usePresetText}>Use</Text>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.metricsGrid}>
                    <MetricInput label="Temperature" unit="°C" value={metrics.temperature} onChange={(v) => setMetric('temperature', v)} />
                    <MetricInput label="Humidity" unit="%" value={metrics.humidity} onChange={(v) => setMetric('humidity', v)} />
                    <MetricInput label="Rainfall" unit="mm" value={metrics.rainfall} onChange={(v) => setMetric('rainfall', v)} />
                    <MetricInput label="Soil Moisture" unit="%" value={metrics.soilMoisture} onChange={(v) => setMetric('soilMoisture', v)} optional />
                    <MetricInput label="Nitrogen" unit="N" value={metrics.nitrogen} onChange={(v) => setMetric('nitrogen', v)} />
                    <MetricInput label="Phosphorus" unit="P" value={metrics.phosphorus} onChange={(v) => setMetric('phosphorus', v)} />
                    <MetricInput label="Potassium" unit="K" value={metrics.potassium} onChange={(v) => setMetric('potassium', v)} />
                </View>
            </View>

            {/* Optional crop type */}
            <View style={styles.sectionCard}>
                <SectionHeader icon="leaf-outline" title="Crop You're Considering" subtitle="Optional. Leave blank to let the model decide freely." />
                <View style={styles.cropRow}>
                    {CROP_TYPES.map(crop => (
                        <TouchableOpacity
                            key={crop}
                            style={[styles.chip, cropType === crop && styles.chipActive]}
                            onPress={() => setCropType(prev => (prev === crop ? null : crop))}
                        >
                            <Text style={cropType === crop ? styles.chipTextActive : styles.chipText}>{crop}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity style={styles.mainButton} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color="white" />
                        <Text style={styles.mainButtonText}>  Analyzing your soil...</Text>
                    </View>
                ) : (
                    <Text style={styles.mainButtonText}>Get Recommendations</Text>
                )}
            </TouchableOpacity>

            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </ScrollView>
    );
}

function SectionHeader({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string }) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
                <Ionicons name={icon} size={18} color="#0B4D26" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
            </View>
        </View>
    );
}

function MetricInput({
    label,
    unit,
    value,
    onChange,
    optional,
}: {
    label: string;
    unit: string;
    value: string;
    onChange: (v: string) => void;
    optional?: boolean;
}) {
    return (
        <View style={styles.metricItem}>
            <View style={styles.metricLabelRow}>
                <Text style={styles.metricLabel}>{label}</Text>
                <Text style={styles.unitBadge}>{unit}</Text>
            </View>
            <View style={styles.inputWrap}>
                <TextInput
                    style={styles.metricInput}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor="#9CA3AF"
                />
            </View>
            {optional ? <Text style={styles.optionalTag}>Optional</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8F8F0',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    introCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E8E0',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
    },
    introIcon: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    introTitle: {
        color: '#111827',
        fontSize: 17,
        fontWeight: '800',
    },
    introText: {
        color: '#4B5563',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 19,
        marginTop: 3,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    bannerText: {
        flex: 1,
        color: '#0B4D26',
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E8E8E0',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 14,
    },
    sectionIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
    },
    sectionSubtitle: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 17,
        marginTop: 2,
    },
    noFarmCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#E8F5E9',
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
    },
    noFarmText: {
        color: '#0B4D26',
        fontWeight: '600',
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        marginRight: 8,
    },
    chipActive: {
        backgroundColor: '#0B4D26',
        borderColor: '#0B4D26',
    },
    chipText: {
        color: '#374151',
        fontSize: 14,
        fontWeight: '700',
    },
    chipTextActive: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    photoBtn: {
        flex: 1,
        backgroundColor: '#FAFAF7',
        borderWidth: 1,
        borderColor: '#BFD0C3',
        borderStyle: 'dashed',
        borderRadius: 16,
        alignItems: 'center',
        paddingVertical: 20,
    },
    photoBtnText: {
        color: '#0B4D26',
        fontWeight: '800',
        fontSize: 13,
        marginTop: 8,
    },
    photoBtnSub: {
        color: '#6B7280',
        fontWeight: '600',
        fontSize: 11,
        marginTop: 2,
    },
    photoPreviewWrap: {
        marginBottom: 10,
    },
    photoPreview: {
        width: '100%',
        height: 180,
        borderRadius: 12,
    },
    photoRemove: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 14,
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetList: {
        gap: 10,
        marginBottom: 14,
    },
    presetCard: {
        backgroundColor: '#FAFAF7',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    presetCardActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#0B4D26',
    },
    presetLabel: {
        color: '#111827',
        fontSize: 14,
        fontWeight: '800',
    },
    presetLabelActive: {
        color: '#0B4D26',
    },
    presetSub: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 3,
        fontWeight: '500',
    },
    presetSubActive: {
        color: '#34643F',
    },
    usePresetText: {
        color: '#0B4D26',
        fontSize: 12,
        fontWeight: '800',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricItem: {
        width: '48%',
        marginBottom: 16,
    },
    metricLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    metricLabel: {
        fontSize: 13,
        color: '#1F2937',
        fontWeight: '800',
    },
    unitBadge: {
        color: '#34643F',
        backgroundColor: '#E8F5E9',
        fontSize: 11,
        fontWeight: '800',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: 'hidden',
    },
    inputWrap: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 12,
    },
    optionalTag: {
        color: '#6B7280',
        fontWeight: '700',
        fontSize: 11,
        marginTop: 4,
    },
    metricInput: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#111827',
        fontWeight: '700',
    },
    cropRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 8,
    },
    mainButton: {
        backgroundColor: '#125C2D',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 6,
        elevation: 4,
    },
    mainButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
