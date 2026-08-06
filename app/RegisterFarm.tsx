import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import Animated, { withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { authApi } from '@/services/api';
import { COUNTRIES, PROVINCES, DISTRICTS, SOIL_TYPES, SECTORS, CELLS, VILLAGES } from '@/constants/LocationData';
import StatusModal from '@/components/ui/StatusModal';

export default function RegisterFarm() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });

    // Form State
    const [formData, setFormData] = useState({
        farmName: '',
        farmSize: '',
        soilType: '',
        country: '',
        province: '',
        district: '',
        sector: '',
        cell: '',
        village: '',
        ownerName: '',
        phoneNumber: '',
        emailAddress: '',
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userJson = await AsyncStorage.getItem('user');
                const token = await AsyncStorage.getItem('token');

                if (!token || !userJson) {
                    router.replace('/signin');
                    return;
                }

                const user = JSON.parse(userJson);
                setUserData(user);

                // Auto-fill owner details from user profile
                setFormData(prev => ({
                    ...prev,
                    ownerName: user.username || '',
                    emailAddress: user.email || ''
                }));

                if (user.isEmailVerified === false) {
                    router.replace(`/verifyEmail?email=${encodeURIComponent(user.email || '')}&userId=${user.id || ''}`);
                }
            } catch (error) {
                console.error('Error checking auth:', error);
            }
        };

        checkAuth();
    }, []);

    // Dropdown States
    const [dropdowns, setDropdowns] = useState({
        soilType: false,
        country: false,
        province: false,
        district: false,
        sector: false,
        cell: false,
        village: false,
    });

    const toggleDropdown = (key: keyof typeof dropdowns) => {
        // Close other dropdowns
        const newDropdowns = {
            soilType: false, country: false, province: false,
            district: false, sector: false, cell: false, village: false
        };
        newDropdowns[key] = !dropdowns[key];
        setDropdowns(newDropdowns);
    };

    const handleSelect = (key: string, value: string, label: string) => {
        setFormData(prev => {
            const newData = { ...prev, [key]: label };
            // Reset dependent fields
            if (key === 'country') {
                newData.province = '';
                newData.district = '';
                newData.sector = '';
                newData.cell = '';
                newData.village = '';
            } else if (key === 'province') {
                newData.district = '';
                newData.sector = '';
                newData.cell = '';
                newData.village = '';
            } else if (key === 'district') {
                newData.sector = '';
                newData.cell = '';
                newData.village = '';
            } else if (key === 'sector') {
                newData.cell = '';
                newData.village = '';
            } else if (key === 'cell') {
                newData.village = '';
            }
            return newData;
        });
        setDropdowns(prev => ({ ...prev, [key]: false }));
    };

    const detectLocation = async () => {
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setStatusModal({
                    visible: true,
                    type: 'error',
                    title: 'Permission Denied',
                    message: 'Permission to access location was denied',
                });
                return;
            }

            setLoading(true);
            let location = await Location.getCurrentPositionAsync({});
            const coords = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
            setFormData(prev => ({ ...prev, gpsCoordinates: coords }));
            setLoading(false);
        } catch (error) {
            setLoading(false);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Location Error',
                message: 'Could not detect location. Please enter manually.',
            });
        }
    };

    const handleContinue = () => {
        // Basic validation
        if (step === 1) {
            if (!formData.farmName || !formData.farmSize || !formData.soilType) {
                setStatusModal({
                    visible: true,
                    type: 'info',
                    title: 'Required Fields',
                    message: 'Please fill in all fields to continue',
                });
                return;
            }
        } else if (step === 2) {
            // The backend requires the full location down to village
            if (!formData.country || !formData.province || !formData.district || !formData.sector || !formData.cell || !formData.village) {
                setStatusModal({
                    visible: true,
                    type: 'info',
                    title: 'Required Fields',
                    message: 'Please fill in all location fields (including sector, cell and village) to continue',
                });
                return;
            }
        }

        if (step < 3) {
            setStep(step + 1);
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        // The backend requires ownerName and ownerEmail (phone is optional)
        if (!formData.ownerName || !formData.emailAddress) {
            setStatusModal({
                visible: true,
                type: 'info',
                title: 'Required Fields',
                message: 'Please fill in the owner name and email address to complete registration',
            });
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                setStatusModal({
                    visible: true,
                    type: 'error',
                    title: 'Session Expired',
                    message: 'Session expired. Please login again.',
                });
                router.replace('/signin');
                return;
            }

            // The payload mapping is now handled inside the api service
            await authApi.registerFarm(formData, token);

            // Update local user data if needed
            const userJson = await AsyncStorage.getItem('user');
            if (userJson) {
                const user = JSON.parse(userJson);
                user.hasFarm = true;
                await AsyncStorage.setItem('user', JSON.stringify(user));
            }

            setLoading(false);
            setSuccessVisible(true);
        } catch (error: any) {
            setLoading(false);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Registration Failed',
                message: error.message || 'Failed to register farm',
            });
        }
    };

    const SuccessPopup = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
        const progress = useSharedValue(1);
        const progressStyle = useAnimatedStyle(() => ({
            width: `${progress.value * 100}%`,
        }));

        useEffect(() => {
            if (visible) {
                progress.value = 1;
                progress.value = withTiming(0, { duration: 3000 });
                const timer = setTimeout(onClose, 3000);
                return () => clearTimeout(timer);
            }
        }, [visible]);

        if (!visible) return null;

        return (
            <View style={styles.modalOverlay}>
                <View style={styles.successModal}>
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={40} color="white" />
                    </View>
                    <Text style={styles.successTitle}>Success</Text>
                    <Text style={styles.successText}>Great! you have successfully registered the farm</Text>
                    <TouchableOpacity style={styles.continueBtn} onPress={onClose}>
                        <Text style={styles.continueBtnText}>Continue</Text>
                    </TouchableOpacity>
                    <View style={styles.progressBarContainer}>
                        <Animated.View style={[styles.progressBar, progressStyle]} />
                    </View>
                </View>
            </View>
        );
    };

    const getProvinces = () => {
        const countryId = COUNTRIES.find(c => c.label === formData.country)?.id;
        return countryId ? PROVINCES[countryId] || [] : [];
    };

    const getDistricts = () => {
        const provinceId = getProvinces().find(p => p.label === formData.province)?.id;
        return provinceId ? DISTRICTS[provinceId] || [] : [];
    };

    const getSectors = () => {
        const districtId = getDistricts().find(d => d.label === formData.district)?.id;
        return districtId ? SECTORS[districtId] || [] : [];
    };

    const getCells = () => {
        const sectorId = getSectors().find(s => s.label === formData.sector)?.id;
        return sectorId ? CELLS[sectorId] || [] : [];
    };

    const getVillages = () => {
        const cellId = getCells().find(c => c.label === formData.cell)?.id;
        return cellId ? VILLAGES[cellId] || [] : [];
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
                    <Ionicons name="arrow-back" size={28} color="black" />
                </TouchableOpacity>
                <TouchableOpacity onPress={async () => {
                    await AsyncStorage.setItem('skipFarm', 'true');
                    router.push('/(main)/dashboard');
                }}>
                    <Text style={styles.skipText}>Skip for now</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {step === 1 && (
                    <View>
                        <Text style={styles.title}>Register Farm</Text>
                        <Text style={styles.subtitle}>
                            Register your farm by entering its name, size, and soil type to get smart insights and real-time soil analysis!
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Farm Name"
                            value={formData.farmName}
                            onChangeText={(text) => setFormData({ ...formData, farmName: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Farm Size (e.g., 25.5)"
                            keyboardType="numeric"
                            value={formData.farmSize}
                            onChangeText={(text) => setFormData({ ...formData, farmSize: text })}
                        />

                        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => toggleDropdown('soilType')}>
                            <Text style={formData.soilType ? styles.inputText : styles.placeholderText}>
                                {formData.soilType || 'Soil Type'}
                            </Text>
                            <Ionicons name={dropdowns.soilType ? "chevron-up" : "chevron-down"} size={20} color="black" />
                        </TouchableOpacity>
                        {dropdowns.soilType && (
                            <View style={styles.dropdownMenu}>
                                {SOIL_TYPES.map(item => (
                                    <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('soilType', item.id, item.label)}>
                                        <Text>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {step === 2 && (
                    <View>
                        <Text style={styles.title}>Location</Text>
                        <Text style={styles.subtitle}>
                            Enter your farm's location details to receive accurate insights and recommendations. Provide your Country, District, Sector, Cell, and Village!
                        </Text>

                        <TouchableOpacity style={styles.dropdownTrigger} onPress={() => toggleDropdown('country')}>
                            <Text style={formData.country ? styles.inputText : styles.placeholderText}>
                                {formData.country || 'Country'}
                            </Text>
                            <Ionicons name={dropdowns.country ? "chevron-up" : "chevron-down"} size={20} color="black" />
                        </TouchableOpacity>
                        {dropdowns.country && (
                            <View style={styles.dropdownMenu}>
                                {COUNTRIES.map(item => (
                                    <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('country', item.id, item.label)}>
                                        <Text>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.dropdownTrigger, !formData.country && styles.disabledDropdown]}
                            onPress={() => formData.country && toggleDropdown('province')}
                            disabled={!formData.country}
                        >
                            <Text style={formData.province ? styles.inputText : styles.placeholderText}>
                                {formData.province || 'Province'}
                            </Text>
                            <Ionicons name={dropdowns.province ? "chevron-up" : "chevron-down"} size={20} color="black" />
                        </TouchableOpacity>
                        {dropdowns.province && (
                            <View style={styles.dropdownMenu}>
                                {getProvinces().map(item => (
                                    <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('province', item.id, item.label)}>
                                        <Text>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {getDistricts().length > 0 ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, !formData.province && styles.disabledDropdown]}
                                    onPress={() => formData.province && toggleDropdown('district')}
                                    disabled={!formData.province}
                                >
                                    <Text style={formData.district ? styles.inputText : styles.placeholderText}>
                                        {formData.district || 'District'}
                                    </Text>
                                    <Ionicons name={dropdowns.district ? "chevron-up" : "chevron-down"} size={20} color="black" />
                                </TouchableOpacity>
                                {dropdowns.district && (
                                    <View style={styles.dropdownMenu}>
                                        {getDistricts().map(item => (
                                            <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('district', item.id, item.label)}>
                                                <Text>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <TextInput
                                style={[styles.input, !formData.province && styles.disabledDropdown]}
                                placeholder="District"
                                placeholderTextColor="#6B7280"
                                editable={!!formData.province}
                                value={formData.district}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, district: text }))}
                            />
                        )}

                        {getSectors().length > 0 ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, !formData.district && styles.disabledDropdown]}
                                    onPress={() => formData.district && toggleDropdown('sector')}
                                    disabled={!formData.district}
                                >
                                    <Text style={formData.sector ? styles.inputText : styles.placeholderText}>
                                        {formData.sector || 'Sector'}
                                    </Text>
                                    <Ionicons name={dropdowns.sector ? "chevron-up" : "chevron-down"} size={20} color="black" />
                                </TouchableOpacity>
                                {dropdowns.sector && (
                                    <View style={styles.dropdownMenu}>
                                        {getSectors().map(item => (
                                            <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('sector', item.id, item.label)}>
                                                <Text>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <TextInput
                                style={[styles.input, !formData.district && styles.disabledDropdown]}
                                placeholder="Sector"
                                placeholderTextColor="#6B7280"
                                editable={!!formData.district}
                                value={formData.sector}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, sector: text }))}
                            />
                        )}

                        {getCells().length > 0 ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, !formData.sector && styles.disabledDropdown]}
                                    onPress={() => formData.sector && toggleDropdown('cell')}
                                    disabled={!formData.sector}
                                >
                                    <Text style={formData.cell ? styles.inputText : styles.placeholderText}>
                                        {formData.cell || 'Cell'}
                                    </Text>
                                    <Ionicons name={dropdowns.cell ? "chevron-up" : "chevron-down"} size={20} color="black" />
                                </TouchableOpacity>
                                {dropdowns.cell && (
                                    <View style={styles.dropdownMenu}>
                                        {getCells().map(item => (
                                            <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('cell', item.id, item.label)}>
                                                <Text>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <TextInput
                                style={[styles.input, !formData.sector && styles.disabledDropdown]}
                                placeholder="Cell"
                                placeholderTextColor="#6B7280"
                                editable={!!formData.sector}
                                value={formData.cell}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, cell: text }))}
                            />
                        )}

                        {getVillages().length > 0 ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.dropdownTrigger, !formData.cell && styles.disabledDropdown]}
                                    onPress={() => formData.cell && toggleDropdown('village')}
                                    disabled={!formData.cell}
                                >
                                    <Text style={formData.village ? styles.inputText : styles.placeholderText}>
                                        {formData.village || 'Village'}
                                    </Text>
                                    <Ionicons name={dropdowns.village ? "chevron-up" : "chevron-down"} size={20} color="black" />
                                </TouchableOpacity>
                                {dropdowns.village && (
                                    <View style={styles.dropdownMenu}>
                                        {getVillages().map(item => (
                                            <TouchableOpacity key={item.id} style={styles.dropdownItem} onPress={() => handleSelect('village', item.id, item.label)}>
                                                <Text>{item.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </>
                        ) : (
                            <TextInput
                                style={[styles.input, !formData.cell && styles.disabledDropdown]}
                                placeholder="Village"
                                placeholderTextColor="#6B7280"
                                editable={!!formData.cell}
                                value={formData.village}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, village: text }))}
                            />
                        )}
                    </View>
                )}

                {step === 3 && (
                    <View>
                        <Text style={styles.title}>Farm Owner</Text>
                        <Text style={styles.subtitle}>
                            Enter your details to manage your farm account and receive important updates. Provide your Full Name, Phone Number, and an Email Address (optional) for notifications!
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Owner Name"
                            value={formData.ownerName}
                            onChangeText={(text) => setFormData({ ...formData, ownerName: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (Optional)"
                            keyboardType="phone-pad"
                            value={formData.phoneNumber}
                            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={formData.emailAddress}
                            onChangeText={(text) => setFormData({ ...formData, emailAddress: text })}
                        />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.mainButton} onPress={handleContinue} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.mainButtonText}>{step === 3 ? 'Finish' : 'Continue'}</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.copyright}>Copyright© 2024 AGRISENSE. All rights reserved.</Text>
            </View>

            <SuccessPopup
                visible={successVisible}
                onClose={() => {
                    setSuccessVisible(false);
                    router.push('/(main)/dashboard');
                }}
            />

            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFDF4',
    },
    header: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    skipText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
        marginBottom: 30,
    },
    input: {
        backgroundColor: '#E5E7E1',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    dropdownTrigger: {
        backgroundColor: '#E5E7E1',
        borderRadius: 8,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    disabledDropdown: {
        opacity: 0.5,
    },
    inputText: {
        fontSize: 16,
        color: 'black',
    },
    placeholderText: {
        fontSize: 16,
        color: '#6B7280',
    },
    dropdownMenu: {
        backgroundColor: 'white',
        borderRadius: 8,
        marginBottom: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        maxHeight: 200,
        overflow: 'hidden',
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    gpsInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E5E7E1',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        paddingRight: 15,
    },
    gpsIcon: {
        marginLeft: 10,
    },
    footer: {
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#FAFDF4',
    },
    mainButton: {
        backgroundColor: '#0B4D26',
        width: '100%',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 20,
    },
    mainButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    copyright: {
        fontSize: 10,
        color: '#6B7280',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    successModal: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
    },
    checkCircle: {
        width: 70,
        height: 70,
        backgroundColor: '#0B4D26',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    successText: {
        textAlign: 'center',
        color: '#4B5563',
        marginBottom: 25,
    },
    continueBtn: {
        backgroundColor: '#0B4D26',
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 8,
        marginBottom: 20,
    },
    continueBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    progressBarContainer: {
        width: '100%',
        height: 4,
        backgroundColor: '#E5E7EB',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#0B4D26',
    },
});
