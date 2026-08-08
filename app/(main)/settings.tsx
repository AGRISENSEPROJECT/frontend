import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import { useSidebar } from '@/context/SidebarContext';
import { SettingsSkeleton } from '@/components/ui/Skeleton';
import { userDisplayName } from '@/utils/userDisplay';
import { PASSWORD_HINT, validateStrongPassword } from '@/utils/password';

export default function Settings() {
    const router = useRouter();
    const { toggleSidebar, applyUser } = useSidebar();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const applyUserToForm = (user: any) => {
        if (!user) return;
        setUserData(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        setEmail(user.email || '');
        const phone = user.phoneNumber ?? user.phone ?? user.phone_number ?? '';
        setPhoneNumber(phone == null ? '' : String(phone));
    };

    useEffect(() => {
        (async () => {
            // Prefill instantly from cache so existing phone shows while API loads
            try {
                const cached = await AsyncStorage.getItem('user');
                if (cached) applyUserToForm(JSON.parse(cached));
            } catch {
                // ignore
            }
            loadProfile();
        })();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) {
                router.replace('/signin');
                return;
            }
            const response = await authApi.getProfile(token);
            const user = response?.user || response;
            applyUserToForm(user);
            await applyUser(user);
        } catch (error: any) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
            setInitialLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!firstName.trim()) {
            showStatus('info', 'Required', 'First name is required');
            return;
        }
        if (phoneNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.trim())) {
            showStatus('info', 'Invalid phone', 'Use international format, e.g. +250788123456');
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            const liveName = userDisplayName(
                {
                    ...userData,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                },
                { preferNames: true },
            );
            const optimistic = {
                ...userData,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                phoneNumber: phoneNumber.trim(),
                displayName: liveName,
                username: liveName,
            };
            applyUserToForm(optimistic);
            await applyUser(optimistic);

            const result = await authApi.updateProfile(
                {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phoneNumber: phoneNumber.trim(),
                },
                token,
            );
            if (result?.user) {
                const merged = {
                    ...optimistic,
                    ...result.user,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    displayName: liveName,
                    username: liveName,
                };
                applyUserToForm(merged);
                await applyUser(merged);
            }
            showStatus('success', 'Success', 'Profile updated successfully');
        } catch (error: any) {
            showStatus('error', 'Update Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showStatus('info', 'Required', 'Please fill all password fields');
            return;
        }

        if (newPassword !== confirmPassword) {
            showStatus('error', 'Error', 'Passwords do not match');
            return;
        }

        const passwordError = validateStrongPassword(newPassword);
        if (passwordError) {
            showStatus('error', 'Weak password', passwordError || PASSWORD_HINT);
            return;
        }

        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            await authApi.changePassword({ currentPassword, newPassword }, token);
            showStatus('success', 'Success', 'Password changed successfully');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            showStatus('error', 'Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        try {
            if (Platform.OS !== 'web') {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    showStatus(
                        'error',
                        'Permission Denied',
                        'We need photo library access to update your profile image.',
                    );
                    return;
                }
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: Platform.OS !== 'web',
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets?.[0]?.uri) {
                await uploadImage(result.assets[0].uri);
            }
        } catch (error: any) {
            showStatus(
                'error',
                'Picker Failed',
                error?.message || 'Could not open the image picker. Try another browser or device.',
            );
        }
    };

    const uploadImage = async (uri: string) => {
        setUploadingImage(true);
        try {
            const token = await AsyncStorage.getItem('token');
            if (!token) return;

            await authApi.uploadProfileImage(uri, token);
            showStatus('success', 'Success', 'Profile image updated');
            await loadProfile();
        } catch (error: any) {
            showStatus('error', 'Upload Failed', error.message || 'Could not upload image');
        } finally {
            setUploadingImage(false);
        }
    };

    const confirmDeleteImage = () => {
        const runDelete = async () => {
            setUploadingImage(true);
            try {
                const token = await AsyncStorage.getItem('token');
                if (!token) return;
                await authApi.deleteProfileImage(token);
                showStatus('success', 'Success', 'Profile image removed');
                await loadProfile();
            } catch (error: any) {
                showStatus('error', 'Delete Failed', error.message);
            } finally {
                setUploadingImage(false);
            }
        };

        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.confirm('Remove your profile image?')) {
                runDelete();
            }
            return;
        }

        Alert.alert('Delete Image', 'Are you sure you want to remove your profile image?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: runDelete },
        ]);
    };

    const showStatus = (type: 'error' | 'success' | 'info', title: string, message: string) => {
        setStatusModal({ visible: true, type, title, message });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={toggleSidebar}
                    hitSlop={10}
                    accessibilityLabel="Open menu"
                >
                    <Ionicons name="menu" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 24 }} />
            </View>

            {initialLoading && !userData ? (
                <SettingsSkeleton />
            ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.imageSection}>
                    <View style={styles.imageContainer}>
                        {userData?.profileImage ? (
                            <Image source={{ uri: userData.profileImage }} style={styles.profileImage} />
                        ) : (
                            <View style={styles.placeholderImage}>
                                <Ionicons name="person" size={50} color="#9CA3AF" />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editImageIcon}
                            onPress={handlePickImage}
                            disabled={uploadingImage}
                        >
                            {uploadingImage ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="camera" size={20} color="white" />
                            )}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.uploadHint}>
                        {Platform.OS === 'web'
                            ? 'Click the camera icon to upload a photo'
                            : 'Tap the camera icon to upload a photo'}
                    </Text>
                    {userData?.profileImage && (
                        <TouchableOpacity onPress={confirmDeleteImage} disabled={uploadingImage}>
                            <Text style={styles.deleteImageText}>Remove Image</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profile Information</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={email}
                            editable={false}
                            selectTextOnFocus={false}
                            placeholder="Email"
                        />
                        <Text style={styles.helperText}>Email can’t be changed here</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>First name</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="Enter first name"
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Last name <Text style={styles.optional}>(optional)</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Enter last name"
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Phone Number <Text style={styles.optional}>(optional)</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder={phoneNumber ? '' : 'e.g. +250788123456'}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            textContentType="telephoneNumber"
                        />
                        {!!phoneNumber && (
                            <Text style={styles.helperText}>Edit to update, or clear to remove</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleUpdateProfile}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Change Password</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="Enter current password"
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="Enter new password"
                            secureTextEntry
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm new password"
                            secureTextEntry
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.button, styles.passwordButton, loading && styles.buttonDisabled]}
                        onPress={handleChangePassword}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
            )}

            <StatusModal
                visible={statusModal.visible}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFDF4',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0B4D26',
    },
    scrollContent: {
        padding: 20,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    imageContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    placeholderImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editImageIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0B4D26',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    uploadHint: {
        color: '#6B7280',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    deleteImageText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '500',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 5,
        fontWeight: '500',
    },
    optional: {
        color: '#9CA3AF',
        fontWeight: '500',
    },
    helperText: {
        marginTop: 4,
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#111827',
    },
    inputDisabled: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
    button: {
        backgroundColor: '#0B4D26',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    passwordButton: {
        backgroundColor: '#1F2937',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
