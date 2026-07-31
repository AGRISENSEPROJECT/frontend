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

const randomIn = (min: number, max: number) => (min + Math.random() * (max - min)).toFixed(1);

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
        setMetrics(prev => ({ ...prev, [key]: clean }));
    };

    const fillMockData = () => {
        setMetrics({
            temperature: randomIn(18, 30),
            humidity: randomIn(45, 90),
            rainfall: randomIn(20, 200),
            nitrogen: randomIn(20, 120),
            phosphorus: randomIn(10, 60),
            potassium: randomIn(10, 80),
            soilMoisture: randomIn(20, 70),
        });
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
            setStatusModal({ visible: true, type: 'info', title: 'Readings Required', message: 'Please fill in all sensor readings, or tap "Fill with mock sensor data".' });
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {firstTime && (
                <View style={styles.banner}>
                    <Ionicons name="sparkles-outline" size={20} color="#0B4D26" />
                    <Text style={styles.bannerText}>
                        You have no recommendations yet. Take a soil photo and enter your readings to get your first one!
                    </Text>
                </View>
            )}

            {/* Farm selection */}
            <Text style={styles.sectionTitle}>Farm</Text>
            {loadingFarms ? (
                <ActivityIndicator color="#0B4D26" style={{ marginVertical: 10 }} />
            ) : farms.length === 0 ? (
                <TouchableOpacity style={styles.noFarmCard} onPress={() => router.push('/RegisterFarm')}>
                    <Ionicons name="add-circle-outline" size={22} color="#0B4D26" />
                    <Text style={styles.noFarmText}>No farms yet — register one to continue</Text>
                </TouchableOpacity>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
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

            {/* Soil photo */}
            <Text style={styles.sectionTitle}>Soil Photo</Text>
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
                        <Ionicons name="camera-outline" size={26} color="#0B4D26" />
                        <Text style={styles.photoBtnText}>Take Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery}>
                        <Ionicons name="images-outline" size={26} color="#0B4D26" />
                        <Text style={styles.photoBtnText}>From Gallery</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Sensor readings */}
            <View style={styles.readingsHeader}>
                <Text style={styles.sectionTitle}>Sensor Readings</Text>
                <TouchableOpacity style={styles.mockBtn} onPress={fillMockData}>
                    <Ionicons name="flash-outline" size={16} color="#0B4D26" />
                    <Text style={styles.mockBtnText}>Fill with mock sensor data</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.metricsGrid}>
                <MetricInput label="Temperature (°C)" value={metrics.temperature} onChange={(v) => setMetric('temperature', v)} />
                <MetricInput label="Humidity (%)" value={metrics.humidity} onChange={(v) => setMetric('humidity', v)} />
                <MetricInput label="Rainfall (mm)" value={metrics.rainfall} onChange={(v) => setMetric('rainfall', v)} />
                <MetricInput label="Soil Moisture (%)" value={metrics.soilMoisture} onChange={(v) => setMetric('soilMoisture', v)} optional />
                <MetricInput label="Nitrogen (N)" value={metrics.nitrogen} onChange={(v) => setMetric('nitrogen', v)} />
                <MetricInput label="Phosphorus (P)" value={metrics.phosphorus} onChange={(v) => setMetric('phosphorus', v)} />
                <MetricInput label="Potassium (K)" value={metrics.potassium} onChange={(v) => setMetric('potassium', v)} />
            </View>

            {/* Optional crop type */}
            <Text style={styles.sectionTitle}>Crop You're Considering (optional)</Text>
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

function MetricInput({ label, value, onChange, optional }: { label: string; value: string; onChange: (v: string) => void; optional?: boolean }) {
    return (
        <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>
                {label}{optional ? <Text style={styles.optionalTag}> · optional</Text> : ''}
            </Text>
            <TextInput
                style={styles.metricInput}
                value={value}
                onChangeText={onChange}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor="#9CA3AF"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0B4D26',
        marginBottom: 10,
        marginTop: 6,
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
        marginBottom: 8,
    },
    chipActive: {
        backgroundColor: '#0B4D26',
        borderColor: '#0B4D26',
    },
    chipText: {
        color: '#374151',
        fontSize: 14,
    },
    chipTextActive: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    photoButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    photoBtn: {
        flex: 1,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 22,
        gap: 6,
    },
    photoBtnText: {
        color: '#0B4D26',
        fontWeight: '600',
        fontSize: 13,
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
    readingsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    mockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5E9',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
        marginBottom: 10,
    },
    mockBtnText: {
        color: '#0B4D26',
        fontSize: 12,
        fontWeight: '600',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    metricItem: {
        width: '48%',
        marginBottom: 14,
    },
    metricLabel: {
        fontSize: 13,
        color: '#374151',
        marginBottom: 5,
        fontWeight: '500',
    },
    optionalTag: {
        color: '#9CA3AF',
        fontWeight: '400',
    },
    metricInput: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#111827',
    },
    cropRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    mainButton: {
        backgroundColor: '#0B4D26',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
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
