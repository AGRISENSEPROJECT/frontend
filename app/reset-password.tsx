import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authApi } from '@/services/api';
import StatusModal from '@/components/ui/StatusModal';
import Animated, { withTiming, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { PASSWORD_HINT, validateStrongPassword } from '@/utils/password';

export default function ResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const inputRefs = useRef<Array<TextInput | null>>([]);
    
    const [statusModal, setStatusModal] = useState({
        visible: false,
        type: 'error' as 'error' | 'success' | 'info',
        title: '',
        message: '',
    });

    useEffect(() => {
        if (params.email) {
            setEmail(params.email as string);
        }
    }, [params.email]);

    const handleOtpChange = (value: string, index: number) => {
        const cleanValue = value.replace(/[^0-9]/g, '');
        
        if (cleanValue.length > 1) {
            const newOtp = [...otp];
            const digits = cleanValue.split('');
            for (let i = 0; i < digits.length && (index + i) < 6; i++) {
                newOtp[index + i] = digits[i];
            }
            setOtp(newOtp);
            const lastIndex = Math.min(index + digits.length - 1, 5);
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        const newOtp = [...otp];
        newOtp[index] = cleanValue;
        setOtp(newOtp);

        if (cleanValue && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResetPassword = async () => {
        const combinedOtp = otp.join('');
        if (combinedOtp.length < 6) {
            showStatus('info', 'Required', 'Please enter the 6-digit code');
            return;
        }
        if (!newPassword || !confirmPassword) {
            showStatus('info', 'Required', 'Please fill in all password fields');
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
            await authApi.resetPassword({
                email,
                otp: combinedOtp,
                newPassword
            });
            setModalVisible(true);
            setTimeout(() => {
                setModalVisible(false);
                router.replace('/signin');
            }, 3000);
        } catch (error: any) {
            showStatus('error', 'Reset Failed', error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const showStatus = (type: 'error' | 'success' | 'info', title: string, message: string) => {
        setStatusModal({ visible: true, type, title, message });
    };

    const SuccessPopup = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
        const progress = useSharedValue(1);
        useEffect(() => {
            if (visible) {
                progress.value = 1;
                progress.value = withTiming(0, { duration: 3000 });
                const timer = setTimeout(onClose, 3000);
                return () => clearTimeout(timer);
            }
        }, [visible]);

        const progressStyle = useAnimatedStyle(() => ({
            width: `${progress.value * 100}%`,
        }));

        if (!visible) return null;

        return (
            <View style={styles.modalOverlay}>
                <View style={styles.successModal}>
                    <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={30} color="white" />
                    </View>
                    <Text style={styles.successTitle}>Password Reset!</Text>
                    <Text style={styles.successText}>Your password has been successfully updated. You can now log in with your new password.</Text>
                    <View style={styles.progressBarContainer}>
                        <Animated.View style={[styles.progressBar, progressStyle]} />
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#0B4D26" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>Enter the 6-digit code sent to {email} and your new password.</Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(el) => (inputRefs.current[index] = el)}
                            style={styles.otpInput}
                            value={digit}
                            onChangeText={(v) => handleOtpChange(v, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <View style={styles.passwordInputContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Enter new password"
                            secureTextEntry={!showPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm New Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        secureTextEntry={!showPassword}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.button, loading && styles.buttonDisabled]} 
                    onPress={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            <SuccessPopup visible={modalVisible} onClose={() => {}} />
            
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
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 20,
    },
    scrollContent: {
        paddingHorizontal: 30,
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0B4D26',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 30,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    otpInput: {
        width: '14%',
        height: 50,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 10,
        fontSize: 16,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingRight: 15,
    },
    passwordInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#0B4D26',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
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
        width: 60, height: 60,
        backgroundColor: '#0B4D26',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    successText: {
        textAlign: 'center',
        color: '#666',
        marginBottom: 25,
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
